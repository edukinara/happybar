import { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../auth'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Debug logging - show what headers we're receiving
    console.log('🔍 API Server - Incoming request:', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      authorization: request.headers.authorization ? `${request.headers.authorization.substring(0, 20)}...` : 'NONE',
      contentType: request.headers['content-type'],
      headers: {
        ...request.headers,
        authorization: request.headers.authorization ? `${request.headers.authorization.substring(0, 20)}...` : 'NONE'
      }
    })

    // Get session from Better Auth
    const sessionData = await auth.api.getSession({
      headers: request.headers as any,
    })

    console.log('🔍 API Server - Better Auth result:', {
      hasSession: !!sessionData?.session,
      hasUser: !!sessionData?.user,
      userAgent: request.headers['user-agent'],
    })

    if (!sessionData?.user) {
      console.log('❌ API Server - Authentication failed:', {
        url: request.url,
        userAgent: request.headers['user-agent'],
        hasAuthHeader: !!request.headers.authorization,
      })
      reply.code(401).send({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      })
      return
    }

    // Add user to request
    request.user = {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.name,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    reply.code(500).send({
      error: 'Authentication error',
      code: 'AUTHENTICATION_ERROR',
    })
  }
}