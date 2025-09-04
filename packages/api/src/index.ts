// Load environment configuration first
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@happy-bar/database'
import Fastify from 'fastify'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
// Middleware is now inline in the main server setup
import { auth } from './auth'
import { registerAdminAuth } from './middleware/adminAuth'
import { accountLinkingRoutes } from './routes/account-linking'
import adminAuthRoutes from './routes/admin/auth'
import adminPlatformRoutes from './routes/admin/platform'
import { alertRoutes } from './routes/alerts'
import { analyticsRoutes } from './routes/analytics'
import auditLogs from './routes/audit-logs'
import { authRoutes } from './routes/auth'
import { inventoryRoutes } from './routes/inventory'
import inventoryCountRoutes from './routes/inventory-counts'
import inventoryReportsRoutes from './routes/inventory-reports'
import { inventorySettingsRoutes } from './routes/inventory-settings'
import inventoryTransactionsRoutes from './routes/inventory-transactions'
import { locationsRoutes } from './routes/locations'
import { onboardingRoutes } from './routes/onboarding'
import { ordersRoutes } from './routes/orders'
import organizationManagementRoutes from './routes/organization-management'
import pendingAssignmentsRoutes from './routes/pending-assignments'
import { posRoutes } from './routes/pos'
import posSalesSync from './routes/pos-sales-sync'
import posWebhooks from './routes/pos-webhooks'
import { productRoutes } from './routes/products'
import recipePOSMappingsRoutes from './routes/recipe-pos-mappings'
import recipesRoutes from './routes/recipes'
import stockTransferRoutes from './routes/stock-transfers'
import subscriptionRoutes from './routes/subscription'
import { suppliersRoutes } from './routes/suppliers'
import { userLocationAssignmentRoutes } from './routes/user-location-assignments'
import varianceAlertsRoutes from './routes/variance-alerts'
import { webhookRoutes } from './routes/webhooks'
import { logger } from './utils/logger'

// Use environment variables from config
const { PORT, HOST, JWT_SECRET } = env

// Create Fastify instance
const fastify = Fastify({
  // logger: true,
  trustProxy: true,
  loggerInstance: logger,
})

// Global error handler
fastify.setErrorHandler(errorHandler)

// Prisma client
const prisma = new PrismaClient()

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...')
  await prisma.$disconnect()
  await fastify.close()
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

