# AWS Serverless CRUD API

A fully serverless REST API built on AWS that performs **Create, Read, Update, and Delete (CRUD)** operations on a DynamoDB database. The project uses a Coffee Shop Menu as the data model — each item in the database represents a coffee product with an ID, name, price, and availability status.

---

## Architecture Overview

```
Client / Browser
      │
      ▼
 API Gateway          ← Receives HTTP requests, routes them to the right Lambda
      │
      ▼
Lambda Functions      ← Runs your business logic (Node.js / ES Modules)
      │
      ▼
   DynamoDB           ← NoSQL database that stores the coffee items
```

All infrastructure is **serverless** — there are no servers to manage. AWS spins up the Lambda functions on demand and shuts them down when done. You only pay for what you use.

---

## Tech Stack

| Service | Purpose |
|---|---|
| **AWS Lambda** | Runs the backend code |
| **AWS API Gateway** | Exposes HTTP endpoints (GET, POST, PUT, DELETE) |
| **AWS DynamoDB** | NoSQL database to store data |
| **AWS Lambda Layers** | Shared code/dependencies across all Lambda functions |
| **AWS CloudFront + S3** | Hosts and serves the frontend (optional) |
| **AWS IAM** | Controls permissions — what Lambda is allowed to access |
| **Node.js (ESM)** | Runtime language for Lambda functions |
| **@aws-sdk/lib-dynamodb** | AWS SDK — high-level DynamoDB Document Client |

---

## Project Structure

```
AWS-CRUD-Serverless/
│
├── Lambda Functions/          # Core backend — 4 Lambda functions
│   ├── post/
│   │   └── index.mjs          # CREATE a coffee item
│   ├── get/
│   │   └── index.mjs          # READ one or all coffee items
│   ├── update/
│   │   └── index.mjs          # UPDATE an existing coffee item
│   └── delete/
│       └── index.mjs          # DELETE a coffee item
│
├── Layers/                    # Shared Lambda Layer
│   ├── nodejs/
│   │   ├── utils.mjs          # Shared DynamoDB client + helper functions
│   │   └── package.json       # Layer dependencies (@aws-sdk)
│   ├── LambdaFunctionsWithLayer/   # Lambda versions that use the Layer
│   │   ├── post/index.mjs
│   │   ├── get/index.mjs
│   │   ├── update/index.mjs
│   │   └── delete/index.mjs
│   └── create_zip.sh          # Script to zip functions for AWS upload
│
├── policy/
│   ├── Lambda IAM Role Policy.txt   # Permissions for Lambda to access DynamoDB
│   └── S3 Bucket Policy.txt         # Permissions for CloudFront to serve frontend
│
├── CommonJS-LambdaCode/       # Alternate CommonJS version (require/module.exports)
│                              # Functionally identical — older Node.js syntax
│
└── README.md
```

---

## Data Model

Each item stored in DynamoDB has the following structure:

```json
{
  "coffeeId": "coff001",
  "name": "Cappuccino",
  "price": 4.5,
  "available": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `coffeeId` | String | ✅ | Primary key — must be unique |
| `name` | String | ✅ | Name of the coffee |
| `price` | Number | ✅ | Price of the coffee |
| `available` | Boolean | ✅ | Whether it's currently available |

---

## API Endpoints

### POST — Create a Coffee Item
```
POST /coffee
```
**Request Body:**
```json
{
  "coffeeId": "coff001",
  "name": "Cappuccino",
  "price": 4.5,
  "available": true
}
```
**Responses:**
- `201` — Item created successfully
- `409` — Item already exists (duplicate `coffeeId`)
- `409` — Missing required fields
- `500` — Internal server error

---

### GET — Read Coffee Items
```
GET /coffee          → Returns ALL items
GET /coffee/{id}     → Returns ONE item by coffeeId
```
**Responses:**
- `200` — Success with item(s)
- `500` — Internal server error

---

### PUT — Update a Coffee Item
```
PUT /coffee/{id}
```
**Request Body** (send only the fields you want to update):
```json
{
  "price": 5.0,
  "available": false
}
```
**Responses:**
- `200` — Updated successfully, returns new values
- `400` — Missing `coffeeId` or nothing to update
- `404` — Item does not exist
- `500` — Internal server error

---

### DELETE — Delete a Coffee Item
```
DELETE /coffee/{id}
```
**Responses:**
- `200` — Deleted successfully, returns deleted item data
- `400` — Missing `coffeeId`
- `404` — Item does not exist
- `500` — Internal server error

---

## Lambda Functions — Code Explained

### Shared Pattern
Every Lambda function follows the same pattern:

```js
export const handler = async (event) => {
    // 1. Extract data from the incoming request (event)
    // 2. Validate the input
    // 3. Build a DynamoDB command
    // 4. Execute the command
    // 5. Return an HTTP response
}
```

### POST — `Lambda Functions/post/index.mjs`

```js
const command = new PutCommand({
    TableName: tableName,
    Item: { coffeeId, name, price, available },
    ConditionExpression: "attribute_not_exists(coffeeId)",  // Prevents duplicates
});
```

- Uses `PutCommand` to insert a new item
- `ConditionExpression: "attribute_not_exists(coffeeId)"` — DynamoDB will reject the write if an item with that `coffeeId` already exists. This prevents accidental overwrites.

---

### GET — `Lambda Functions/get/index.mjs`

```js
if (id) {
    command = new GetCommand({ Key: { coffeeId: id } });  // Fetch one
} else {
    command = new ScanCommand({ TableName: tableName });   // Fetch all
}
```

- Smart routing in a single function — checks if an `id` was passed in the URL path
- `GetCommand` → fetches a specific item by primary key (fast, efficient)
- `ScanCommand` → reads the entire table (fine for small datasets)

---

### UPDATE — `Lambda Functions/update/index.mjs`

```js
const command = new UpdateCommand({
    UpdateExpression: "SET #name = :name, price = :price",
    ConditionExpression: "attribute_exists(coffeeId)",  // Item must exist
    ReturnValues: "ALL_NEW",  // Returns the updated item in the response
});
```

- Only updates the fields you send — partial updates are supported
- `name` is a **reserved keyword** in DynamoDB, so it uses `ExpressionAttributeNames` to alias it as `#name`
- `ReturnValues: "ALL_NEW"` returns the full updated item so the client sees the latest state

