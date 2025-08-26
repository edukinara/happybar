import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify'

/**
 * Helper type for authenticated route handlers
 * This ensures the request has been processed by authMiddleware
 */
export type AuthenticatedRouteHandler<T extends RouteGenericInterface = RouteGenericInterface> = (
  request: FastifyRequest<T> & {
    authUser: NonNullable<FastifyRequest['authUser']>
    organization: NonNullable<FastifyRequest['organization']>
    member: NonNullable<FastifyRequest['member']>
    session: NonNullable<FastifyRequest['session']>
    hasPermission: NonNullable<FastifyRequest['hasPermission']>
    hasAnyPermission: NonNullable<FastifyRequest['hasAnyPermission']>
    hasAllPermissions: NonNullable<FastifyRequest['hasAllPermissions']>
    canManageRole: NonNullable<FastifyRequest['canManageRole']>
  },
  reply: FastifyReply
) => Promise<any>

/**
 * Helper to safely get organization ID from authenticated request
 */
export function getOrganizationId(request: FastifyRequest): string {
  if (!request.organization?.id) {
    throw new Error('Organization not found in request')
  }
  return request.organization.id
}

/**
 * Helper to safely get user ID from authenticated request
 */
export function getUserId(request: FastifyRequest): string {
  if (!request.authUser?.id) {
    throw new Error('User not found in request')
  }
  return request.authUser.id
}