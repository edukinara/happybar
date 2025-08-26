import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@happy-bar/database'
import { authMiddleware } from '../middleware/auth-simple'
import { auth } from '../auth'

const prisma = new PrismaClient()

export default async function organizationManagementRoutes(fastify: FastifyInstance) {
  // Get user's organizations
  fastify.get('/user/organizations', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const user = (request as any).user

      const memberships = await prisma.member.findMany({
        where: {
          userId: user.id
        },
        include: {
          organization: true
        }
      })

      const organizations = memberships.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        isActive: user.activeOrganizationId === membership.organization.id
      }))

      return reply.send({
        success: true,
        data: {
          organizations,
          activeOrganizationId: user.activeOrganizationId
        }
      })
    } catch (error) {
      console.error('Failed to fetch user organizations:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch organizations'
      })
    }
  })

  // Set active organization
  fastify.post('/user/set-active-organization', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { organizationId } = request.body as { organizationId: string }
      const user = (request as any).user

      // Verify user is a member of this organization
      const membership = await prisma.member.findFirst({
        where: {
          userId: user.id,
          organizationId: organizationId
        }
      })

      if (!membership) {
        return reply.status(403).send({
          success: false,
          error: 'You are not a member of this organization'
        })
      }

      // Update the session with the new active organization
      // Note: This would typically require updating the session in Better Auth
      // For now, we'll just return success and let the frontend handle it
      
      return reply.send({
        success: true,
        data: {
          activeOrganizationId: organizationId
        }
      })
    } catch (error) {
      console.error('Failed to set active organization:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to set active organization'
      })
    }
  })

  // Get current user info with organization context
  fastify.get('/user/me', async (request, reply) => {
    try {
      // Get user session from Better Auth (no organization requirement)
      const sessionData = await auth.api.getSession({
        headers: request.headers as any,
      })

      if (!sessionData?.user) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
        })
      }

      const userId = sessionData.user.id
      
      // Try to find user's organization membership (optional)
      const membership = await prisma.member.findFirst({
        where: { userId },
        include: { organization: true }
      })

      // If user has membership, also fetch their location assignments
      let locationAssignments: any[] = []
      if (membership) {
        locationAssignments = await prisma.userLocationAssignment.findMany({
          where: {
            userId,
            organizationId: membership.organizationId,
            isActive: true
          },
          include: {
            location: true
          }
        })
      }

      return reply.send({
        success: true,
        data: {
          user: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name
          },
          activeOrganizationId: membership?.organizationId || null,
          member: membership ? {
            role: membership.role,
            organizationId: membership.organizationId,
            organization: membership.organization
          } : null,
          locationAssignments: locationAssignments.map(assignment => ({
            id: assignment.id,
            locationId: assignment.locationId,
            locationName: assignment.location.name,
            canRead: assignment.canRead,
            canWrite: assignment.canWrite,
            canManage: assignment.canManage
          }))
        }
      })
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch user info'
      })
    }
  })
}