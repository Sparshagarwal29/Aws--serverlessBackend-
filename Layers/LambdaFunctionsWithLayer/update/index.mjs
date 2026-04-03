import { docClient, UpdateCommand, createResponse } from '/opt/nodejs/utils.mjs'; // Import from Layer

const tableName = process.env.tableName || "mytestCoffeeTable";

export const updateCoffee = async (event) => {
    const { pathParameters, body } = event;

    const coffeeId = pathParameters?.id;
    if (!coffeeId)
        return createResponse(400, { error: "Missing coffeeId" });

    const { name, price, available } = JSON.parse(body || "{}");
    if (!name && !price && available === undefined)
        return createResponse(400, { error: "Nothing to update!" })

    let updateExpression = `SET  ${name ? "#name = :name, " : ""}${price ? "price = :price, " : ""}${available ? "available = :available, " : ""}`.slice(0, -2);

    try {

        const command = new UpdateCommand({
            TableName: tableName,
            Key: {
                coffeeId,
            },
            UpdateExpression: updateExpression,
            ...(name && {
                ExpressionAttributeNames: {
                    "#name": "name", // name is a reserved keyword in DynamoDB
                },
            }),
            ExpressionAttributeValues: {
                ...(name && { ":name": name }),
                ...(price && { ":price": price }),
                ...(available && { ":available": available }),
            },
            ReturnValues: "ALL_NEW", // returns updated value as response
            ConditionExpression: "attribute_exists(coffeeId)", // ensures the item exists before updating
        });

        const response = await docClient.send(command);
        console.log(response);
        return response;

    }
    catch (err) {
        if (err.message === "The conditional request failed")
            return createResponse(404, { error: "Item does not exists!" });
        return createResponse(500, {
            error: "Internal Server Error!",
            message: err.message,
        });
    }
}