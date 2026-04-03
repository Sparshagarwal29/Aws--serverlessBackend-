import { docClient, DeleteCommand, createResponse } from '/opt/nodejs/utils.mjs'; // Import from Layer

const tableName = process.env.tableName || "mytestCoffeeTable";

export const deleteCoffee = async (event) => {
    const { pathParameters } = event;
    const coffeeId = pathParameters?.id;
    if (!coffeeId)
        return createResponse(400, { error: "Missing coffeeId" });

    try {
        const command = new DeleteCommand({
            TableName: tableName,
            Key: {
                coffeeId,
            },
            ReturnValues: "ALL_OLD", // returns deleted value as response
            ConditionExpression: "attribute_exists(coffeeId)", // ensures the item exists before deleting
        });

        const response = await docClient.send(command);
        return createResponse(200, { message: "Item Deleted Successfully!", response });
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