async function buildServer() {
  try {
    // Register plugins with Better Auth compatible CORS
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true)

        const allowedOrigins =
          env.NODE_ENV === 'production'
            ? ['https://happybar.app', 'https://www.happybar.app']
            : ['http://localhost:3000', /^http:\/\/192\.168\.\d+\.\d+:3001$/]

        const isAllowed = allowedOrigins.some((allowed) =>
          typeof allowed === 'string'
            ? allowed === origin
            : allowed.test(origin)
        )

        callback(null, isAllowed)
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'x-better-auth-token',
      ],
      credentials: true, // Enable credentials for web app cookies
      maxAge: 86400, // 24 hours
    })

    await fastify.register(jwt, {
      secret: JWT_SECRET,
    })

    await fastify.register(websocket)
    await fastify.register(multipart)

    // Swagger documentation
    // await fastify.register(swagger, {
    //   openapi: {
    //     info: {
    //       title: 'Happy Bar API',
    //       description: 'POS-integrated inventory management SaaS API',
    //       version: '1.0.0',
    //     },
    //     servers: [
    //       { url: 'http://localhost:3001', description: 'Development server' },
    //     ],
    //     components: {
    //       securitySchemes: {
    //         Bearer: {
    //           type: 'http',
    //           scheme: 'bearer',
    //           bearerFormat: 'JWT',
    //         },
    //       },
    //     },
    //     security: [{ Bearer: [] }],
    //   },
    // })

    // await fastify.register(swaggerUi, {
    //   routePrefix: '/docs',
    //   uiConfig: {
    //     docExpansion: 'list',
    //     deepLinking: false,
    //   },
    // })

    // Decorators for shared services
    fastify.decorate('prisma', prisma)

    // Register admin authentication middleware
    await registerAdminAuth(fastify)

    // Better Auth handler - register before global middleware
    // Handle all Better Auth routes with a generic handler
    const betterAuthHandler = async (request: any, reply: any) => {
      try {
        // Log invitation acceptance attempts
        if (request.url.includes('accept-invitation')) {
          console.log(
            '🔥 Better Auth accept-invitation called:',
            request.method,
            request.url
          )
          console.log('🔥 Request body:', request.body)
        }
        // Build the full URL
        const protocol = request.headers['x-forwarded-proto'] || 'http'
        const host = request.headers.host
        const url = `${protocol}://${host}${request.url}`

        // Convert headers to Headers object
        const headers = new Headers()
        Object.entries(request.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers.set(key, value)
          } else if (Array.isArray(value)) {
            headers.set(key, value.join(', '))
          }
        })

        // Get request body
        let body: string | undefined
        if (request.method !== 'GET' && request.body) {
          body =
            typeof request.body === 'string'
              ? request.body
              : JSON.stringify(request.body)
        }

        // Create Web API Request
        const webRequest = new Request(url, {
          method: request.method,
          headers,
          body,
        })

        // Handle with Better Auth
        const response = await auth.handler(webRequest)

        // Set status
        reply.status(response.status)

        // Set headers
        response.headers.forEach((value: any, key: any) => {
          reply.header(key, value)
        })

        // Get and send body
        const text = await response.text()
        reply.send(text || '')
      } catch (error) {
        fastify.log.error('Better Auth error:', error as any)
        reply.status(500).send({ error: 'Authentication error' })
      }
    }

    // Register all auth endpoints
    fastify.get('/api/auth/session', betterAuthHandler)
    fastify.get('/api/auth/get-session', betterAuthHandler) // Alias for mobile app
    fastify.post('/api/auth/sign-up', betterAuthHandler)
    fastify.post('/api/auth/sign-up/email', betterAuthHandler)
    fastify.post('/api/auth/sign-in', betterAuthHandler)
    fastify.post('/api/auth/sign-in/email', betterAuthHandler)
    fastify.post('/api/auth/sign-out', betterAuthHandler)
    fastify.post('/api/auth/reset-password', betterAuthHandler)
    fastify.post('/api/auth/verify-email', betterAuthHandler)

    // Organization routes
    fastify.get('/api/auth/organization', betterAuthHandler)
    fastify.post('/api/auth/organization/create', betterAuthHandler)
    fastify.post('/api/auth/organization/leave', betterAuthHandler)
    fastify.post('/api/auth/organization/invite-member', betterAuthHandler)
    fastify.get('/api/auth/organization/list-invitations', betterAuthHandler)
    fastify.get('/api/auth/organization/get-invitation', betterAuthHandler)
    fastify.post('/api/auth/organization/cancel-invitation', betterAuthHandler)
    fastify.post('/api/auth/organization/accept-invitation', betterAuthHandler)
    fastify.post('/api/auth/organization/reject-invitation', betterAuthHandler)
    fastify.post('/api/auth/organization/set-active', betterAuthHandler)

    // Autumn billing routes
    fastify.get('/api/auth/autumn/subscription', betterAuthHandler)
    fastify.post('/api/auth/autumn/create-subscription', betterAuthHandler)

    // Handle auth error route with custom redirect
    fastify.get('/api/auth/error', async (request, reply) => {
      const { error } = request.query as { error?: string }

      if (error === 'unable_to_create_user') {
        const errorMessage = encodeURIComponent(
          'Social sign-in is only available for existing accounts. Please create an account with email/password first, then link your social accounts from settings.'
        )
        const redirectUrl = `${env.APP_BASE_URL}/login?error=${errorMessage}`
        return reply.redirect(redirectUrl)
      }

      // For other errors, use default Better Auth handler
      return betterAuthHandler(request, reply)
    })

    // Catch-all for any other auth routes
    fastify.all('/api/auth/*', betterAuthHandler)

    fastify.addHook('onRequest', async (request, reply) => {
      // Skip middleware for auth routes, onboarding, and static files
      if (
        request.url.startsWith('/api/auth') ||
        request.url.startsWith('/api/admin') ||
        request.url.startsWith('/api/onboarding') ||
        request.url.startsWith('/api/pos-webhooks') ||
        request.url === '/api/pos-sales-sync/cron' ||
        request.url.startsWith('/docs') ||
        request.url.startsWith('/health') ||
        request.url.startsWith('/webhooks') ||
        request.url.startsWith('/test-middleware') ||
        request.url.startsWith('/debug') ||
        request.url === '/api/autumn/products' ||
        request.url === '/api/user/me' ||
        request.url.startsWith('/api/linked-accounts') ||
        request.url.startsWith('/api/link-status')
      ) {
        return
      }

      try {
        // Check if this is a mobile app request
        const userAgent = request.headers['user-agent'] || ''
        const isMobileApp = userAgent.includes('okhttp')

        if (isMobileApp && request.headers.authorization) {
          // For mobile app, try direct token validation via Redis
          const token = request.headers.authorization.replace('Bearer ', '')

          // Import redis here to avoid circular dependencies
          const { redis } = await import('./utils/redis-client')

          try {
            // Better Auth stores sessions as: active-sessions-{userId} -> array of session tokens
            // First, we need to find which user has this token
            const pattern = 'active-sessions-*'
            const userSessionKeys = await redis.keys(pattern)

            let foundUserId = null
            let validSession = null

            for (const userKey of userSessionKeys) {
              const sessionsData = await redis.get(userKey)
              if (sessionsData) {
                try {
                  let sessions

                  // Handle different data formats from Redis
                  if (typeof sessionsData === 'string') {
                    // Try parsing as JSON string
                    sessions = JSON.parse(sessionsData)
                  } else if (Array.isArray(sessionsData)) {
                    // Already an array
                    sessions = sessionsData
                  } else if (typeof sessionsData === 'object') {
                    // If it's an object, convert to array or handle accordingly
                    sessions = Array.isArray(sessionsData)
                      ? sessionsData
                      : [sessionsData]
                  } else {
                    continue
                  }

                  if (Array.isArray(sessions)) {
                    // Find the session with matching token
                    const matchingSession = sessions.find(
                      (session: any) =>
                        session.token === token &&
                        session.expiresAt > Date.now()
                    )

                    if (matchingSession) {
                      foundUserId = userKey.replace('active-sessions-', '')
                      validSession = matchingSession
                      break
                    }
                  } else {
                  }
                } catch (parseError) {
                  console.error(
                    '🔍 Error parsing sessions for key:',
                    userKey,
                    parseError
                  )
                }
              }
            }

            if (foundUserId && validSession) {
              // Get user data from database
              const user = await fastify.prisma.user.findUnique({
                where: { id: foundUserId },
              })

              if (user) {
                // Set session data on request for downstream handlers
                ;(request as any).user = user
                ;(request as any).sessionData = {
                  user: user,
                  session: {
                    ...validSession,
                    userId: foundUserId,
                    id: validSession.token,
                  },
                }
                return
              }
            } else {
            }
          } catch (error) {
            console.error('🔍 Redis lookup error:', error)
          }
        }

        // Fall back to Better Auth session validation
        const sessionData = await auth.api.getSession({
          headers: request.headers as any,
        })

        if (!sessionData?.user) {
          reply.code(401).send({
            success: false,
            error: 'Authentication required',
          })
          return
        }

        const userId = sessionData.user.id

        // Get organization ID for this user
        const membership = await fastify.prisma.member.findFirst({
          where: { userId },
          include: { organization: true },
        })

        if (!membership) {
          reply.code(403).send({
            success: false,
            error: 'Organization setup required',
            needsOnboarding: true,
          })
          return
        }

        const organizationId = membership.organization.id

        // Add user and organization context to request
        request.user = {
          id: userId,
          email: sessionData.user.email,
          name: sessionData.user.name,
        }
        request.organization = {
          id: organizationId,
          name: membership.organization.name,
          slug: membership.organization.slug || '',
        }
      } catch (error) {
        console.error('❌ Middleware error:', error)
        reply.code(500).send({
          success: false,
          error: 'Authentication error',
        })
      }
    })

    // Register onboarding routes (no middleware for auth endpoints)
    await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' })

    // Register remaining routes
    await fastify.register(accountLinkingRoutes, { prefix: '/api' })
    await fastify.register(alertRoutes, { prefix: '/api/alerts' })
    await fastify.register(auditLogs, { prefix: '/api/audit-logs' })
    await fastify.register(authRoutes, { prefix: '/api/auth' })
    await fastify.register(inventoryRoutes, { prefix: '/api/inventory' })
    await fastify.register(inventoryCountRoutes, {
      prefix: '/api/inventory-counts',
    })
    await fastify.register(inventoryReportsRoutes, {
      prefix: '/api/inventory/reports',
    })
    await fastify.register(inventorySettingsRoutes, {
      prefix: '/api/inventory-settings',
    })
    await fastify.register(inventoryTransactionsRoutes, {
      prefix: '/api/inventory-transactions',
    })
    await fastify.register(locationsRoutes, { prefix: '/api/locations' })
    await fastify.register(ordersRoutes, { prefix: '/api/orders' })
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' })
    await fastify.register(posRoutes, { prefix: '/api/pos' })
    await fastify.register(productRoutes, { prefix: '/api/products' })
    await fastify.register(recipesRoutes, { prefix: '/api/recipes' })
    await fastify.register(recipePOSMappingsRoutes, {
      prefix: '/api/recipe-pos-mappings',
    })
    await fastify.register(posWebhooks, { prefix: '/api/pos-webhooks' })
    await fastify.register(posSalesSync, { prefix: '/api/pos-sales-sync' })
    await fastify.register(subscriptionRoutes, { prefix: '/api/subscription' })
    await fastify.register(stockTransferRoutes, { prefix: '/api/stock' })
    await fastify.register(suppliersRoutes, { prefix: '/api/suppliers' })
    await fastify.register(userLocationAssignmentRoutes, {
      prefix: '/api/user-location-assignments',
    })
    await fastify.register(pendingAssignmentsRoutes, { prefix: '/api' })
    await fastify.register(organizationManagementRoutes, { prefix: '/api' })
    await fastify.register(varianceAlertsRoutes, {
      prefix: '/api/variance-alerts',
    })

    // Register admin routes (separate authentication system)
    await fastify.register(adminAuthRoutes, { prefix: '/api/admin/auth' })
    await fastify.register(adminPlatformRoutes, {
      prefix: '/api/admin/platform',
    })

    // Register Autumn SDK endpoints (public product listing)
    // Note: /api/autumn/products is used by pricing pages for public access
    await fastify.register(subscriptionRoutes, { prefix: '/api/autumn' })

    await fastify.register(webhookRoutes, { prefix: '/webhooks' })

    // Health check
    fastify.get('/health', async (request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }
      } catch (error) {
        reply.code(503)
        return {
          status: 'unhealthy',
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        }
      }
    })

    // Test endpoint to verify middleware hook execution
    fastify.get('/test-middleware', async (request, reply) => {
      return {
        message: 'This endpoint should trigger middleware hook',
        organization: (request as any).organization || null,
        user: request.user || null,
      }
    })

    // Test endpoint to manually trigger member creation hook
    fastify.post('/debug/test-member-creation', async (request, reply) => {
      try {
        const { userId, organizationId, role } = request.body as any

        // Create a member directly using Prisma to test hooks
        const member = await fastify.prisma.member.create({
          data: {
            id: `${organizationId}_${userId}`,
            userId,
            organizationId,
            role,
            createdAt: new Date(),
          },
        })

        return { success: true, member }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Debug endpoint to check pending assignments
    fastify.get(
      '/debug/pending-assignment/:email/:organizationId',
      async (request, reply) => {
        try {
          const { email, organizationId } = request.params as {
            email: string
            organizationId: string
          }
          const { PendingAssignmentManager } = await import(
            './utils/pending-assignments'
          )

          const assignment =
            await PendingAssignmentManager.getPendingAssignment(
              email,
              organizationId
            )

          return {
            email,
            organizationId,
            assignment: assignment || null,
            found: !!assignment,
          }
        } catch (error) {
          return {
            error: (error as Error).message,
          }
        }
      }
    )

    // Debug endpoint to manually store a pending assignment
    fastify.post('/debug/store-pending-assignment', async (request, reply) => {
      try {
        const { email, organizationId, locationIds } = request.body as any
        const { PendingAssignmentManager } = await import(
          './utils/pending-assignments'
        )

        const assignment =
          await PendingAssignmentManager.storePendingAssignment({
            email,
            organizationId,
            locationIds: locationIds || ['test-location-1'],
            permissions: {
              canRead: true,
              canWrite: true,
              canManage: false,
            },
          })

        return {
          success: true,
          assignment,
        }
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
        }
      }
    })

    // Debug endpoint to manually set active organization
    fastify.post('/debug/set-active-org', async (request, reply) => {
      try {
        const { organizationId } = request.body as { organizationId: string }

        const sessionData = await auth.api.getSession({
          headers: request.headers as any,
        })

        if (!sessionData?.session) {
          return { error: 'No session found' }
        }

        // Update session in database
        const updateResult = await fastify.prisma.session.update({
          where: {
            id: sessionData.session.id,
          },
          data: {
            activeOrganizationId: organizationId,
          },
        })

        return {
          success: true,
          sessionId: sessionData.session.id,
          updated: updateResult,
          message: `Set activeOrganizationId to ${organizationId}`,
        }
      } catch (error) {
        return {
          error: (error as Error).message,
        }
      }
    })

    // Debug endpoint to check session details
    fastify.get('/debug/session', async (request, reply) => {
      try {
        const sessionData = await auth.api.getSession({
          headers: request.headers as any,
        })

        if (!sessionData?.user) {
          return {
            authenticated: false,
            session: null,
            membership: null,
          }
        }

        const userId = sessionData.user.id

        // Get membership information
        const membership = await fastify.prisma.member.findFirst({
          where: { userId },
          include: { organization: true },
        })

        // Get all sessions for this user
        const userSessions = await fastify.prisma.session.findMany({
          where: { userId },
          select: {
            id: true,
            activeOrganizationId: true,
            expiresAt: true,
            createdAt: true,
          },
        })

        return {
          authenticated: true,
          session: {
            userId: sessionData.user.id,
            email: sessionData.user.email,
            activeOrganizationId:
              (sessionData.session as any)?.activeOrganizationId || null,
          },
          membership: membership
            ? {
                id: membership.id,
                organizationId: membership.organizationId,
                role: membership.role,
                organization: {
                  id: membership.organization.id,
                  name: membership.organization.name,
                  slug: membership.organization.slug,
                },
              }
            : null,
          userSessions: userSessions,
        }
      } catch (error) {
        return {
          error: (error as Error).message,
        }
      }
    })

    return fastify
  } catch (error) {
    console.error('Error building server:', error)
    throw error
  }
}

// Start server
if (require.main === module) {
  buildServer()
    .then(async (server) => {
      await server.listen({ port: PORT, host: HOST })
    })
    .catch((error) => {
      console.error('Failed to start server:', error)
      process.exit(1)
    })
}

export { buildServer }
