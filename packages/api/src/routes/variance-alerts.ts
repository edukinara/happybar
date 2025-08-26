import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AlertNotificationService } from '../services/alert-notifications'
import { VarianceAlertService } from '../services/variance-alerts'
import { authMiddleware, requirePermission, requireAnyPermission, AuthenticatedRequest } from '../middleware/auth-simple'

const alertConfigSchema = z.object({
  usageVarianceThreshold: z.number().min(0).max(100).optional(),
  lowEfficiencyThreshold: z.number().min(0).max(100).optional(),
  overuseThreshold: z.number().min(0).max(100).optional(),
  costImpactThreshold: z.number().min(0).optional(),
  enableUsageVarianceAlerts: z.boolean().optional(),
  enableEfficiencyAlerts: z.boolean().optional(),
  enableOveruseAlerts: z.boolean().optional(),
  cooldownHours: z.number().min(1).max(168).optional(), // 1 hour to 1 week
})

function getOrganizationId(request: any): string {
  const organization = request.organization
  if (!organization) {
    throw new Error('Organization not found')
  }
  return organization.id
}

export default async function varianceAlertsRoutes(fastify: FastifyInstance) {
  const alertService = new VarianceAlertService(fastify.prisma)
  const notificationService = new AlertNotificationService(fastify.prisma)

  // Get variance alert configuration
  fastify.get('/config', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const config = await alertService.getAlertConfig(organizationId)

      return { success: true, data: config }
    } catch (error) {
      console.error('Failed to get alert config:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get alert configuration',
      })
    }
  })

  // Update variance alert configuration
  fastify.put('/config', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const config = alertConfigSchema.parse(request.body)

      await alertService.updateAlertConfig(organizationId, config)

      return {
        success: true,
        message: 'Alert configuration updated successfully',
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid configuration data',
          details: 'errors' in error ? error.errors : [],
        })
      }

      console.error('Failed to update alert config:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to update alert configuration',
      })
    }
  })

  // Run manual alert evaluation
  // Manually evaluate variance alerts
  fastify.post('/evaluate', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const result =
        await alertService.runAutomatedAlertEvaluation(organizationId)

      return {
        success: true,
        data: {
          message: `Evaluated ${result.alertsEvaluated} products and created ${result.alertsCreated} alerts`,
          ...result,
        },
      }
    } catch (error) {
      console.error('Failed to evaluate alerts:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to evaluate variance alerts',
      })
    }
  })

  // Get active variance alerts
  // Get variance alerts
  fastify.get('/', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const { status = 'ACTIVE', limit = 50, offset = 0 } = request.query as any

      const alerts = await fastify.prisma.alert.findMany({
        where: {
          organizationId,
          type: {
            in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
          },
          status,
        },
        include: {
          rule: {
            include: {
              product: true,
            },
          },
          inventoryItem: {
            include: {
              product: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      })

      const total = await fastify.prisma.alert.count({
        where: {
          organizationId,
          type: {
            in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
          },
          status,
        },
      })

      return {
        success: true,
        data: {
          alerts,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: Number(offset) + alerts.length < total,
          },
        },
      }
    } catch (error) {
      console.error('Failed to get alerts:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get variance alerts',
      })
    }
  })

  // Acknowledge an alert
  // Acknowledge alert
  fastify.put('/:alertId/acknowledge', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const { alertId } = request.params as { alertId: string }
      const { userId } = request.body as { userId?: string }

      const alert = await fastify.prisma.alert.findFirst({
        where: {
          id: alertId,
          organizationId,
        },
      })

      if (!alert) {
        return reply.code(404).send({
          success: false,
          error: 'Alert not found',
        })
      }

      await fastify.prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        },
      })

      return { success: true, message: 'Alert acknowledged successfully' }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to acknowledge alert',
      })
    }
  })

  // Resolve an alert
  // Resolve alert
  fastify.put('/:alertId/resolve', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)
      const { alertId } = request.params as { alertId: string }
      const { userId } = request.body as { userId?: string }

      const alert = await fastify.prisma.alert.findFirst({
        where: {
          id: alertId,
          organizationId,
        },
      })

      if (!alert) {
        return reply.code(404).send({
          success: false,
          error: 'Alert not found',
        })
      }

      await fastify.prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      })

      return { success: true, message: 'Alert resolved successfully' }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to resolve alert',
      })
    }
  })

  // Get alert summary statistics
  // Get alert summary
  fastify.get('/summary', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, reply) => {
    try {
      const organizationId = getOrganizationId(request)

      const [activeAlerts, criticalAlerts, alertsByType, recentAlerts] =
        await Promise.all([
          // Active alerts count
          fastify.prisma.alert.count({
            where: {
              organizationId,
              type: {
                in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
              },
              status: 'ACTIVE',
            },
          }),

          // Critical alerts count
          fastify.prisma.alert.count({
            where: {
              organizationId,
              type: {
                in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
              },
              status: 'ACTIVE',
              severity: 'CRITICAL',
            },
          }),

          // Alerts grouped by type
          fastify.prisma.alert.groupBy({
            by: ['type'],
            where: {
              organizationId,
              type: {
                in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
              },
              status: 'ACTIVE',
            },
            _count: {
              id: true,
            },
          }),

          // Recent alerts (last 24 hours)
          fastify.prisma.alert.count({
            where: {
              organizationId,
              type: {
                in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          }),
        ])

      return {
        success: true,
        data: {
          activeAlerts,
          criticalAlerts,
          recentAlerts,
          alertsByType: alertsByType.reduce(
            (acc, item) => {
              acc[item.type] = item._count.id
              return acc
            },
            {} as Record<string, number>
          ),
        },
      }
    } catch (error) {
      console.error('Failed to get alert summary:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get alert summary',
      })
    }
  })

  // Get recent alert notifications for dashboard
  // Get notifications
  fastify.get('/notifications', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest
    try {
      const organizationId = getOrganizationId(request)
      const { limit = 10 } = request.query as { limit?: number }

      const notifications = await notificationService.getRecentAlerts(
        organizationId,
        Number(limit)
      )

      return {
        success: true,
        data: notifications,
      }
    } catch (error) {
      console.error('Failed to get alert notifications:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get alert notifications',
      })
    }
  })
}
