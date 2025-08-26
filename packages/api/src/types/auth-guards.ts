import { FastifyRequest } from 'fastify'
import type { HappyBarRole } from '@happy-bar/types'

// Import the module augmentation to ensure types are available
import '../types/request'

/**
 * Type guard to check if a FastifyRequest has been authenticated by our middleware
 */
export function isAuthenticatedRequest(request: FastifyRequest): request is AuthenticatedRequest {
  return !!(
    request.authUser &&
    request.organization &&
    request.member &&
    request.session &&
    request.hasPermission &&
    request.hasAnyPermission &&
    request.hasAllPermissions &&
    request.canManageRole
  )
}

/**
 * Asserts that a request has been authenticated by our middleware
 * Throws an error if the request is not authenticated
 */
export function assertAuthenticatedRequest(request: FastifyRequest): asserts request is AuthenticatedRequest {
  if (!isAuthenticatedRequest(request)) {
    throw new Error('Request has not been authenticated. Make sure authMiddleware is applied before this route handler.')
  }
}

/**
 * Type for requests that have been processed by our auth middleware
 * All auth properties are guaranteed to exist
 */
export type AuthenticatedRequest = FastifyRequest & {
  authUser: NonNullable<FastifyRequest['authUser']>
  organization: NonNullable<FastifyRequest['organization']>
  member: NonNullable<FastifyRequest['member']>
  session: NonNullable<FastifyRequest['session']>
  hasPermission: NonNullable<FastifyRequest['hasPermission']>
  hasAnyPermission: NonNullable<FastifyRequest['hasAnyPermission']>
  hasAllPermissions: NonNullable<FastifyRequest['hasAllPermissions']>
  canManageRole: NonNullable<FastifyRequest['canManageRole']>
}

/**
 * Helper function to safely get organization ID from authenticated request
 */
export function getOrganizationId(request: FastifyRequest): string {
  assertAuthenticatedRequest(request)
  return request.organization.id
}

/**
 * Helper function to safely get user ID from authenticated request
 */
export function getUserId(request: FastifyRequest): string {
  assertAuthenticatedRequest(request)
  return request.authUser.id
}

/**
 * Helper function to safely get user role from authenticated request
 */
export function getUserRole(request: FastifyRequest): HappyBarRole {
  assertAuthenticatedRequest(request)
  return request.member.role
}

/**
 * Helper function to check permissions on authenticated request
 */
export function checkPermission(request: FastifyRequest, resource: string, action: string): boolean {
  assertAuthenticatedRequest(request)
  return request.hasPermission(resource, action)
}