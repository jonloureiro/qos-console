import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import * as Eta from 'eta'
import { resolve } from 'path'
import cookie from 'cookie'

Eta.configure({
  views: resolve('views')
})

const main = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.path === '/logout' && event.httpMethod === 'POST') return {
    statusCode: 200,
    headers: {
      'Set-Cookie': cookie.serialize('__session', '', {
        secure: process.env.NODE_ENV !== 'development',
        httpOnly: true,
        maxAge: 0,
      }),
    },
    body: await Eta.renderFile('external.eta', { message: 'Logout com sucesso' }) as string,
  }

  if (event.path === '/login' && event.httpMethod === 'GET') {
    console.log(event.headers.authorization);

    if (event.headers.authorization) {
      const [user, password] = Buffer.from(event.headers.authorization.split(' ')[1], 'base64').toString().split(':');
      console.log(user, password);

      if (user && password) {
        //TODO: verificar
        return {
          statusCode: 200,
          headers: {
            'Set-Cookie': cookie.serialize('__session', 'code', {
              secure: process.env.NODE_ENV !== 'development',
              httpOnly: true,
              maxAge: 3600,
            }),
          },
          body: await Eta.renderFile('redirect.eta', { redirect: `http://${event.headers.host}/` }) as string,
        }
      } else if (user === 'login') return {
        statusCode: 401,
        headers: {
          'WWW-Authenticate': 'Basic'
        },
        body: await Eta.renderFile('external.eta', { message: 'Não autorizado' }) as string,
      }
    }
    return {
      statusCode: 302,
      headers: {
        'Location': `http://login:login@${event.headers.host}/login`
      }
    }
  }

  if (event.path !== '/' && event.httpMethod === 'GET') return {
    statusCode: 404,
    body: await Eta.renderFile('external.eta', { message: 'Página não encontrada' }) as string,
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)) return {
    statusCode: 501,
    body: await Eta.renderFile('external.eta', { message: 'Método não implementado' }) as string,
  }

  if (event.headers.cookie) {
    return {
      statusCode: 200,
      body: await Eta.renderFile('home.eta', { message: 'Hello World' }) as string,
    }
  }

  return {
    statusCode: 302,
    headers: {
      'Location': `http://login@${event.headers.host}/login`
    }
  }
}

const handler: Handler = async (event, context) => {
  try {
    return main(event, context)
  } catch (error) {
    // console.error(error)
    return {
      statusCode: 500,
      body: await Eta.renderFile('external.eta', { message: 'Erro desconhecido' }) as string,
    }
  }
}

export { handler }