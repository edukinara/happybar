import { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../auth'
import { AppError, ErrorCode } from '@happy-bar/types'
import type { HappyBarRole } from '@happy-bar/types'
import { roleHasPermission, ROLE_HIERARCHY } from '../utils/permissions'
import type { AuthenticatedRequest } from '../types/auth-guards'
import { assertAuthenticatedRequest } from '../types/auth-guards'
import type { PrismaClient } from '@happy-bar/database'

// Import module augmentation to ensure types are available
import '../types/request'

// Re-export for backward compatibility
export type { AuthenticatedRequest }

/**
 * Authentication middleware factory that creates middleware with prisma access
 */
export const createAuthMiddleware = (prisma: PrismaClient) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Check if request has already been authenticated by global middleware
    if ((request as any).user && (request as any).sessionData) {
      const user = (request as any).user
      const sessionData = (request as any).sessionData
      
      // Set up the request with the pre-authenticated data
      request.authUser = user
      request.session = sessionData.session
      
      // Get organization membership
      const membership = await prisma.member.findFirst({
        where: {
          userId: user.id
        },
        include: {
          organization: true
        }
      })

      if (!membership) {
        throw new AppError('Not a member of any organization', ErrorCode.FORBIDDEN, 403)
      }

      // Attach organization data to request
      request.organization = {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug
      }
      request.member = {
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role as HappyBarRole
      }

      // Add permission checking methods
      request.hasPermission = (resource: string, action: string): boolean => {
        return roleHasPermission(request.member!.role, resource, action)
      }

      request.hasAnyPermission = (permissions: string[]): boolean => {
        for (const permission of permissions) {
          const [resource, action] = permission.split('.')
          if (resource && action && roleHasPermission(request.member!.role, resource, action)) {
            return true
          }
        }
        return false
      }

      request.hasAllPermissions = (permissions: string[]): boolean => {
        for (const permission of permissions) {
          const [resource, action] = permission.split('.')
          if (!resource || !action || !roleHasPermission(request.member!.role, resource, action)) {
            return false
          }
        }
        return true
      }

      request.canManageRole = (targetRole: HappyBarRole): boolean => {
        return ROLE_HIERARCHY[request.member!.role] > ROLE_HIERARCHY[targetRole]
      }

      return
    }
    
    
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>
    })

    if (!session) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }

    // Check if user has an active organization
    if (!session.session.activeOrganizationId) {
      throw new AppError('No active organization', ErrorCode.FORBIDDEN, 403)
    }

    // Get organization membership and role
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId
      },
      include: {
        organization: true
      }
    })

    if (!membership) {
      throw new AppError('Not a member of this organization', ErrorCode.FORBIDDEN, 403)
    }

    // Attach auth data to request
    request.authUser = session.user
    request.organization = {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug
    }
    request.member = {
      id: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      role: membership.role as HappyBarRole
    }
    request.session = session.session

    // Add permission checking methods using our permission matrix
    request.hasPermission = (resource: string, action: string): boolean => {
      return roleHasPermission(request.member!.role, resource, action)
    }

    request.hasAnyPermission = (permissions: string[]): boolean => {
      for (const permission of permissions) {
        const [resource, action] = permission.split('.')
        if (resource && action && roleHasPermission(request.member!.role, resource, action)) {
          return true
        }
      }
      return false
    }

    request.hasAllPermissions = (permissions: string[]): boolean => {
      for (const permission of permissions) {
        const [resource, action] = permission.split('.')
        if (!resource || !action || !roleHasPermission(request.member!.role, resource, action)) {
          return false
        }
      }
      return true
    }

    request.canManageRole = (targetRole: HappyBarRole): boolean => {
      return ROLE_HIERARCHY[request.member!.role] > ROLE_HIERARCHY[targetRole]
    }

    // Middleware completed successfully
  } catch (error) {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code
      })
    } else {
      console.error('Auth middleware error:', error)
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR
      })
    }
  }
  }
}

/**
 * Default auth middleware that works with the current route setup
 * Uses the prisma instance from the fastify decorator pattern
 */
export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  
  // Create the middleware with prisma access
  const middleware = createAuthMiddleware(request.server.prisma)
  return middleware(request, reply)
}

/**
 * Simple permission requirement middleware factory
 */
export const requirePermission = (resource: string, action: string) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      // Assert that the request has been authenticated
      assertAuthenticatedRequest(request)
      
      const hasPermission = request.hasPermission(resource, action)
      if (!hasPermission) {
        const userRole = request.member.role
        const readableAction = action.replace(/_/g, ' ')
        const readableResource = resource.replace(/_/g, ' ')
        
        throw new AppError(
          `Access denied: You need '${readableResource}.${readableAction}' permission to perform this action. Your current role '${userRole}' does not have sufficient privileges. Contact your administrator to request additional permissions.`,
          ErrorCode.FORBIDDEN,
          403
        )
      }
    } catch (error) {
      if (error instanceof AppError) {
        const userRole = request.member?.role || 'unknown'
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
          context: {
            userRole,
            requiredPermission: error.message.includes('permissions:') ? error.message.split('permissions: ')[1]?.split(' ')[0] : 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      } else {
        console.error('Permission check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Multiple permission requirement middleware factory
 */
export const requireAnyPermission = (permissions: string[]) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      assertAuthenticatedRequest(request)
      const hasAnyPermission = request.hasAnyPermission(permissions)
      if (!hasAnyPermission) {
        throw new AppError(
          `Insufficient permissions: requires one of [${permissions.join(', ')}]`,
          ErrorCode.FORBIDDEN,
          403
        )
      }
    } catch (error) {
      if (error instanceof AppError) {
        const userRole = request.member?.role || 'unknown'
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
          context: {
            userRole,
            requiredPermission: error.message.includes('permissions:') ? error.message.split('permissions: ')[1]?.split(' ')[0] : 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      } else {
        console.error('Permission check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Role requirement middleware factory
 */
export const requireRole = (role: HappyBarRole) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      assertAuthenticatedRequest(request)
      if (request.member.role !== role) {
        throw new AppError(
          `Insufficient role: requires ${role}`,
          ErrorCode.FORBIDDEN,
          403
        )
      }
    } catch (error) {
      if (error instanceof AppError) {
        const userRole = request.member?.role || 'unknown'
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
          context: {
            userRole,
            requiredPermission: error.message.includes('permissions:') ? error.message.split('permissions: ')[1]?.split(' ')[0] : 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      } else {
        console.error('Role check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Minimum role requirement middleware factory
 */
export const requireMinimumRole = (minimumRole: HappyBarRole) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      assertAuthenticatedRequest(request)
      if (ROLE_HIERARCHY[request.member.role] < ROLE_HIERARCHY[minimumRole]) {
        throw new AppError(
          `Insufficient role level: requires at least ${minimumRole}`,
          ErrorCode.FORBIDDEN,
          403
        )
      }
    } catch (error) {
      if (error instanceof AppError) {
        const userRole = request.member?.role || 'unknown'
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
          context: {
            userRole,
            requiredPermission: error.message.includes('permissions:') ? error.message.split('permissions: ')[1]?.split(' ')[0] : 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      } else {
        console.error('Role level check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}
