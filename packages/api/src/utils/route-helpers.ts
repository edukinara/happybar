import { FastifyRequest, FastifyReply, RouteHandler } from 'fastify'
import type { AuthenticatedRequest } from '../types/auth-guards'

/**
 * Type-safe route handler wrapper for authenticated routes
 */
export type AuthenticatedRouteHandler = (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => Promise<any>

/**
 * Wraps an authenticated route handler to work with Fastify's typing system
 */
export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    return handler(request as AuthenticatedRequest, reply)
  }
}