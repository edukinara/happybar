import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission, requireAnyPermission, AuthenticatedRequest } from '../middleware/auth-simple'

// Validation schemas
const createAlertRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCKED', 'EXPIRED', 'VARIANCE']).default('LOW_STOCK'),
  isEnabled: z.boolean().default(true),
  thresholdType: z.enum(['QUANTITY', 'PERCENTAGE', 'DAYS_SUPPLY']).default('QUANTITY'),
  thresholdValue: z.number().positive(),
  locationId: z.string().optional(),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  notifyEmail: z.boolean().default(true),
  notifyDashboard: z.boolean().default(true),
  cooldownHours: z.number().int().min(1).default(24),
})

const updateAlertRuleSchema = createAlertRuleSchema.partial()

const updateAlertStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']),
})

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  const authRequest = request as AuthenticatedRequest
  if (!authRequest.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return authRequest.organization.id
}

function getUserId(request: any): string {
  const authRequest = request as AuthenticatedRequest
  if (!authRequest.authUser?.id) {
    throw new AppError('User not found', ErrorCode.UNAUTHORIZED, 401)
  }
  return authRequest.authUser.id
}

export const alertRoutes: FastifyPluginAsync = async function (fastify) {
  // Get all alert rules
  fastify.get('/rules', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, _reply) => {
    const organizationId = getOrganizationId(request as AuthenticatedRequest)
    
    const rules = await fastify.prisma.alertRule.findMany({
      where: { organizationId },
      include: {
        location: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true }
        },
        product: {
          select: { id: true, name: true, sku: true }
        },
        _count: {
          select: { alerts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return {
      success: true,
      data: rules.map(rule => ({
        ...rule,
        alertCount: rule._count.alerts
      }))
    }
  })

  // Create alert rule
  // Create alert rule
  fastify.post('/rules', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, reply) => {
    const data = request.body as z.infer<typeof createAlertRuleSchema>
    const organizationId = getOrganizationId(request)

    // Validate location, category, and product belong to organization
    if (data.locationId) {
      const location = await fastify.prisma.location.findFirst({
        where: { id: data.locationId, organizationId }
      })
      if (!location) {
        throw new AppError('Location not found', ErrorCode.NOT_FOUND, 404)
      }
    }

    if (data.categoryId) {
      const category = await fastify.prisma.category.findFirst({
        where: { id: data.categoryId, organizationId }
      })
      if (!category) {
        throw new AppError('Category not found', ErrorCode.NOT_FOUND, 404)
      }
    }

    if (data.productId) {
      const product = await fastify.prisma.product.findFirst({
        where: { id: data.productId, organizationId }
      })
      if (!product) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }
    }

    const rule = await fastify.prisma.alertRule.create({
      data: {
        ...data,
        organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true }
        },
        product: {
          select: { id: true, name: true, sku: true }
        }
      }
    })

    reply.code(201)
    return {
      success: true,
      data: rule
    }
  })

  // Update alert rule
  // Update alert rule
  fastify.put('/rules/:id', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, _reply) => {
    const { id } = request.params as { id: string }
    const data = request.body as z.infer<typeof updateAlertRuleSchema>
    const organizationId = getOrganizationId(request)

    const existingRule = await fastify.prisma.alertRule.findFirst({
      where: { id, organizationId }
    })

    if (!existingRule) {
      throw new AppError('Alert rule not found', ErrorCode.NOT_FOUND, 404)
    }

    const rule = await fastify.prisma.alertRule.update({
      where: { id },
      data,
      include: {
        location: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true }
        },
        product: {
          select: { id: true, name: true, sku: true }
        }
      }
    })

    return {
      success: true,
      data: rule
    }
  })

  // Delete alert rule
  // Delete alert rule
  fastify.delete('/rules/:id', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, _reply) => {
    const { id } = request.params as { id: string }
    const organizationId = getOrganizationId(request)

    const existingRule = await fastify.prisma.alertRule.findFirst({
      where: { id, organizationId }
    })

    if (!existingRule) {
      throw new AppError('Alert rule not found', ErrorCode.NOT_FOUND, 404)
    }

    await fastify.prisma.alertRule.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'Alert rule deleted successfully'
    }
  })

  // Get all alerts
  // Get alerts
  fastify.get('/', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, _reply) => {
    const organizationId = getOrganizationId(request)
    const { status, location, limit = 50, offset = 0 } = request.query as {
      status?: string
      location?: string
      limit?: number
      offset?: number
    }

    const where: any = { organizationId }
    
    if (status) {
      where.status = status
    }

    if (location) {
      where.inventoryItem = {
        locationId: location
      }
    }

    const alerts = await fastify.prisma.alert.findMany({
      where,
      include: {
        rule: {
          select: { 
            id: true, 
            name: true, 
            type: true, 
            thresholdType: true,
            thresholdValue: true
          }
        },
        inventoryItem: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true }
            },
            location: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Active alerts first
        { severity: 'desc' }, // Critical alerts first
        { createdAt: 'desc' }
      ],
      take: Number(limit),
      skip: Number(offset)
    })

    const total = await fastify.prisma.alert.count({ where })

    return {
      success: true,
      data: alerts,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + Number(limit)
      }
    }
  })

  // Update alert status
  // Update alert status
  fastify.put('/:id/status', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, _reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as z.infer<typeof updateAlertStatusSchema>
    const organizationId = getOrganizationId(request)
    const userId = getUserId(request)

    const existingAlert = await fastify.prisma.alert.findFirst({
      where: { id, organizationId }
    })

    if (!existingAlert) {
      throw new AppError('Alert not found', ErrorCode.NOT_FOUND, 404)
    }

    const updateData: any = { status }
    const now = new Date()

    if (status === 'ACKNOWLEDGED') {
      updateData.acknowledgedAt = now
      updateData.acknowledgedBy = userId
    } else if (status === 'RESOLVED') {
      updateData.resolvedAt = now
      updateData.resolvedBy = userId
    }

    const alert = await fastify.prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        rule: {
          select: { 
            id: true, 
            name: true, 
            type: true, 
            thresholdType: true,
            thresholdValue: true
          }
        },
        inventoryItem: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true }
            },
            location: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      }
    })

    return {
      success: true,
      data: alert
    }
  })

  // Bulk update alert status
  // Bulk update alert status
  fastify.put('/bulk-status', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, _reply) => {
    const { alertIds, status } = request.body as {
      alertIds: string[]
      status: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
    }
    const organizationId = getOrganizationId(request)
    const userId = getUserId(request)

    if (!alertIds.length) {
      throw new AppError('No alert IDs provided', ErrorCode.BAD_REQUEST, 400)
    }

    const updateData: any = { status }
    const now = new Date()

    if (status === 'ACKNOWLEDGED') {
      updateData.acknowledgedAt = now
      updateData.acknowledgedBy = userId
    } else if (status === 'RESOLVED') {
      updateData.resolvedAt = now
      updateData.resolvedBy = userId
    }

    const result = await fastify.prisma.alert.updateMany({
      where: {
        id: { in: alertIds },
        organizationId
      },
      data: updateData
    })

    return {
      success: true,
      message: `Updated ${result.count} alerts`,
      count: result.count
    }
  })

  // Get alert summary for dashboard
  // Get alert summary
  fastify.get('/summary', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, _reply) => {
    const organizationId = getOrganizationId(request)
    const { locationId } = request.query as { locationId?: string }

    const where: any = { organizationId }
    
    if (locationId) {
      where.inventoryItem = {
        locationId
      }
    }

    const [
      totalAlerts,
      activeAlerts, 
      criticalAlerts,
      recentAlerts
    ] = await Promise.all([
      fastify.prisma.alert.count({ where }),
      fastify.prisma.alert.count({ where: { ...where, status: 'ACTIVE' } }),
      fastify.prisma.alert.count({ 
        where: { 
          ...where, 
          status: 'ACTIVE', 
          severity: 'CRITICAL' 
        } 
      }),
      fastify.prisma.alert.findMany({
        where: { ...where, status: 'ACTIVE' },
        include: {
          inventoryItem: {
            include: {
              product: { select: { name: true, sku: true } },
              location: { select: { name: true } },
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 5
      })
    ])

    return {
      success: true,
      data: {
        total: totalAlerts,
        active: activeAlerts,
        critical: criticalAlerts,
        recent: recentAlerts
      }
    }
  })

  // Get alert statistics
  // Get alert statistics
  fastify.get('/stats', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.alerts', 'analytics.variance'])]
  }, async (request: any, _reply) => {
    const organizationId = getOrganizationId(request)
    const { locationId } = request.query as { locationId?: string }

    const where: any = { organizationId }
    
    if (locationId) {
      where.inventoryItem = {
        locationId
      }
    }

    const [
      totalAlerts,
      activeAlerts,
      criticalAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      alertsByType,
      alertsByLocation
    ] = await Promise.all([
      fastify.prisma.alert.count({ where }),
      fastify.prisma.alert.count({ where: { ...where, status: 'ACTIVE' } }),
      fastify.prisma.alert.count({ where: { ...where, severity: 'CRITICAL', status: 'ACTIVE' } }),
      fastify.prisma.alert.count({ where: { ...where, status: 'ACKNOWLEDGED' } }),
      fastify.prisma.alert.count({ where: { ...where, status: 'RESOLVED' } }),
      fastify.prisma.alert.groupBy({
        by: ['type'],
        where: { ...where, status: 'ACTIVE' },
        _count: true
      }),
      // Group by location through the inventory item relation
      fastify.prisma.$queryRaw`
        SELECT ii."locationId", COUNT(*)::int as count
        FROM alerts a
        JOIN inventory_items ii ON a."inventoryItemId" = ii.id
        WHERE a."organizationId" = ${organizationId}
        AND a.status = 'ACTIVE'
        GROUP BY ii."locationId"
      `
    ])

    return {
      success: true,
      data: {
        total: totalAlerts,
        active: activeAlerts,
        critical: criticalAlerts,
        acknowledged: acknowledgedAlerts,
        resolved: resolvedAlerts,
        byType: alertsByType.map(item => ({
          type: item.type,
          count: item._count
        })),
        byLocation: (alertsByLocation as any[]).map((item: any) => ({
          locationId: item.locationId,
          count: item.count
        }))
      }
    }
  })

  // Trigger alert check (for background jobs or manual triggers)
  // Manual alert check
  fastify.post('/check', {
    preHandler: [authMiddleware, requirePermission('admin', 'alerts')]
  }, async (request: any, _reply) => {
    const organizationId = getOrganizationId(request)
    const { locationId } = request.body as { locationId?: string }

    try {
      // Import the alert service
      const { AlertService } = await import('../services/alert-service')
      const alertService = new AlertService(fastify.prisma)

      if (locationId) {
        await alertService.checkLocationAlerts(organizationId, locationId)
      } else {
        await alertService.checkInventoryAlerts(organizationId)
      }

      return {
        success: true,
        message: 'Alert check completed successfully'
      }
    } catch (error) {
      fastify.log.error('Alert check failed: %s', error instanceof Error ? error.message : String(error))
      throw new AppError('Alert check failed', ErrorCode.INTERNAL_ERROR, 500)
    }
  })
}