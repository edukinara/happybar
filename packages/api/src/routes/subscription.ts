import { AppError, ErrorCode } from '@happy-bar/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SubscriptionService } from '../services/subscription'
import { roleHasPermission } from '../utils/permissions'

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!(request as any).organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return (request as any).organization.id
}

// Helper to get organization owner's user ID for Autumn customer operations
async function getOrganizationOwnerCustomerId(
  organizationId: string,
  prisma: any
): Promise<string> {
  const ownerMember = await prisma.member.findFirst({
    where: {
      organizationId: organizationId,
      role: 'owner',
    },
    include: {
      user: true,
    },
  })

  if (!ownerMember) {
    throw new AppError('Organization owner not found', ErrorCode.NOT_FOUND, 404)
  }

  return ownerMember.userId
}

// Helper to check if user has required permissions before making Autumn calls
async function checkRequiredPermissions(
  request: any,
  requiredPermissions: string[],
  prisma: any
): Promise<{ hasPermission: boolean; missingPermissions: string[] }> {
  const user = (request as any).user
  const organizationId = (request as any).organization?.id

  if (!user || !organizationId) {
    return { hasPermission: false, missingPermissions: requiredPermissions }
  }

  // Get user's membership to check role
  const membership = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: organizationId,
    },
  })

  if (!membership) {
    return { hasPermission: false, missingPermissions: requiredPermissions }
  }

  // Import the role permissions check
  const missingPermissions: string[] = []

  for (const permission of requiredPermissions) {
    const [resource, action] = permission.split('.')
    if (
      resource &&
      action &&
      !roleHasPermission(membership.role, resource, action)
    ) {
      missingPermissions.push(permission)
    }
  }

  return {
    hasPermission: missingPermissions.length === 0,
    missingPermissions,
  }
}

// Map feature IDs to their required permissions for common use cases
const FEATURE_PERMISSION_MAP: Record<string, string[]> = {
  locations: ['admin.locations'], // Creating/managing locations
  team_members: ['users.invite', 'users.write'], // Adding team members
  integrations: ['admin.integrations'], // Setting up integrations
  pos_integration: ['admin.integrations'], // POS system setup
  advanced_analytics: ['analytics.financial'], // Financial reports
  bulk_operations: ['inventory.write'], // Bulk inventory operations
  product_management: ['products.write'], // Creating/editing products
  supplier_management: ['suppliers.write'], // Managing suppliers
}

// Helper to automatically determine required permissions for a feature
function getRequiredPermissionsForFeature(featureId: string): string[] {
  return FEATURE_PERMISSION_MAP[featureId] || []
}

