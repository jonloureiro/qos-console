import { resolve } from 'path'
import { createSign, createVerify } from 'crypto'

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import * as Eta from 'eta'

import users from '../data/users'


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


Eta.configure({
  views: resolve('views')
})


const client = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY!
  }
})


const privateKey = Buffer.from(process.env.PRIVATE_KEY, 'base64').toString()
const publicKey = Buffer.from(process.env.PUBLIC_KEY, 'base64').toString()


const main = async (event: HandlerEvent, context: HandlerContext) => {
  let userEmail: string | undefined = undefined
  if (event.headers.cookie) {
    const [, cookieValue] = event.headers.cookie.split('=')

    if (!cookieValue) throw {
      statusCode: 400,
      errorMessage: 'Cookie inválido'
    }

    const [emailHex, token] = cookieValue.split('&')

    if (!emailHex || !token) throw {
      statusCode: 400,
      errorMessage: 'Cookie inválido'
    }

    const email = Buffer.from(emailHex, 'hex').toString()

    const verifier = createVerify('rsa-sha256');
    verifier.update(email);
    const hasUser = verifier.verify(publicKey, token, 'hex')
    if (hasUser) {
      userEmail = email
    }
  }

  if (event.path === '/login' && event.httpMethod === 'GET') {
    if (userEmail) return {
      statusCode: 302,
      headers: {
        'Location': '/'
      }
    }
    return {
      statusCode: 200,
      body: await Eta.renderFile('login.eta', {}) as string,
    }
  }

  if (event.path === '/login' && event.httpMethod === 'POST') {
    if (!event.body) throw {
      statusCode: 400,
      errorMessage: 'Tente novamente'
    }

    const [emailstring, passwordstring] = decodeURIComponent(event.body).split('&')
    const [, email] = emailstring.split('=')
    const [, password] = passwordstring.split('=')

    const user = users.find(user => (user && user.email && user.email === email))

    if (user && user.password === password) {
      const signer = createSign('rsa-sha256')
      signer.update(user.email)
      const token = signer.sign(privateKey, 'hex')
      const email = Buffer.from(user.email).toString('hex')

      return {
        statusCode: 200,
        headers: {
          'Set-Cookie': `__session=${email + '&' + token}; Max-Age=3600; ${process.env.NODE_ENV !== 'development' ? 'Secure;' : ''} HttpOnly; SameSite=Lax;`
        },
        body: await Eta.renderFile('_redirect.eta', { redirect: '/', message: 'Login com sucesso' }) as string,
      }
    }

    return {
      statusCode: 401,
      body: await Eta.renderFile('login.eta', { errorMessage: 'Email ou senha incorretos' }) as string,
    }
  }

  if (event.path === '/logout' && event.httpMethod === 'POST') return {
    statusCode: 200,
    headers: {
      'Set-Cookie': `__session=; Max-Age=0; ${process.env.NODE_ENV !== 'development' ? 'Secure;' : ''} HttpOnly; SameSite=Lax;`
    },
    body: await Eta.renderFile('_redirect.eta', { redirect: '/login', message: 'Logout com sucesso' }) as string,
  }

  if (event.path !== '/' && event.httpMethod === 'GET') throw {
    statusCode: 404,
    errorMessage: 'Página não encontrada'
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)) throw {
    statusCode: 501,
    errorMessage: 'Método não implementado'
  }

  if (userEmail) {
    const command = new QueryCommand({
      TableName: "totem_qos_table",
      IndexName: "mes_ano-index",
      KeyConditionExpression: "mes_ano = :month_year",
      ExpressionAttributeValues: {
        ":month_year": { S: "01-2022" } //TODO: existe itens com 02-2022 e 2-2022
      },
    })

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

    //TODO: Buscar os dados
    return {
      statusCode: 200,
      body: await Eta.renderFile('home.eta', { email: userEmail, message: qos }) as string,
    }
  }

  return {
    statusCode: 302,
    headers: {
      'Location': '/login'
    }
  }
}


const handler: Handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false

  try {
    return await main(event, context)
  } catch (error) {
    console.error(error)
    return {
      statusCode: error.statusCode || 500,
      body: await Eta.renderFile('external.eta', { message: error.errorMessage || 'Erro interno do servidor' }) as string,
    }
  }
}


export { handler }