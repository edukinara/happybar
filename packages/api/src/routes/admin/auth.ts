import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@happy-bar/database'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']).default('SUPPORT'),
})

export default async function adminAuthRoutes(fastify: FastifyInstance) {
  // Admin login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      // Find admin user
      const adminUser = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          adminAccounts: {
            where: { providerId: 'credential' },
          },
        },
      })

      if (!adminUser || !adminUser.isActive) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Check password
      const adminAccount = adminUser.adminAccounts.find(acc => acc.providerId === 'credential')
      if (!adminAccount?.password) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const isValid = await bcrypt.compare(password, adminAccount.password)
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Create session
      const token = jwt.sign(
        { adminUserId: adminUser.id, role: adminUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      )

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await prisma.adminSession.create({
        data: {
          adminUserId: adminUser.id,
          token,
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })

      // Update last login
      await prisma.adminUser.update({
        where: { id: adminUser.id },
        data: { lastLoginAt: new Date() },
      })

      return reply.send({
        token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        },
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Admin logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      if (token) {
        await prisma.adminSession.deleteMany({
          where: { token },
        })
      }
      return reply.send({ message: 'Logged out successfully' })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get current admin user
  fastify.get('/me', {
    preHandler: [fastify.authenticateAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const adminUser = await prisma.adminUser.findUnique({
        where: { id: (request as any).adminUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })

      if (!adminUser) {
        return reply.code(404).send({ error: 'Admin user not found' })
      }

      return reply.send(adminUser)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Create admin user (only for SUPER_ADMIN)
  fastify.post('/create-admin', {
    preHandler: [fastify.authenticateAdmin, fastify.requireSuperAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, name, role } = createAdminSchema.parse(request.body)

      // Check if admin user already exists
      const existingAdmin = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (existingAdmin) {
        return reply.code(409).send({ error: 'Admin user already exists' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create admin user
      const adminUser = await prisma.adminUser.create({
        data: {
          email: email.toLowerCase(),
          name,
          role,
          adminAccounts: {
            create: {
              providerId: 'credential',
              accountId: email.toLowerCase(),
              password: hashedPassword,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })

      return reply.send(adminUser)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}