export default async function subscriptionRoutes(fastify: FastifyInstance) {
  // Add a custom content type parser that handles empty JSON bodies
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    function (request, body, done) {
      try {
        if (body === '') {
          done(null, {})
        } else {
          done(null, JSON.parse(body as string))
        }
      } catch (err) {
        done(err as Error)
      }
    }
  )

  // CORS preflight handler for Autumn SDK
  fastify.options('/cors', async (request, reply) => {
    // Use the origin from the request or fallback for development
    const origin = request.headers.origin || 'http://localhost:3000'
    reply.header('Access-Control-Allow-Origin', origin)
    reply.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.send()
  })

  // Handle CORS requests from Autumn SDK
  fastify.post('/cors', async (request, reply) => {
    // Use the origin from the request or fallback for development
    const origin = request.headers.origin || 'http://localhost:3000'
    reply.header('Access-Control-Allow-Origin', origin)
    reply.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.send({ status: 'ok' })
  })

  // Get Autumn products (public endpoint for SDK)
  fastify.get('/products', async (request, reply) => {
    try {
      const products = await SubscriptionService.getProducts()
      return {
        success: true,
        data: { products },
      }
    } catch (error) {
      console.error('Failed to get products:', error)
      throw new AppError(
        'Failed to get products',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get customer endpoint for Autumn SDK (requires auth)
  fastify.get('/customers', async (request, reply) => {
    const organizationId = getOrganizationId(request)

    try {
      // Use organization owner's customer ID for subscription data
      const customerId = await getOrganizationOwnerCustomerId(
        organizationId,
        fastify.prisma
      )

      const customer = await SubscriptionService.getCustomer(customerId)
      return {
        success: true,
        data: { customer },
      }
    } catch (error) {
      // Customer might not exist in Autumn yet - this is expected for new organizations
      if ((error as any).response?.status === 404) {
        console.error(
          'Customer not found in Autumn (expected for new organizations):',
          organizationId
        )
        return {
          success: true,
          data: { customer: null },
        }
      }
      console.error('Failed to get customer data:', error)
      throw new AppError(
        'Failed to get subscription data',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Create customer endpoint for Autumn SDK (now requires auth)
  fastify.post('/customers', async (request, reply) => {
    const validatedData = z
      .object({
        id: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        fingerprint: z.string().optional(),
      })
      .parse(request.body)

    const user = (request as any).user!
    const customerId = validatedData.id || user.id

    try {
      // First check if customer already exists
      try {
        const existingCustomer =
          await SubscriptionService.getCustomer(customerId)
        return {
          success: true,
          data: { customer: existingCustomer },
        }
      } catch (error) {
        // Customer doesn't exist, continue with creation
        if ((error as any).response?.status !== 404) {
          throw error // Re-throw if it's not a 404
        }
      }

      // Create new customer
      // Better Auth user object might have firstName/lastName or name
      const userName =
        validatedData.name ||
        user.name ||
        (user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : null) ||
        user.firstName ||
        user.email?.split('@')[0] || // Fallback to email username
        'Unknown User'

      const userEmail =
        validatedData.email || user.email || `user-${customerId}@example.com`

      const customer = await SubscriptionService.createCustomer({
        id: customerId,
        email: userEmail,
        name: userName,
        fingerprint: validatedData.fingerprint || getOrganizationId(request),
      })

      return {
        success: true,
        data: { customer },
      }
    } catch (error) {
      console.error('Customer creation failed:', error)
      throw new AppError(
        'Failed to create customer',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Skip authentication for public endpoints
  const publicPaths = ['/cors', '/products']

  // Feature gate endpoints that all authenticated users can access
  const featureGatePaths = ['/check', '/track', '/customer']

  // Billing management endpoints restricted to owners/admins
  const billingPaths = [
    '/customers',
    '/checkout',
    '/attach',
    '/billing-portal',
    '/cancel',
  ]

  // Add authentication middleware for authenticated subscription routes
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for public endpoints
    if (publicPaths.some((path) => request.url.endsWith(path))) {
      return
    }

    // Authentication is now handled by global Better Auth organization middleware
    // Just verify that we have organization context
    if (!(request as any).organization?.id) {
      reply.code(401).send({ error: 'Authentication required' })
      return
    }

    // Check if this is a billing management endpoint that requires owner/admin access
    // Use more precise URL matching to avoid conflicts between /customer and /customers
    const requestPath = request.url.split('?')[0] // Remove query parameters
    const isBillingEndpoint = billingPaths.some(
      (path) => requestPath === `/api/subscription${path}`
    )

    if (isBillingEndpoint) {
      const user = (request as any).user
      const organizationId = (request as any).organization?.id

      if (!user || !organizationId) {
        reply.code(403).send({
          error: 'Access denied. Billing management requires authentication.',
          code: 'INSUFFICIENT_PERMISSIONS',
        })
        return
      }

      // Check user's role in the organization
      const membership = await fastify.prisma.member.findFirst({
        where: {
          userId: user.id,
          organizationId: organizationId,
        },
      })

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        reply.code(403).send({
          error:
            'Access denied. Billing management requires owner or admin role.',
          code: 'INSUFFICIENT_PERMISSIONS',
        })
        return
      }
    }

    // Feature gate endpoints are accessible to all authenticated organization members
    // No additional role check needed for /check, /track, /customer endpoints
  })

  // Create checkout session
  fastify.post('/checkout', async (request, reply) => {
    const validatedData = z
      .object({
        productId: z.string(),
        successUrl: z.string().optional(),
        entityId: z.string().optional(),
        options: z.record(z.string(), z.number()).optional(),
        reward: z.string().optional(), // Promo code support
      })
      .parse(request.body)

    const organizationId = getOrganizationId(request)
    const user = (request as any).user!

    try {
      // Use user ID as customer ID in Autumn
      const customerId = user.id

      // Create or update customer in Autumn if needed
      try {
        await SubscriptionService.getCustomer(customerId)
      } catch (error) {
        // Better Auth user object might have firstName/lastName or name
        const userName =
          user.name ||
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : null) ||
          user.firstName ||
          user.email?.split('@')[0] || // Fallback to email username
          'Unknown User'

        const userEmail = user.email || `user-${customerId}@example.com`

        await SubscriptionService.createCustomer({
          id: customerId,
          email: userEmail,
          name: userName,
          fingerprint: organizationId, // Use organization ID as fingerprint to prevent abuse
        })
      }

      const checkout = await SubscriptionService.createCheckout({
        customerId,
        productId: validatedData.productId,
        successUrl: validatedData.successUrl,
        entityId: validatedData.entityId,
        options: validatedData.options,
        reward: validatedData.reward, // Pass promo code if provided
        customerData: {
          organizationId,
          organizationName:
            (request as any).organization?.name || 'Unknown Organization',
        },
      }).then(async (res) => {
        try {
          const [locations, products, teamMembers, posIntegrations] =
            await fastify.prisma.$transaction(async (tx) => {
              const posIntegrations = (
                await tx.pOSIntegration.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const products = (
                await tx.product.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const locations = (
                await tx.location.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const teamMembers = (
                await tx.member.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              return [locations, products, teamMembers, posIntegrations]
            })
          await Promise.all([
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'locations',
              value: locations,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'products',
              value: products,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'team_members',
              value: teamMembers,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'pos_integrations',
              value: posIntegrations,
              track: false,
            }),
          ])
        } catch (_err) {
          console.error('Error tracking usage')
        }
        return res
      })

      return {
        success: true,
        data: { checkout },
      }
    } catch (error) {
      console.error('Checkout creation failed:', error)
      // Log more details about the error
      console.error('Error details:', {
        message: (error as any).message,
        response: (error as any).response?.data,
        status: (error as any).response?.status,
      })
      throw new AppError(
        'Failed to create checkout session',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Attach product to customer (for existing payment methods)
  fastify.post('/attach', async (request, reply) => {
    const validatedData = z
      .object({
        productId: z.string(),
        successUrl: z.string().optional(),
        entityId: z.string().optional(),
        options: z.record(z.string(), z.number()).optional(),
        reward: z.string().optional(), // Promo code support
      })
      .parse(request.body)

    const organizationId = getOrganizationId(request)
    const user = (request as any).user!
    const customerId = user.id

    try {
      const result = await SubscriptionService.attachProduct({
        customerId,
        productId: validatedData.productId,
        successUrl: validatedData.successUrl,
        entityId: validatedData.entityId,
        options: validatedData.options,
        reward: validatedData.reward, // Pass promo code if provided
        customerData: {
          organizationId,
          organizationName:
            (request as any).organization?.name || 'Unknown Organization',
        },
      })

      return {
        success: true,
        data: { result },
      }
    } catch (error) {
      console.error('Product attachment failed:', error)
      throw new AppError(
        'Failed to attach product',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Check feature access
  fastify.post('/check', async (request, reply) => {
    const validatedData = z
      .object({
        featureId: z.string(),
        requiredBalance: z.number().optional(),
        sendEvent: z.boolean().optional(),
        entityId: z.string().optional(),
        // Optional: specify what action the user wants to perform to check permissions first
        requiredPermissions: z.array(z.string()).optional(),
      })
      .parse(request.body)

    const organizationId = getOrganizationId(request)

    try {
      // Determine required permissions - either explicit or from feature mapping
      const requiredPermissions =
        validatedData.requiredPermissions ||
        getRequiredPermissionsForFeature(validatedData.featureId)

      // Pre-check permissions if we have any to check
      if (requiredPermissions && requiredPermissions.length > 0) {
        const permissionCheck = await checkRequiredPermissions(
          request,
          requiredPermissions,
          fastify.prisma
        )

        if (!permissionCheck.hasPermission) {
          // Return permission denied without calling Autumn
          return {
            data: {
              access: false,
              reason: 'insufficient_permissions',
              missingPermissions: permissionCheck.missingPermissions,
              skipAutumnCheck: true,
            },
          }
        }
      }

      // Use organization owner's customer ID for feature checks
      const customerId = await getOrganizationOwnerCustomerId(
        organizationId,
        fastify.prisma
      )

      const access = await SubscriptionService.checkFeatureAccess({
        customerId,
        featureId: validatedData.featureId,
        requiredBalance: validatedData.requiredBalance,
        sendEvent: validatedData.sendEvent,
        entityId: validatedData.entityId,
      })

      return { data: { access } }
    } catch (error) {
      console.error('Feature access check failed:', error)
      throw new AppError(
        'Failed to check feature access',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Track usage
  fastify.post('/track', async (request, reply) => {
    const validatedData = z
      .object({
        featureId: z.string(),
        value: z.number().optional(),
        entityId: z.string().optional(),
        eventName: z.string().optional(),
        track: z.boolean().optional(),
      })
      .parse(request.body)

    const organizationId = getOrganizationId(request)

    try {
      // Use organization owner's customer ID for usage tracking
      const customerId = await getOrganizationOwnerCustomerId(
        organizationId,
        fastify.prisma
      )

      const event = await SubscriptionService.trackUsage({
        customerId,
        featureId: validatedData.featureId,
        value: validatedData.value,
        entityId: validatedData.entityId,
        eventName: validatedData.eventName,
        track: !!validatedData.track,
      })

      return {
        success: true,
        data: { event },
      }
    } catch (error) {
      console.error('Usage tracking failed:', error)
      throw new AppError(
        'Failed to track usage',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get customer subscription data
  fastify.get('/customer', async (request, reply) => {
    const organizationId = getOrganizationId(request)

    try {
      // Use organization owner's customer ID for subscription data
      const customerId = await getOrganizationOwnerCustomerId(
        organizationId,
        fastify.prisma
      )

      const customer = await SubscriptionService.getCustomer(customerId)
      return {
        success: true,
        data: { customer },
      }
    } catch (error) {
      // Customer might not exist in Autumn yet - this is expected for new organizations
      if ((error as any).response?.status === 404) {
        console.error(
          'Customer not found in Autumn (expected for new organizations):',
          organizationId
        )
        return {
          success: true,
          data: { customer: null },
        }
      }
      console.error('Failed to get customer data:', error)
      throw new AppError(
        'Failed to get subscription data',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get billing portal URL
  fastify.post('/billing-portal', async (request, reply) => {
    const validatedData = z
      .object({
        returnUrl: z.string().optional(),
      })
      .parse(request.body)

    const user = (request as any).user!
    const customerId = user.id

    try {
      const url = await SubscriptionService.getBillingPortal(
        customerId,
        validatedData.returnUrl
      )

      return {
        success: true,
        data: { url },
      }
    } catch (error) {
      console.error('Failed to get billing portal URL:', error)
      throw new AppError(
        'Failed to get billing portal',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Cancel subscription/product
  fastify.post('/cancel', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const validatedData = z
      .object({
        productId: z.string(),
      })
      .parse(request.body)

    const user = (request as any).user!
    const customerId = user.id

    try {
      const result = await SubscriptionService.cancelProduct(
        customerId,
        validatedData.productId
      ).then(async (res) => {
        try {
          const [locations, products, teamMembers, posIntegrations] =
            await fastify.prisma.$transaction(async (tx) => {
              const posIntegrations = (
                await tx.pOSIntegration.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const products = (
                await tx.product.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const locations = (
                await tx.location.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              const teamMembers = (
                await tx.member.findMany({
                  where: {
                    organizationId,
                  },
                })
              ).length
              return [locations, products, teamMembers, posIntegrations]
            })
          await Promise.all([
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'locations',
              value: locations,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'products',
              value: products,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'team_members',
              value: teamMembers,
              track: false,
            }),
            SubscriptionService.trackUsage({
              customerId,
              featureId: 'pos_integrations',
              value: posIntegrations,
              track: false,
            }),
          ])
        } catch (_err) {
          console.error('Error tracking usage')
        }
        return res
      })

      return {
        success: true,
        data: { result },
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      throw new AppError(
        'Failed to cancel subscription',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get feature usage
  fastify.get('/usage/:featureId', async (request, reply) => {
    const { featureId } = request.params as { featureId: string }
    const { entityId } = request.query as { entityId?: string }

    const user = (request as any).user!
    const customerId = user.id

    try {
      const usage = await SubscriptionService.getFeatureUsage(
        customerId,
        featureId,
        entityId
      )

      return {
        success: true,
        data: { usage },
      }
    } catch (error) {
      console.error('Failed to get feature usage:', error)
      throw new AppError(
        'Failed to get usage data',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get feature balances
  fastify.get('/balances', async (request, reply) => {
    const { entityId } = request.query as { entityId?: string }

    const user = (request as any).user!
    const customerId = user.id

    try {
      const balances = await SubscriptionService.getFeatureBalances(
        customerId,
        entityId
      )

      return {
        success: true,
        data: { balances },
      }
    } catch (error) {
      console.error('Failed to get feature balances:', error)
      throw new AppError(
        'Failed to get balance data',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })
}
