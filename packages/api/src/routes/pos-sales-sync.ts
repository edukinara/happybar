import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { POSSalesSyncService } from '../services/pos-sales-sync'

const syncRequestSchema = z.object({
  integrationId: z.cuid().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  forced: z.boolean().default(false),
})

const posSalesSync: FastifyPluginAsync = async (fastify) => {
  const syncService = new POSSalesSyncService(fastify.prisma)

  // Manual sync endpoint for a specific integration
  fastify.post('/:integrationId', async (request, reply) => {
    try {
      const integrationId = z
        .cuid()
        .parse((request.params as any).integrationId)
      const body = syncRequestSchema.parse(request.body || {})

      const organizationId = request.organization?.id
      if (!organizationId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          'Organization context required'
        )
      }

      // Verify integration belongs to organization
      const integration = await fastify.prisma.pOSIntegration.findFirst({
        where: {
          id: integrationId,
          organizationId,
        },
      })

      if (!integration) {
        throw new AppError(ErrorCode.NOT_FOUND, 'POS integration not found')
      }

      const completedCount = await fastify.prisma.inventoryCount.findFirst({
        where: {
          status: 'APPROVED',
          organizationId: integration.organizationId,
        },
        orderBy: {
          approvedAt: 'desc',
        },
      })
      if (!completedCount?.approvedAt || completedCount.approvedAt === null) {
        try {
          // Create sync log entry
          await fastify.prisma.syncLog.create({
            data: {
              organizationId: integration.organizationId,
              syncType: 'SALES',
              status: 'SUCCESS',
              recordsProcessed: 0,
              recordsFailed: 0,
              errorMessage: 'First Count not run yet',
              startDate: new Date(),
              endDate: new Date(),
              completedAt: new Date(),
            },
          })
        } catch (_error) {}
        return {
          integrationId: integration.id,
          integrationName: integration.name,
          success: true,
          processed: 0,
          newSales: 0,
        }
      }

      const result = await syncService.syncSalesForIntegration(integrationId, {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        forced: body.forced,
        lastCountDate: completedCount.approvedAt,
      })

      reply.send({
        integrationId,
        integrationName: integration.name,
        ...result,
        body,
      })
    } catch (error) {
      console.error('Manual sales sync error:', error)

      if (error instanceof AppError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
        })
      } else {
        reply.status(500).send({
          success: false,
          error: 'Internal server error during sales sync',
        })
      }
    }
  })

  // Bulk sync endpoint for all integrations in an organization
  fastify.post('/', async (request, reply) => {
    try {
      const body = syncRequestSchema.parse(request.body || {})

      const organizationId = request.organization?.id
      if (!organizationId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          'Organization context required'
        )
      }

      const result = await syncService.syncAllIntegrations({
        organizationId,
        forced: body.forced,
      })

      reply.send({
        organizationId,
        ...result,
      })
    } catch (error) {
      console.error('Bulk sales sync error:', error)

      if (error instanceof AppError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
        })
      } else {
        reply.status(500).send({
          success: false,
          error: 'Internal server error during bulk sales sync',
        })
      }
    }
  })

  // Get sync status for integrations
  fastify.get('/status', async (request, reply) => {
    try {
      const organizationId = request.organization?.id
      if (!organizationId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          'Organization context required'
        )
      }

      const integrations = await fastify.prisma.pOSIntegration.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          lastSalesSyncAt: true,
          syncStatus: true,
          syncErrors: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          lastSalesSyncAt: 'desc',
        },
      })

      reply.send({
        integrations: integrations.map((integration) => ({
          id: integration.id,
          name: integration.name,
          type: integration.type,
          lastSalesSyncAt: integration.lastSalesSyncAt,
          syncStatus: integration.syncStatus,
          hasErrors: integration.syncErrors
            ? Array.isArray(integration.syncErrors) &&
              integration.syncErrors.length > 0
            : false,
          errorCount:
            integration.syncErrors && Array.isArray(integration.syncErrors)
              ? integration.syncErrors.length
              : 0,
          daysSinceLastSync: integration.lastSalesSyncAt
            ? Math.floor(
                (Date.now() - integration.lastSalesSyncAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        })),
      })
    } catch (error) {
      console.error('Sync status error:', error)
      reply.status(500).send({
        success: false,
        error: 'Failed to get sync status',
      })
    }
  })

  // Cron endpoint (public, no auth required) for automated syncing
  fastify.post(
    '/cron',
    {
      preHandler: async (request, reply) => {
        // Skip normal authentication for cron jobs
        return
      },
    },
    async (request, reply) => {
      try {
        // Optional: Add API key or secret validation for cron endpoint security
        const cronSecret = request.headers['x-cron-secret'] as string
        const expectedSecret = process.env.CRON_SECRET || 'default-cron-secret'

        if (cronSecret !== expectedSecret) {
          reply.status(401).send({
            success: false,
            error: 'Invalid cron secret',
          })
          return
        }

        const result = await syncService.syncAllIntegrations({
          forced: false, // Use incremental sync for cron jobs
        })

        reply.send({
          timestamp: new Date().toISOString(),
          ...result,
        })
      } catch (error) {
        console.error('Cron sales sync error:', error)
        reply.status(500).send({
          success: false,
          error: 'Internal server error during scheduled sales sync',
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}

export default posSalesSync
