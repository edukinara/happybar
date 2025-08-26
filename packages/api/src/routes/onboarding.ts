import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { auth } from '../auth'
import { UsageTracker } from '../utils/usage-tracker'

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^[a-zA-Z0-9-]+$/,
      'Domain must contain only letters, numbers, and hyphens'
    ),
})

export const onboardingRoutes: FastifyPluginAsync = async function (fastify) {
  // Create organization and tenant for new user
  fastify.post('/create-organization', async (request, reply) => {
    try {
      const { name, domain } = createOrganizationSchema.parse(request.body)

      // Get user session from Better Auth
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

      // Check if user already has an organization
      const existingMembership = await fastify.prisma.member.findFirst({
        where: { userId },
      })

      if (existingMembership) {
        reply.code(400).send({
          success: false,
          error: 'User already belongs to an organization',
        })
        return
      }

      // Check if domain is already taken
      const existingOrg = await fastify.prisma.organization.findFirst({
        where: { slug: domain },
      })

      if (existingOrg) {
        reply.code(409).send({
          success: false,
          error: 'Domain already taken',
        })
        return
      }

      // Create organization with initial setup
      const organization = await fastify.prisma.organization.create({
        data: {
          name,
          slug: domain,
          metadata: {
            createdBy: userId,
            plan: 'free',
            settings: {},
          },
        },
      })

      // Add user as owner
      await fastify.prisma.member.create({
        data: {
          id: `${organization.id}_${userId}`, // Better Auth expects an ID
          organizationId: organization.id,
          userId,
          role: 'owner',
          createdAt: new Date(),
        },
      })

      // Set the organization as active using Better Auth's organization API
      try {
        // Use Better Auth's setActiveOrganization method
        await auth.api.setActiveOrganization({
          headers: request.headers as any,
          body: {
            organizationId: organization.id,
          },
        })
      } catch (error) {
        // Fallback: Update sessions directly
        try {
          await fastify.prisma.session.updateMany({
            where: {
              userId,
              expiresAt: {
                gt: new Date(),
              },
            },
            data: {
              activeOrganizationId: organization.id,
            },
          })
        } catch (fallbackError) {
          fastify.log.warn(
            { error: fallbackError },
            'Failed to update session with active organization'
          )
        }
      }

      // Create default location for the organization
      await fastify.prisma.location.create({
        data: {
          organizationId: organization.id,
          name: 'Main Storage',
          type: 'STORAGE',
        },
      })

      // Create default categories
      const beverageCategory = await fastify.prisma.category.create({
        data: {
          organizationId: organization.id,
          name: 'Beverages',
          sortOrder: 1,
        },
      })
      const otherCategory = await fastify.prisma.category.create({
        data: {
          organizationId: organization.id,
          name: 'Other',
          sortOrder: 1,
        },
      })

      await fastify.prisma.category.createMany({
        data: [
          {
            organizationId: organization.id,
            name: 'Beer',
            parentId: beverageCategory.id,
            sortOrder: 1,
          },
          {
            organizationId: organization.id,
            name: 'Wine',
            parentId: beverageCategory.id,
            sortOrder: 2,
          },
          {
            organizationId: organization.id,
            name: 'Spirits',
            parentId: beverageCategory.id,
            sortOrder: 3,
          },
          {
            organizationId: organization.id,
            name: 'Food',
            sortOrder: 2,
          },
          {
            organizationId: organization.id,
            name: 'Soft Drinks/Water',
            parentId: otherCategory.id,
            sortOrder: 4,
          },
          {
            organizationId: organization.id,
            name: 'Jiuce',
            parentId: otherCategory.id,
            sortOrder: 5,
          },
          {
            organizationId: organization.id,
            name: 'Mixer',
            parentId: otherCategory.id,
            sortOrder: 6,
          },
          {
            organizationId: organization.id,
            name: 'Drinkware',
            parentId: otherCategory.id,
            sortOrder: 7,
          },
          {
            organizationId: organization.id,
            name: 'Produce',
            parentId: otherCategory.id,
            sortOrder: 6,
          },
        ],
        skipDuplicates: true,
      })

      // Create customer in Autumn with proper user data before tracking usage
      try {
        // Get user data from session for customer creation
        const user = sessionData.user
        
        // Create customer with proper name and email
        const userName = user.name || 
          (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
          user.firstName ||
          user.email?.split('@')[0] || // Fallback to email username
          'Unknown User'
          
        const userEmail = user.email || `user-${userId}@example.com`
        
        console.log('Creating customer during onboarding with:', {
          id: userId,
          email: userEmail,
          name: userName,
          fingerprint: organization.id
        })

        const { SubscriptionService } = await import('../services/subscription')
        await SubscriptionService.createCustomer({
          id: userId,
          email: userEmail,
          name: userName,
          fingerprint: organization.id, // Use organization ID as fingerprint
        })
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to create customer, will proceed with usage tracking')
        // Don't fail the onboarding if customer creation fails
      }

      // Track initial usage (1 team member + 1 location)
      try {
        await UsageTracker.updateTeamMemberUsage(
          userId,
          organization.id,
          fastify.prisma
        )
        await UsageTracker.updateLocationUsage(
          userId,
          organization.id,
          fastify.prisma
        )
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to track initial usage')
      }

      reply.code(201).send({
        success: true,
        data: {
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: 'errors' in error ? error.errors : [],
        })
        return
      }

      fastify.log.error({ error }, 'Failed to create organization')
      reply.code(500).send({
        success: false,
        error: 'Failed to create organization',
      })
    }
  })

  // Get user's onboarding status
  fastify.get('/status', async (request, reply) => {
    try {
      // Get user session from Better Auth
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

      // Check if user has an organization
      const membership = await fastify.prisma.member.findFirst({
        where: { userId },
        include: {
          organization: true,
        },
      })

      const hasOrganization = !!membership

      reply.send({
        success: true,
        data: {
          user: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name,
            emailVerified: sessionData.user.emailVerified,
          },
          hasOrganization,
          organization: membership
            ? {
                id: membership.organization.id,
                name: membership.organization.name,
                slug: membership.organization.slug,
                role: membership.role,
              }
            : null,
          needsOnboarding: !hasOrganization,
        },
      })
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get onboarding status')
      reply.code(500).send({
        success: false,
        error: 'Failed to get onboarding status',
      })
    }
  })
}
