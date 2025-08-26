import { FastifyPluginAsync } from 'fastify'
import { auth } from '../auth'
import { AppError, ErrorCode } from '@happy-bar/types'

export const authRoutes: FastifyPluginAsync = async function (fastify) {
  // Get current user with organization membership and role
  fastify.get('/me', async (request, reply) => {
    try {
      // Get session from better-auth
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>
      })

      if (!session?.user) {
        throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
      }

      // Check if user has an active organization
      if (!session.session.activeOrganizationId) {
        // Try to find user's first organization membership
        const anyMembership = await fastify.prisma.member.findFirst({
          where: {
            userId: session.user.id
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })

        if (anyMembership) {
          // User has membership but no active organization set - return their first membership
          return reply.send({
            success: true,
            data: {
              user: session.user,
              session: session.session,
              member: {
                id: anyMembership.id,
                userId: anyMembership.userId,
                organizationId: anyMembership.organizationId,
                role: anyMembership.role
              },
              organization: anyMembership.organization,
              note: 'No active organization set, returning first membership'
            }
          })
        }

        return reply.send({
          success: true,
          data: {
            user: session.user,
            session: session.session,
            member: null,
            organization: null
          }
        })
      }

      // Get organization membership and role
      const membership = await fastify.prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: session.session.activeOrganizationId
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })

      if (!membership) {
        throw new AppError('Not a member of this organization', ErrorCode.FORBIDDEN, 403)
      }

      return reply.send({
        success: true,
        data: {
          user: session.user,
          session: session.session,
          member: {
            id: membership.id,
            userId: membership.userId,
            organizationId: membership.organizationId,
            role: membership.role
          },
          organization: membership.organization
        }
      })
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      }
      
      console.error('Auth me error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR
      })
    }
  })

  // Get user permissions (computed from role)
  fastify.get('/permissions', async (request, reply) => {
    try {
      // Get session from better-auth
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>
      })

      if (!session?.user) {
        throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
      }

      if (!session.session.activeOrganizationId) {
        return reply.send({
          success: true,
          data: {
            permissions: [],
            role: null
          }
        })
      }

      // Get organization membership and role
      const membership = await fastify.prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: session.session.activeOrganizationId
        }
      })

      if (!membership) {
        throw new AppError('Not a member of this organization', ErrorCode.FORBIDDEN, 403)
      }

      // TODO: Compute permissions from role using the permission matrix
      // For now, just return the role
      return reply.send({
        success: true,
        data: {
          role: membership.role,
          permissions: [] // Will be computed client-side
        }
      })
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      }
      
      console.error('Auth permissions error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR
      })
    }
  })
}