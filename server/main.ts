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

const loginDurationInSeconds = Number(process.env.LOGIN_DURATION) || 60 * 60

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

      const [cookieContentInHex, signature] = cookieValue.split('.')

      if (!cookieContentInHex || !signature) {
        throw {
          statusCode: 400,
          errorMessage: 'Cookie inválido',
          message: `cookie content ${cookieContentInHex}; signature ${signature}`
        }
      }

      const cookieContent = Buffer.from(cookieContentInHex, 'hex').toString()

      const verifier = createVerify('rsa-sha256')
      verifier.update(cookieContent)
      const hasUser = verifier.verify(publicKey, signature, 'hex')
      if (hasUser) {
        const [cookieDuration, ...email] = cookieContent.split(':')
        if (+cookieDuration > Date.now()) {
          userEmail = email.join(':')
        }
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
      const cookieDuration = Date.now() + (loginDurationInSeconds * 1000)
      const cookieContent = `${cookieDuration}:${user.email}`
      const signer = createSign('rsa-sha256')
      signer.update(cookieContent)
      const signature = signer.sign(privateKey, 'hex')
      const cookieContentInHex = Buffer.from(cookieContent).toString('hex')

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Set-Cookie': `__session=${cookieContentInHex + '.' + signature}; Max-Age=${loginDurationInSeconds}; ${process.env.NODE_ENV !== 'development' ? 'Secure; ' : ''}HttpOnly; SameSite=Lax;`
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

    const orderedItems = items.sort((a, b) => {
      const dataA = +a.data.S.split("-")[0];
      const dataB = +b.data.S.split("-")[0];
      if (dataA === dataB) {
        const hourA = +a.hora.S
          .split(":")
          .map(el => el.padStart(2, "0"))
          .join('');
        const hourB = +b.hora.S
          .split(":")
          .map(el => el.padStart(2, "0"))
          .join('');
        return hourA - hourB;
      }
      return dataA - dataB;
    });

    const sheet = orderedItems.reduce(
      (previousValue, currentValue) => {
        const index = previousValue.findIndex(
          (row) => row[0] === currentValue.data.S
        );
        if (index === -1) {
          switch (currentValue.qos.S) {
            case "RUIM":
              previousValue.push([currentValue.data.S, 1, 0, 0]);
              return previousValue;
            case "REGULAR":
              previousValue.push([currentValue.data.S, 0, 1, 0]);
              return previousValue;
            case "EXCELENTE":
              previousValue.push([currentValue.data.S, 0, 0, 1]);
              return previousValue;
            default:
              return previousValue;
          }
        } else {
          switch (currentValue.qos.S) {
            case "RUIM":
              previousValue[index][1]++;
              return previousValue;
            case "REGULAR":
              previousValue[index][2]++;
              return previousValue;
            case "EXCELENTE":
              previousValue[index][3]++;
              return previousValue;
            default:
              return previousValue;
          }
        }
      },
      [["DATA", "REGULAR", "BOM", "ÓTIMO"]]
    );

    const sheet2 = orderedItems.reduce(
      (previousValue, currentValue) => {
        let voto: string;

        switch (currentValue.qos.S) {
          case "RUIM":
            voto = "REGULAR"
            break
          case "REGULAR":
            voto = "BOM"
            break
          case "EXCELENTE":
            voto = "ÓTIMO"
            break
          default:
            voto = ""
            break
        }

        previousValue.push([
          currentValue.data.S,
          currentValue.hora.S,
          voto,
          currentValue.device_id.S,
          currentValue.registry.N
        ])
        return previousValue
      },
      [["DATA", "HORA", "VOTO", "DISPOSITIVO", "REGISTRO"]]
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: await Eta.renderFile('home.eta', {
        email: userEmail,
        values: qos,
        sheet,
        sheet2,
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
