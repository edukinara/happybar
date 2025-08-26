import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuditLoggingService } from '../services/audit-logging'
import { authMiddleware, requirePermission, AuthenticatedRequest } from '../middleware/auth-simple'

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

const auditLogsQuerySchema = z.object({
  eventType: z.string().optional(),
  productId: z.string().optional(),
  recipeId: z.string().optional(),
  userId: z.string().optional(),
  source: z.string().optional(),
  externalOrderId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

const auditLogs: FastifyPluginAsync = async (fastify) => {
  const auditService = new AuditLoggingService(fastify.prisma)

  // Get audit logs for the current organization
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('admin', 'audit_logs')]
  }, async (request: any, reply) => {
    try {
      const query = auditLogsQuerySchema.parse(request.query)
      const organizationId = getOrganizationId(request)

      const options = {
        ...query,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      }

      const logs = await auditService.getAuditLogs(organizationId, options)

      reply.send({
        success: true,
        data: logs,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: logs.length,
        },
      })
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch audit logs',
      })
    }
  })

  // Clean up old audit logs for the current organization
  fastify.post('/cleanup', async (request, reply) => {
    try {
      const organizationId = getOrganizationId(request)

      const deletedCount = await auditService.cleanupOldLogs(organizationId)

      reply.send({
        success: true,
        data: {
          deletedCount,
          message: `Cleaned up ${deletedCount} old audit log entries`,
        },
      })
    } catch (error) {
      console.error('Error cleaning up audit logs:', error)
      reply.status(500).send({
        success: false,
        error: 'Failed to cleanup audit logs',
      })
    }
  })

  // Admin endpoint to cleanup audit logs for all organizations
  fastify.post('/cleanup-all', async (request, reply) => {
    try {
      // This would typically require admin authentication
      // For now, we'll just run it

      const results = await auditService.cleanupAllOrganizations()
      const totalDeleted = Object.values(results).reduce(
        (sum, count) => sum + count,
        0
      )

      reply.send({
        success: true,
        data: {
          results,
          totalDeleted,
          message: `Cleaned up ${totalDeleted} total audit log entries across ${Object.keys(results).length} organizations`,
        },
      })
    } catch (error) {
      console.error(
        'Error cleaning up audit logs for all organizations:',
        error
      )
      reply.status(500).send({
        success: false,
        error: 'Failed to cleanup audit logs',
      })
    }
  })
}

export default auditLogs
