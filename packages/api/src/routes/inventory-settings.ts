import { AppError, ErrorCode } from '@happy-bar/types'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'

// Validation schemas
const policySchema = z.object({
  allowOverDepletion: z.boolean(),
  warningThresholds: z.object({
    low: z.number().min(1).max(100),
    critical: z.number().min(1).max(100),
  }),
})

const inventorySettingsSchema = z.object({
  webhookPolicy: policySchema,
  cronSyncPolicy: policySchema,
  manualPolicy: policySchema,
  enableAutoConversion: z.boolean(),
  conversionFallback: z.enum(['error', 'warn', 'ignore']),
  enableOverDepletionLogging: z.boolean(),
  enableUnitConversionLogging: z.boolean(),
  auditLogRetentionDays: z.number().min(1).max(365),
})

const updateInventorySettingsSchema = inventorySettingsSchema.partial()

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

// Default settings
const getDefaultSettings = () => ({
  webhookPolicy: {
    allowOverDepletion: true,
    warningThresholds: { low: 20, critical: 10 },
  },
  cronSyncPolicy: {
    allowOverDepletion: false,
    warningThresholds: { low: 20, critical: 10 },
  },
  manualPolicy: {
    allowOverDepletion: false,
    warningThresholds: { low: 20, critical: 10 },
  },
  enableAutoConversion: true,
  conversionFallback: 'warn' as const,
  enableOverDepletionLogging: true,
  enableUnitConversionLogging: false,
  auditLogRetentionDays: 90,
})

