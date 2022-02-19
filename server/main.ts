import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import * as Eta from 'eta'
import { resolve } from 'path'
import cookie from 'cookie'

Eta.configure({
  views: resolve('views')
})

const main = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.path === '/login' && event.httpMethod === 'GET') {
    // TODO: checar se tem token válida
    return {
      statusCode: 200,
      body: await Eta.renderFile('login.eta', {}) as string,
    }
  }

  if (event.path === '/login' && event.httpMethod === 'POST') {
    // TODO: checar se tem token válida
    if (!event.body) throw {
      statusCode: 400,
      errorMessage: 'Tente novamente'
    }

    const [namestring, passwordstring] = decodeURIComponent(event.body).split('&')
    const [, name] = namestring.split('=')
    const [, password] = passwordstring.split('=')

    console.log(name, password);
    if (name === 't@t' && password === 't') return {
      statusCode: 200,
      headers: {
        'Set-Cookie': cookie.serialize('__session', 'user', {
          secure: process.env.NODE_ENV !== 'development',
          httpOnly: true,
          maxAge: 3600,
        }),
      },
      body: await Eta.renderFile('redirect.eta', { redirect: '/' }) as string,
    }


    return {
      statusCode: 200,
      body: await Eta.renderFile('login.eta', {}) as string,
    }
  }

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

  if (event.path !== '/' && event.httpMethod === 'GET') throw {
    statusCode: 404,
    errorMessage: 'Página não encontrada'
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)) throw {
    statusCode: 501,
    errorMessage: 'Método não implementado'
  }

  if (event.headers.cookie) {
    //TODO: checar se o cookie é válido
    return {
      statusCode: 200,
      body: await Eta.renderFile('home.eta', { message: 'Hello World' }) as string,
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