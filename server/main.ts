import { resolve } from 'path'
import { createSign, createVerify } from 'crypto'

import { HandlerEvent, HandlerContext } from '@netlify/functions'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import * as Eta from 'eta'

import users from '../data/users'

interface Item {
  hora: {
    S: string
  }
  device_id: {
    S: string
  }
  registry: {
    N: string
  }
  qos: {
    S: string
  }
  data: {
    S: string
  }
}

Eta.configure({ views: resolve('views') })

const client = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY!
  }
})

const privateKey = Buffer.from(process.env.PRIVATE_KEY!, 'base64').toString()
const publicKey = Buffer.from(process.env.PUBLIC_KEY!, 'base64').toString()

const main = async (event: HandlerEvent, context: HandlerContext) => {
  let userEmail: string | undefined
  if (event.headers.cookie) {
    const cookies = event.headers.cookie.split(';')

    const sessionKeyValue = cookies.find(value => {
      const [cookieKey] = value.trim().split('=')
      return cookieKey === '__session'
    })

    if (sessionKeyValue) {
      const [, cookieValue] = sessionKeyValue.split('=')

      if (!cookieValue) {
        throw {
          statusCode: 400,
          errorMessage: 'Cookie inválido',
          message: `cookieValue ${cookieValue}`
        }
      }

      const [emailHex, signature] = cookieValue.split('.')

      if (!emailHex || !signature) {
        throw {
          statusCode: 400,
          errorMessage: 'Cookie inválido',
          message: `emailBase64 ${emailHex}; signature ${signature}`
        }
      }

      const email = Buffer.from(emailHex, 'hex').toString()

      const verifier = createVerify('rsa-sha256')
      verifier.update(email)
      const hasUser = verifier.verify(publicKey, signature, 'hex')
      if (hasUser) {
        userEmail = email
      }
    }
  }

  if (event.path === '/login' && event.httpMethod === 'GET') {
    if (userEmail) {
      return {
        statusCode: 302,
        headers: {
          Location: '/'
        }
      }
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('login.eta', {}) as string
    }
  }

  if (event.path === '/login' && event.httpMethod === 'POST') {
    if (!event.body) throw {
      statusCode: 400,
      errorMessage: 'Tente novamente'
    }


    const [emailKeyValue, passwordKeyValue] = decodeURIComponent(event.body).split('&')
    const [, emailValue] = emailKeyValue.split('=')
    const [, passwordValue] = passwordKeyValue.split('=')

    const user = users.find(user => (user && user.email === emailValue))

    if (user && user.password === passwordValue) {
      const signer = createSign('rsa-sha256')
      signer.update(user.email)
      const signature = signer.sign(privateKey, 'hex')
      const emailHex = Buffer.from(user.email).toString('hex')

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Set-Cookie': `__session=${emailHex + '.' + signature}; Max-Age=3600; ${process.env.NODE_ENV !== 'development' ? 'Secure; ' : ''}HttpOnly; SameSite=Lax;`
        },
        body: await Eta.renderFile('_redirect.eta', { redirect: '/', message: 'Login com sucesso' }) as string
      }
    }

    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('login.eta', { errorMessage: 'Email ou senha incorretos' }) as string
    }
  }

  if (event.path === '/logout' && event.httpMethod === 'POST') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Set-Cookie': `__session=; Max-Age=0; ${process.env.NODE_ENV !== 'development' ? 'Secure; ' : ''}HttpOnly; SameSite=Lax;`
      },
      body: await Eta.renderFile('_redirect.eta', { redirect: '/login', message: 'Logout com sucesso' }) as string
    }
  }

  if (event.path !== '/' && event.httpMethod === 'GET') {
    throw {
      statusCode: 404,
      errorMessage: 'Página não encontrada'
    }
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)) {
    throw {
      statusCode: 501,
      errorMessage: 'Método não implementado'
    }
  }

  if (userEmail) {

    if (!event.queryStringParameters) throw Error('queryStringParameters === null')

    const { month, year } = event.queryStringParameters

    if (!month && !year) return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('home.eta', { email: userEmail }) as string
    }

    if (!month && year) return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('home.eta', { email: userEmail, errorMessage: 'Selecione o mês', year }) as string
    }

    if (month && !year) return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('home.eta', { email: userEmail, errorMessage: 'Selecione o ano', month }) as string
    }

    if (
      !['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].includes(month!)
      ||
      !['2021', '2022'].includes(year!)
    ) throw {
      statusCode: 400,
      errorMessage: 'Tente novamente'
    }

    const command = new QueryCommand({
      TableName: 'totem_qos_table',
      IndexName: 'mes_ano-index',
      KeyConditionExpression: 'mes_ano = :month_year',
      ExpressionAttributeValues: {
        ':month_year': { S: `${month}-${year}` }
      }
    })

    const results = await client.send(command)
    const items = (results.Items as unknown as Item[]) ?? []

    const qos = items.reduce((previousValue, currentValue) => {
      switch (currentValue.qos.S) {
        case 'RUIM':
          previousValue[0]++
          return previousValue
        case 'REGULAR':
          previousValue[1]++
          return previousValue
        case 'EXCELENTE':
          previousValue[2]++
          return previousValue
        default:
          return previousValue
      }
    }, [0, 0, 0])

    const sheet = [
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["A3", "B3", "C3"]
    ]

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('home.eta', {
        email: userEmail,
        values: qos,
        sheet,
        year,
        month
      }) as string
    }
  }

  return {
    statusCode: 302,
    headers: {
      Location: '/login'
    }
  }
}

const handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false

  try {
    return await main(event, context)
  } catch (error: any) {
    console.error(error)
    return {
      statusCode: error.statusCode || 500,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('external.eta', { message: error.errorMessage || 'Erro interno do servidor' }) as string
    }
  }
}

export { handler }