---

### DELETE — `Lambda Functions/delete/index.mjs`

```js
const command = new DeleteCommand({
    Key: { coffeeId },
    ConditionExpression: "attribute_exists(coffeeId)",  // Item must exist
    ReturnValues: "ALL_OLD",  // Returns the deleted item in the response
});
```

- `ConditionExpression` ensures you get a `404` if item doesn't exist, rather than a silent success
- `ReturnValues: "ALL_OLD"` returns the data of the item that was just deleted

---

## Lambda Layers — Why They Exist

Without Layers, every Lambda function had to repeat this setup code:

```js
// Repeated in ALL 4 functions — bad practice
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const createResponse = (statusCode, body) => { ... };
```

With Layers, this shared code lives in one place — `Layers/nodejs/utils.mjs` — and each function simply imports it:

```js
import { docClient, createResponse, PutCommand } from '/opt/nodejs/utils';
```

AWS automatically mounts the Layer at `/opt/nodejs/` inside the Lambda runtime. Benefits:
- No code duplication
- Update shared logic in one place
- Smaller individual Lambda package sizes

---

## IAM Policy — Permissions

Lambda functions need explicit permission to interact with AWS services. Without this policy, every DynamoDB call would be denied.

**`policy/Lambda IAM Role Policy.txt`** grants Lambda permission to:

| Permission | Used By |
|---|---|
| `dynamodb:PutItem` | POST function |
| `dynamodb:GetItem` | GET function (single item) |
| `dynamodb:Scan` | GET function (all items) |
| `dynamodb:UpdateItem` | UPDATE function |
| `dynamodb:DeleteItem` | DELETE function |
| `logs:CreateLogGroup/Stream/PutLogEvents` | All functions (CloudWatch logging) |

**`policy/S3 Bucket Policy.txt`** grants CloudFront permission to serve files from the S3 bucket that hosts the frontend. Direct public access to S3 is blocked — only CloudFront can read it, improving security.

---

## DynamoDB — Why Not SQL?

This project uses DynamoDB (NoSQL) instead of a traditional SQL database (like MySQL) for these reasons:

- **Serverless-native** — DynamoDB scales automatically with no configuration
- **No connection pooling issues** — Lambda functions are stateless and short-lived; SQL databases struggle with hundreds of short-lived connections
- **Pay per request** — no idle database cost
- **Single-digit millisecond latency** — extremely fast for key-based lookups

---

## CommonJS vs ESM — What's the Difference?

The repo contains two versions of the same code:

| | ESM (Modern) | CommonJS (Older) |
|---|---|---|
| **Syntax** | `import { x } from 'y'` | `const { x } = require('y')` |
| **Export** | `export const fn = ...` | `module.exports = { fn }` |
| **File extension** | `.mjs` | `.js` |
| **Use this?** | ✅ Yes — this is the main version | ❌ Reference only |

The `CommonJS-LambdaCode/` folder exists only as an alternative for older Node.js setups. The root `Lambda Functions/` folder (ESM) is the primary version.

---

## How to Deploy on AWS

### Prerequisites
- AWS account
- AWS CLI installed and configured
- Node.js installed

### Step 1 — Create DynamoDB Table
1. Go to AWS Console → DynamoDB → Create Table
2. Table name: `mytestCoffeeTable`
3. Partition key: `coffeeId` (String)

### Step 2 — Create IAM Role for Lambda
1. Go to IAM → Roles → Create Role
2. Select: AWS Service → Lambda
3. Attach the policy from `policy/Lambda IAM Role Policy.txt`

### Step 3 — Create Lambda Layer
```bash
cd Layers
bash create_zip.sh
```
1. Go to AWS Console → Lambda → Layers → Create Layer
2. Upload `layer.zip`
3. Runtime: Node.js 18.x or above

### Step 4 — Deploy Lambda Functions
For each function (post, get, update, delete):
1. Go to Lambda → Create Function
2. Runtime: Node.js 18.x
3. Upload the respective `.zip` file
4. Attach the IAM role created in Step 2
5. Attach the Layer created in Step 3
6. Add environment variable: `tableName = mytestCoffeeTable`

### Step 5 — Set Up API Gateway
1. Go to API Gateway → Create API → REST API
2. Create resource `/coffee` with methods: GET, POST
3. Create resource `/coffee/{id}` with methods: GET, PUT, DELETE
4. Link each method to its corresponding Lambda function
5. Deploy the API to a stage (e.g., `prod`)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `tableName` | `mytestCoffeeTable` | DynamoDB table name |

Set this in each Lambda function's configuration on AWS.

---

## Dependencies

```json
{
  "@aws-sdk/client-dynamodb": "^3.777.0",
  "@aws-sdk/lib-dynamodb": "^3.778.0"
}
```

- `@aws-sdk/client-dynamodb` — Low-level DynamoDB client (used to initialize the connection)
- `@aws-sdk/lib-dynamodb` — High-level Document Client (handles data type conversion automatically)