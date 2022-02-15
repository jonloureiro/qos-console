import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { json, LoaderFunction, useLoaderData } from "remix";

type Item = {
  hora: {
    S: string
  },
  device_id: {
    S: string
  },
  registry: {
    N: string
  },
  qos: {
    S: string
  },
  data: {
    S: string
  }
}

export const loader: LoaderFunction = async () => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  })
  // const command = new ListTablesCommand({})
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
    return json({ items: results.Items ?? [] }, 200)
  } catch (err) {
    return json({ error: err }, 500)
  }
}

export default function IndexPage() {
  const { items } = useLoaderData<{ items: Item[] }>()

  return (
    <>
      <div>QoS Console</div>
      <ul>
        {
          items.map((item, index) => (
            <li key={index + ''}>{item.qos.S}</li>
          ))
        }
      </ul>
    </>
  );
}
