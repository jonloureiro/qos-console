import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { json, LinksFunction, LoaderFunction, useLoaderData } from "remix";

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

type Result = [number, number, number]

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
    const items = (results.Items as Item[]) ?? []

    const qos = items.reduce((previousValue, currentValue) => {
      switch (currentValue.qos.S) {
        case "RUIM":
          previousValue[0]++
          return previousValue
        case "REGULAR":
          previousValue[1]++
          return previousValue
        case "EXCELENTE":
          previousValue[2]++
          return previousValue
        default:
          return previousValue
      }
    }, [0, 0, 0])

    return json({
      // items: results.Items ?? [],
      result: qos
    }, 200)
  } catch (err) {
    return json({ error: err }, 500)
  }
}

export default function IndexPage() {
  const { result } = useLoaderData<{
    // items: Item[],
    result: Result
  }>()

  return (
    <>
      <div>QoS Console</div>
      <h2>{result}</h2>
      <div className="h-full">

      </div>
    </>
  );
}
