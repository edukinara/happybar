import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@happy-bar/database'
import jwt from 'jsonwebtoken'

interface AdminTokenPayload {
  adminUserId: string
  role: string
}

declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: {
      id: string
      email: string
      name: string | null
      role: string
    }
  }

  interface FastifyInstance {
    authenticateAdmin: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
    requireSuperAdmin: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}

export async function registerAdminAuth(fastify: any) {
  // Admin authentication decorator
  fastify.decorate('authenticateAdmin', async function(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' })
      }

      // Verify JWT token
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AdminTokenPayload
      
      // Check if session exists and is valid
      const session = await prisma.adminSession.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
        },
      })

      if (!session || !session.adminUser.isActive) {
        return reply.code(401).send({ error: 'Invalid or expired token' })
      }

      // Add admin user to request
      request.adminUser = session.adminUser
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid token' })
    }
  })

  // Super admin authorization decorator
  fastify.decorate('requireSuperAdmin', async function(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    if (!request.adminUser) {
      return reply.code(401).send({ error: 'Authentication required' })
    }

    if (request.adminUser.role !== 'SUPER_ADMIN') {
      return reply.code(403).send({ error: 'Super admin access required' })
    }
  })
}