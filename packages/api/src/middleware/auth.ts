import { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../auth'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Get session from Better Auth
    const sessionData = await auth.api.getSession({
      headers: request.headers as any,
    })

    if (!sessionData?.user) {
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