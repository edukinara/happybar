import { PrismaClient } from '@happy-bar/database'
import { InventorySettingsService } from './inventory-settings'

export interface AuditEventData {
  [key: string]: any
}

export interface OverDepletionEventData extends AuditEventData {
  productName: string
  originalQuantity: number
  requestedQuantity: number
  resultingQuantity: number
  allowedByPolicy: boolean
  warningThreshold?: number
  location?: string
  externalOrderId?: string
}

export interface UnitConversionEventData extends AuditEventData {
  productName: string
  fromUnit: string
  toUnit: string
  fromAmount: number
  toAmount: number
  conversionRate?: number
  source: string
  success: boolean
  error?: string
}

export interface InventoryAdjustmentEventData extends AuditEventData {
  productName: string
  oldQuantity: number
  newQuantity: number
  adjustmentAmount: number
  reason: string
  location?: string
}

export interface InventoryDepletionEventData extends AuditEventData {
  productName: string
  previousQuantity: number
  depletedQuantity: number
  newQuantity: number
  locationId?: string
  itemName?: string
  source?: string
}

export class AuditLoggingService {
  private prisma: PrismaClient
  private settingsService: InventorySettingsService

  constructor(prisma: PrismaClient, settingsService?: InventorySettingsService) {
    this.prisma = prisma
    this.settingsService = settingsService || new InventorySettingsService(prisma)
  }

  /**
   * Log an over-depletion event if enabled in settings
   */
  async logOverDepletionEvent(
    organizationId: string,
    productId: string,
    eventData: OverDepletionEventData,
    options?: {
      recipeId?: string
      userId?: string
      source?: string
      externalOrderId?: string
    }
  ): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings(organizationId)
      
      if (!settings.enableOverDepletionLogging) {
        return // Logging disabled
      }

      await this.prisma.auditLog.create({
        data: {
          organizationId,
          eventType: 'inventory_over_depletion',
          productId,
          recipeId: options?.recipeId,
          userId: options?.userId,
          source: options?.source,
          externalOrderId: options?.externalOrderId,
          eventData: eventData as any,
        },
      })
    } catch (error) {
      // Don't let audit logging failures break the main operation
      console.error('Failed to log over-depletion event:', error)
    }
  }

  /**
   * Log a regular inventory depletion event
   */
  async logInventoryDepletionEvent(
    organizationId: string,
    productId: string,
    eventData: InventoryDepletionEventData,
    options?: {
      recipeId?: string
      userId?: string
      source?: string
      externalOrderId?: string
    }
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          eventType: 'inventory_depletion',
          productId,
          recipeId: options?.recipeId,
          userId: options?.userId,
          source: options?.source,
          externalOrderId: options?.externalOrderId,
          eventData: eventData as any,
        },
      })
    } catch (error) {
      // Don't let audit logging failures break the main operation
      console.error('Failed to log inventory depletion event:', error)
    }
  }

  /**
   * Log a unit conversion event if enabled in settings
   */
  async logUnitConversionEvent(
    organizationId: string,
    productId: string,
    eventData: UnitConversionEventData,
    options?: {
      recipeId?: string
      userId?: string
      source?: string
      externalOrderId?: string
    }
  ): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings(organizationId)
      
      if (!settings.enableUnitConversionLogging) {
        return // Logging disabled
      }

      await this.prisma.auditLog.create({
        data: {
          organizationId,
          eventType: 'unit_conversion',
          productId,
          recipeId: options?.recipeId,
          userId: options?.userId,
          source: options?.source,
          externalOrderId: options?.externalOrderId,
          eventData: eventData as any,
        },
      })
    } catch (error) {
      // Don't let audit logging failures break the main operation
      console.error('Failed to log unit conversion event:', error)
    }
  }

  /**
   * Log an inventory adjustment event
   */
  async logInventoryAdjustmentEvent(
    organizationId: string,
    productId: string,
    eventData: InventoryAdjustmentEventData,
    options?: {
      userId?: string
      source?: string
    }
  ): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings(organizationId)
      
      // For now, always log inventory adjustments (they're important for auditing)
      // This could be made configurable in the future if needed
      
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          eventType: 'inventory_adjustment',
          productId,
          userId: options?.userId,
          source: options?.source || 'manual',
          eventData: eventData as any,
        },
      })
    } catch (error) {
      // Don't let audit logging failures break the main operation
      console.error('Failed to log inventory adjustment event:', error)
    }
  }

  /**
   * Log a general inventory event
   */
  async logInventoryEvent(
    organizationId: string,
    eventType: string,
    eventData: AuditEventData,
    options?: {
      productId?: string
      recipeId?: string
      userId?: string
      source?: string
      externalOrderId?: string
    }
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          eventType,
          productId: options?.productId,
          recipeId: options?.recipeId,
          userId: options?.userId,
          source: options?.source,
          externalOrderId: options?.externalOrderId,
          eventData: eventData as any,
        },
      })
    } catch (error) {
      // Don't let audit logging failures break the main operation
      console.error('Failed to log inventory event:', error)
    }
  }

  /**
   * Get audit logs for an organization with filtering
   */
  async getAuditLogs(
    organizationId: string,
    options?: {
      eventType?: string
      productId?: string
      recipeId?: string
      userId?: string
      source?: string
      externalOrderId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { organizationId }

    if (options?.eventType) where.eventType = options.eventType
    if (options?.productId) where.productId = options.productId
    if (options?.recipeId) where.recipeId = options.recipeId
    if (options?.userId) where.userId = options.userId
    if (options?.source) where.source = options.source
    if (options?.externalOrderId) where.externalOrderId = options.externalOrderId

    if (options?.startDate || options?.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    return await this.prisma.auditLog.findMany({
      where,
      include: {
        product: {
          select: { name: true, sku: true }
        },
        recipe: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    })
  }

  /**
   * Clean up old audit logs based on retention settings
   */
  async cleanupOldLogs(organizationId: string): Promise<number> {
    try {
      const settings = await this.settingsService.getSettings(organizationId)
      const retentionDate = new Date()
      retentionDate.setDate(retentionDate.getDate() - settings.auditLogRetentionDays)

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          organizationId,
          createdAt: {
            lt: retentionDate,
          },
        },
      })

      return result.count
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error)
      return 0
    }
  }

  /**
   * Run cleanup for all organizations (can be called from a cron job)
   */
  async cleanupAllOrganizations(): Promise<{ [organizationId: string]: number }> {
    try {
      // Get all organizations that have audit logs
      const organizations = await this.prisma.organization.findMany({
        where: {
          auditLogs: {
            some: {}
          }
        },
        select: { id: true }
      })

      const results: { [organizationId: string]: number } = {}

      for (const org of organizations) {
        results[org.id] = await this.cleanupOldLogs(org.id)
      }

      return results
    } catch (error) {
      console.error('Failed to cleanup audit logs for all organizations:', error)
      return {}
    }
  }
}