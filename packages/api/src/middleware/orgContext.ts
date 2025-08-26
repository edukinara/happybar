import type { FastifyRequest, FastifyReply } from 'fastify'
import { ErrorCode } from '@happy-bar/types'
import { prisma } from '@happy-bar/database'

/**
 * Middleware to set organization context for all requests
 * Ensures all queries are properly scoped to the current organization
 */
export async function orgContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get organization ID from various sources
    const orgIdFromHeader = request.headers['x-organization-id'] as string
    const orgIdFromQuery = (request.query as any)?.organizationId
    const orgIdFromSession = (request as any).user?.activeOrganizationId
    
    // Priority: Header > Query > Session
    const organizationId = orgIdFromHeader || orgIdFromQuery || orgIdFromSession
    
    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: ErrorCode.VALIDATION_ERROR,
        message: 'Organization context is required. Please specify an organization.'
      })
    }

    // Verify user has access to this organization
    if ((request as any).user?.id) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: (request as any).user.id,
          organizationId: organizationId
        }
      })

      if (!membership) {
        return reply.code(403).send({
          success: false,
          error: ErrorCode.FORBIDDEN,
          message: 'You do not have access to this organization'
        })
      }

      // Attach organization and member info to request
      (request as any).organizationId = organizationId
      (request as any).organization = {
        id: organizationId,
        role: membership.role
      }
    }
  } catch (error) {
    console.error('Organization context middleware error:', error)
    return reply.code(500).send({
      success: false,
      error: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to establish organization context'
    })
  }
}

/**
 * Helper to get organization ID from request
 */
export function getOrganizationId(request: FastifyRequest): string {
  const orgId = (request as any).organizationId
  if (!orgId) {
    throw new Error('Organization ID not found in request context')
  }
  return orgId
}

/**
 * Helper to verify organization access
 */
export async function verifyOrgAccess(
  request: FastifyRequest,
  requiredRole?: string
): Promise<boolean> {
  const org = (request as any).organization
  if (!org) return false
  
  if (requiredRole) {
    // Check if user has required role
    const roleHierarchy = {
      viewer: 1,
      staff: 2,
      supervisor: 3,
      buyer: 4,
      inventory_manager: 5,
      manager: 6,
      admin: 7,
      owner: 8
    }
    
    const userLevel = roleHierarchy[org.role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 999
    
    return userLevel >= requiredLevel
  }
  
  return true
}