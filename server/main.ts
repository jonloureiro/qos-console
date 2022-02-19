import { Handler } from "@netlify/functions";
import * as Eta from "eta"
import { resolve } from "path";

const handler: Handler = async (event, context) => {
  Eta.configure({
    views: resolve('views')
  })
  return {
    statusCode: 200,
    body: await Eta.renderFile('../views/home.eta', { message: 'Hello World' }) as string,
  };
};

export { handler };