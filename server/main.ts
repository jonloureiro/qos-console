import { Handler } from "@netlify/functions";
import * as Eta from "eta"
import path from "path";

const handler: Handler = async (event, context) => {
  Eta.configure({
    views: path.join(__dirname, '..', '..', '..', '..', '..', 'views')
  })
  return {
    statusCode: 200,
    body: await Eta.renderFile('home', { message: 'Hello World' }) as string,
  };
};

export { handler };