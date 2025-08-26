import { PrismaClient } from '@happy-bar/database'

export class AlertService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check all inventory items against alert rules and create alerts as needed
   */
  async checkInventoryAlerts(organizationId: string): Promise<void> {
    // Get all active alert rules for the organization
    const rules = await this.prisma.alertRule.findMany({
      where: {
        organizationId,
        isEnabled: true,
      },
      include: {
        location: true,
        category: true,
        product: true,
      },
    })

    // Get all inventory items that could trigger alerts
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { organizationId },
      include: {
        product: {
          include: { category: true }
        },
        location: true,
      },
    })

    // Process each rule
    for (const rule of rules) {
      await this.processRule(rule, inventoryItems)
    }
  }

  private async processRule(rule: any, inventoryItems: any[]): Promise<void> {
    // Filter inventory items that match this rule's criteria
    const matchingItems = inventoryItems.filter(item => {
      // Location filter
      if (rule.locationId && item.locationId !== rule.locationId) {
        return false
      }

      // Category filter
      if (rule.categoryId && item.product.categoryId !== rule.categoryId) {
        return false
      }

      // Product filter
      if (rule.productId && item.productId !== rule.productId) {
        return false
      }

      return true
    })

    // Check each matching item against the rule threshold
    for (const item of matchingItems) {
      const shouldAlert = this.evaluateThreshold(rule, item)
      
      if (shouldAlert) {
        await this.createOrUpdateAlert(rule, item)
      } else {
        // Check if there's an existing alert that should be resolved
        await this.resolveAlertIfExists(rule, item)
      }
    }
  }

  private evaluateThreshold(rule: any, inventoryItem: any): boolean {
    const { thresholdType, thresholdValue, type } = rule
    const { currentQuantity, minimumQuantity } = inventoryItem

    switch (type) {
      case 'LOW_STOCK':
        return this.evaluateLowStockThreshold(thresholdType, thresholdValue, currentQuantity, minimumQuantity)
      
      case 'OUT_OF_STOCK':
        return currentQuantity <= 0
      
      case 'OVERSTOCKED':
        return inventoryItem.maximumQuantity && currentQuantity > inventoryItem.maximumQuantity
      
      default:
        return false
    }
  }

  private evaluateLowStockThreshold(
    thresholdType: string,
    thresholdValue: number,
    currentQuantity: number,
    minimumQuantity: number
  ): boolean {
    switch (thresholdType) {
      case 'QUANTITY':
        return currentQuantity <= thresholdValue
      
      case 'PERCENTAGE':
        if (minimumQuantity <= 0) return false
        const percentage = (currentQuantity / minimumQuantity) * 100
        return percentage <= thresholdValue
      
      case 'DAYS_SUPPLY':
        // For now, use simple threshold - could be enhanced with sales data
        return currentQuantity <= thresholdValue
      
      default:
        return false
    }
  }

  private async createOrUpdateAlert(rule: any, inventoryItem: any): Promise<void> {
    const { organizationId } = rule
    
    // Check if there's already an active alert for this rule and inventory item
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        organizationId,
        ruleId: rule.id,
        inventoryItemId: inventoryItem.id,
        status: 'ACTIVE',
      },
    })

    // Check cooldown period for this rule/item combination
    if (existingAlert || await this.isInCooldownPeriod(rule, inventoryItem)) {
      return
    }

    // Calculate severity based on how far below threshold we are
    const severity = this.calculateSeverity(rule, inventoryItem)
    
    // Generate alert message
    const { title, message } = this.generateAlertMessage(rule, inventoryItem)

    // Create the alert
    await this.prisma.alert.create({
      data: {
        organizationId,
        ruleId: rule.id,
        inventoryItemId: inventoryItem.id,
        type: rule.type,
        severity,
        title,
        message,
        status: 'ACTIVE',
        triggerValue: inventoryItem.currentQuantity,
        thresholdValue: rule.thresholdValue,
      },
    })
  }

  private async resolveAlertIfExists(rule: any, inventoryItem: any): Promise<void> {
    // Find any active alerts that should now be resolved
    await this.prisma.alert.updateMany({
      where: {
        organizationId: rule.organizationId,
        ruleId: rule.id,
        inventoryItemId: inventoryItem.id,
        status: 'ACTIVE',
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    })
  }

  private async isInCooldownPeriod(rule: any, inventoryItem: any): Promise<boolean> {
    const cooldownStart = new Date()
    cooldownStart.setHours(cooldownStart.getHours() - rule.cooldownHours)

    const recentAlert = await this.prisma.alert.findFirst({
      where: {
        organizationId: rule.organizationId,
        ruleId: rule.id,
        inventoryItemId: inventoryItem.id,
        createdAt: {
          gte: cooldownStart,
        },
      },
    })

    return !!recentAlert
  }

  private calculateSeverity(rule: any, inventoryItem: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const { currentQuantity, minimumQuantity } = inventoryItem
    
    if (currentQuantity <= 0) {
      return 'CRITICAL'
    }
    
    if (minimumQuantity > 0) {
      const ratio = currentQuantity / minimumQuantity
      if (ratio <= 0.25) return 'HIGH'
      if (ratio <= 0.5) return 'MEDIUM'
      return 'LOW'
    }
    
    // Fallback for items without minimum quantity set
    if (currentQuantity <= 2) return 'HIGH'
    if (currentQuantity <= 5) return 'MEDIUM'
    return 'LOW'
  }

  private generateAlertMessage(rule: any, inventoryItem: any): { title: string; message: string } {
    const productName = inventoryItem.product.name
    const locationName = inventoryItem.location.name
    const currentQty = inventoryItem.currentQuantity
    const unit = inventoryItem.product.unit
    const minQty = inventoryItem.minimumQuantity

    switch (rule.type) {
      case 'LOW_STOCK':
        return {
          title: `Low Stock Alert: ${productName}`,
          message: `${productName} at ${locationName} is running low. Current: ${currentQty} ${unit}, Minimum: ${minQty} ${unit}`,
        }
      
      case 'OUT_OF_STOCK':
        return {
          title: `Out of Stock: ${productName}`,
          message: `${productName} at ${locationName} is out of stock. Current: ${currentQty} ${unit}`,
        }
      
      case 'OVERSTOCKED':
        return {
          title: `Overstocked: ${productName}`,
          message: `${productName} at ${locationName} is overstocked. Current: ${currentQty} ${unit}`,
        }
      
      default:
        return {
          title: `Alert: ${productName}`,
          message: `${productName} at ${locationName} requires attention.`,
        }
    }
  }

  /**
   * Check specific location for alert conditions
   */
  async checkLocationAlerts(organizationId: string, locationId: string): Promise<void> {
    const rules = await this.prisma.alertRule.findMany({
      where: {
        organizationId,
        isEnabled: true,
        OR: [
          { locationId }, // Rules specific to this location
          { locationId: null }, // Global rules
        ],
      },
      include: {
        location: true,
        category: true,
        product: true,
      },
    })

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { 
        organizationId,
        locationId,
      },
      include: {
        product: {
          include: { category: true }
        },
        location: true,
      },
    })

    for (const rule of rules) {
      await this.processRule(rule, inventoryItems)
    }
  }

  /**
   * Get alert summary for dashboard
   */
  async getAlertSummary(organizationId: string, locationId?: string): Promise<{
    total: number
    active: number
    critical: number
    recent: any[]
  }> {
    const where: any = { organizationId }
    
    if (locationId) {
      where.inventoryItem = {
        locationId
      }
    }

    const [total, active, critical, recent] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.alert.count({ 
        where: { 
          ...where, 
          status: 'ACTIVE', 
          severity: 'CRITICAL' 
        } 
      }),
      this.prisma.alert.findMany({
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

    return { total, active, critical, recent }
  }
}