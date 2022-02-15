import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { json, LoaderFunction } from "remix";

export const loader: LoaderFunction = async () => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  })
  // const command = new QueryCommand({
  //   TableName: "totem_qos_table",
  //   KeyConditionExpression
  // })
  const command = new ScanCommand({
    TableName: "totem_qos_table",
    // Limit: 50,
  })
  try {
    const results = await client.send(command);
    return json({ items: results.Items }, 200)
  } catch (err) {
    return json({ error: err }, 500)
  }
}