export const inventorySettingsRoutes: FastifyPluginAsync = async function (
  fastify
) {
  // Get inventory settings
  // Get inventory settings
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('admin', 'settings')],
    },
    async (request: any, _reply) => {
      const organizationId = getOrganizationId(request)

      const settings = await fastify.prisma.inventorySettings.findUnique({
        where: { organizationId },
      })

      // If no settings exist, return defaults
      if (!settings) {
        const defaults = getDefaultSettings()
        return {
          success: true,
          data: defaults,
        }
      }

      // Parse JSON fields and return structured settings
      const result = {
        webhookPolicy: settings.webhookPolicy as any,
        cronSyncPolicy: settings.cronSyncPolicy as any,
        manualPolicy: settings.manualPolicy as any,
        enableAutoConversion: settings.enableAutoConversion,
        conversionFallback: settings.conversionFallback,
        enableOverDepletionLogging: settings.enableOverDepletionLogging,
        enableUnitConversionLogging: settings.enableUnitConversionLogging,
        auditLogRetentionDays: settings.auditLogRetentionDays,
      }

      return {
        success: true,
        data: result,
      }
    }
  )

  // Create or update inventory settings
  // Update inventory settings
  fastify.put(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('admin', 'settings')],
    },
    async (request: any, _reply) => {
      const organizationId = getOrganizationId(request)
      const data = inventorySettingsSchema.parse(request.body)

      // Validate thresholds make sense (critical should be <= low)
      const policies = [
        data.webhookPolicy,
        data.cronSyncPolicy,
        data.manualPolicy,
      ]
      for (const policy of policies) {
        if (policy.warningThresholds.critical > policy.warningThresholds.low) {
          throw new AppError(
            'Critical threshold must be less than or equal to low threshold',
            ErrorCode.VALIDATION_ERROR,
            400
          )
        }
      }

      const settings = await fastify.prisma.inventorySettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          webhookPolicy: data.webhookPolicy,
          cronSyncPolicy: data.cronSyncPolicy,
          manualPolicy: data.manualPolicy,
          enableAutoConversion: data.enableAutoConversion,
          conversionFallback: data.conversionFallback,
          enableOverDepletionLogging: data.enableOverDepletionLogging,
          enableUnitConversionLogging: data.enableUnitConversionLogging,
          auditLogRetentionDays: data.auditLogRetentionDays,
        },
        update: {
          webhookPolicy: data.webhookPolicy,
          cronSyncPolicy: data.cronSyncPolicy,
          manualPolicy: data.manualPolicy,
          enableAutoConversion: data.enableAutoConversion,
          conversionFallback: data.conversionFallback,
          enableOverDepletionLogging: data.enableOverDepletionLogging,
          enableUnitConversionLogging: data.enableUnitConversionLogging,
          auditLogRetentionDays: data.auditLogRetentionDays,
        },
      })

      // Parse JSON fields for response
      const result = {
        id: settings.id,
        webhookPolicy: settings.webhookPolicy as any,
        cronSyncPolicy: settings.cronSyncPolicy as any,
        manualPolicy: settings.manualPolicy as any,
        enableAutoConversion: settings.enableAutoConversion,
        conversionFallback: settings.conversionFallback,
        enableOverDepletionLogging: settings.enableOverDepletionLogging,
        enableUnitConversionLogging: settings.enableUnitConversionLogging,
        auditLogRetentionDays: settings.auditLogRetentionDays,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      }

      return {
        success: true,
        data: result,
      }
    }
  )

  // Partially update inventory settings
  fastify.patch('/', async (request, _reply) => {
    const organizationId = getOrganizationId(request)
    const data = updateInventorySettingsSchema.parse(request.body)

    // Check if settings exist
    const existingSettings = await fastify.prisma.inventorySettings.findUnique({
      where: { organizationId },
    })

    if (!existingSettings) {
      throw new AppError(
        'Inventory settings not found. Use PUT to create new settings.',
        ErrorCode.NOT_FOUND,
        404
      )
    }

    // Validate thresholds if any policy is being updated
    const policiesToValidate = []
    if (data.webhookPolicy) policiesToValidate.push(data.webhookPolicy)
    if (data.cronSyncPolicy) policiesToValidate.push(data.cronSyncPolicy)
    if (data.manualPolicy) policiesToValidate.push(data.manualPolicy)

    for (const policy of policiesToValidate) {
      if (policy.warningThresholds.critical > policy.warningThresholds.low) {
        throw new AppError(
          'Critical threshold must be less than or equal to low threshold',
          ErrorCode.VALIDATION_ERROR,
          400
        )
      }
    }

    // Build update data object
    const updateData: any = {}
    if (data.webhookPolicy !== undefined)
      updateData.webhookPolicy = data.webhookPolicy
    if (data.cronSyncPolicy !== undefined)
      updateData.cronSyncPolicy = data.cronSyncPolicy
    if (data.manualPolicy !== undefined)
      updateData.manualPolicy = data.manualPolicy
    if (data.enableAutoConversion !== undefined)
      updateData.enableAutoConversion = data.enableAutoConversion
    if (data.conversionFallback !== undefined)
      updateData.conversionFallback = data.conversionFallback
    if (data.enableOverDepletionLogging !== undefined)
      updateData.enableOverDepletionLogging = data.enableOverDepletionLogging
    if (data.enableUnitConversionLogging !== undefined)
      updateData.enableUnitConversionLogging = data.enableUnitConversionLogging
    if (data.auditLogRetentionDays !== undefined)
      updateData.auditLogRetentionDays = data.auditLogRetentionDays

    const settings = await fastify.prisma.inventorySettings.update({
      where: { organizationId },
      data: updateData,
    })

    // Parse JSON fields for response
    const result = {
      id: settings.id,
      webhookPolicy: settings.webhookPolicy as any,
      cronSyncPolicy: settings.cronSyncPolicy as any,
      manualPolicy: settings.manualPolicy as any,
      enableAutoConversion: settings.enableAutoConversion,
      conversionFallback: settings.conversionFallback,
      enableOverDepletionLogging: settings.enableOverDepletionLogging,
      enableUnitConversionLogging: settings.enableUnitConversionLogging,
      auditLogRetentionDays: settings.auditLogRetentionDays,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    }

    return {
      success: true,
      data: result,
    }
  })

  // Reset to default settings
  // Reset inventory settings to defaults
  fastify.post(
    '/reset',
    {
      preHandler: [authMiddleware, requirePermission('admin', 'settings')],
    },
    async (request: any, _reply) => {
      const organizationId = getOrganizationId(request)
      const defaults = getDefaultSettings()

      const settings = await fastify.prisma.inventorySettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          ...defaults,
        },
        update: defaults,
      })

      // Parse JSON fields for response
      const result = {
        id: settings.id,
        webhookPolicy: settings.webhookPolicy as any,
        cronSyncPolicy: settings.cronSyncPolicy as any,
        manualPolicy: settings.manualPolicy as any,
        enableAutoConversion: settings.enableAutoConversion,
        conversionFallback: settings.conversionFallback,
        enableOverDepletionLogging: settings.enableOverDepletionLogging,
        enableUnitConversionLogging: settings.enableUnitConversionLogging,
        auditLogRetentionDays: settings.auditLogRetentionDays,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      }

      return {
        success: true,
        data: result,
        message: 'Settings reset to defaults',
      }
    }
  )
}
