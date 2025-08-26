import { PrismaClient } from '@happy-bar/database'
import { UnitConverter, UnitConversionResult } from '../utils/unit-conversion'
import { InventorySettingsService } from './inventory-settings'
import { AuditLoggingService } from './audit-logging'

export interface InventoryDepletionOptions {
  allowOverDepletion?: boolean
  warningThresholds?: {
    low: number  // % of minimum quantity
    critical: number  // % of minimum quantity
  }
  auditUserId?: string
  source?: string
}

export interface InventoryDepletionResult {
  type: 'direct' | 'recipe'
  productId?: string
  productName?: string
  recipeId?: string
  recipeName?: string
  depletedAmount?: number
  remainingInventory?: number
  ingredients?: Array<{
    productId: string
    productName: string
    depletedAmount: number
    remainingInventory: number
  }>
  unitConversion?: UnitConversionResult
  warnings?: string[]
  overDepletionAllowed?: boolean
  auditLogId?: string
}

export class InventoryDepletionService {
  private prisma: PrismaClient
  private settingsService: InventorySettingsService
  private auditService: AuditLoggingService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.settingsService = new InventorySettingsService(prisma)
    this.auditService = new AuditLoggingService(prisma, this.settingsService)
  }

  /**
   * Process inventory depletion for a POS sale item
   */
  async depleteInventoryForSaleItem(
    organizationId: string,
    integrationId: string,
    externalProductId: string,
    quantity: number,
    externalOrderId: string,
    timestamp: string,
    options: InventoryDepletionOptions = {}
  ): Promise<InventoryDepletionResult> {
    // Load settings if not provided in options
    let finalOptions = { ...options }
    
    if (options.source && (options.allowOverDepletion === undefined || !options.warningThresholds)) {
      const sourceType = InventorySettingsService.parseSourceType(options.source)
      const policy = await this.settingsService.getPolicyForSource(organizationId, sourceType)
      
      // Use settings values if not explicitly provided
      if (finalOptions.allowOverDepletion === undefined) {
        finalOptions.allowOverDepletion = policy.allowOverDepletion
      }
      if (!finalOptions.warningThresholds) {
        finalOptions.warningThresholds = policy.warningThresholds
      }
    }
    // First, find the POS product with serving information
    const posProduct = await this.prisma.pOSProduct.findFirst({
      where: {
        organizationId,
        integrationId,
        externalId: externalProductId,
      },
    })

    if (!posProduct) {
      throw new Error(`POS product not found: ${externalProductId}`)
    }

    // Check for direct product mapping
    const directMapping = await this.prisma.productMapping.findFirst({
      where: {
        organizationId,
        posProductId: posProduct.id,
        isConfirmed: true,
      },
      include: {
        product: {
          include: {
            inventoryItems: true,
          },
        },
      },
    })

    if (directMapping) {
      return await this.processDirectProductSale(
        organizationId,
        directMapping,
        posProduct,
        quantity,
        externalOrderId,
        timestamp,
        finalOptions
      )
    }

    // Check for recipe mapping
    const recipeMapping = await this.prisma.recipePOSMapping.findFirst({
      where: {
        organizationId,
        posProductId: posProduct.id,
        isActive: true,
      },
      include: {
        recipe: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    inventoryItems: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (recipeMapping) {
      return await this.processRecipeSale(
        organizationId,
        recipeMapping,
        posProduct,
        quantity,
        externalOrderId,
        timestamp,
        finalOptions
      )
    }

    throw new Error(`No mapping found for POS product: ${externalProductId}`)
  }

  /**
   * Process direct product sale and deplete inventory with unit conversion
   */
  private async processDirectProductSale(
    organizationId: string,
    mapping: any,
    posProduct: any,
    quantity: number,
    externalOrderId: string,
    _timestamp: string,
    options: InventoryDepletionOptions = {}
  ): Promise<InventoryDepletionResult> {
    const product = mapping.product
    const inventoryItems = product.inventoryItems

    if (!inventoryItems || inventoryItems.length === 0) {
      throw new Error(`No inventory items found for product: ${product.name}`)
    }

    // Calculate depletion amount with unit conversion
    let depletionAmount = quantity
    let unitConversion: UnitConversionResult | undefined
    const warnings: string[] = []

    // Get serving information from mapping or POS product
    const servingUnit = mapping.servingUnit || posProduct?.servingUnit
    const servingSize = mapping.servingSize || posProduct?.servingSize || 1
    
    if (servingUnit && servingSize) {
      if (servingUnit !== product.unit) {
        // Convert POS serving to inventory unit (different units)
        unitConversion = UnitConverter.calculateServingDepletion(
          servingSize,
          servingUnit,
          product.unit,
          product.unitSize,
          quantity
        )
        
        // Check if we need to calculate fractional depletion
        // The converter returns amount in the target unit, but we may need fractions of containers
        if (product.unitSize && product.unitSize > 0) {
          // e.g., Convert 1.5 fl oz to ml = 44.36ml, then 44.36ml / 750ml = 0.0591 bottles
          depletionAmount = unitConversion.convertedAmount / product.unitSize
        } else {
          depletionAmount = unitConversion.convertedAmount
        }
        
        // Log unit conversion for audit if enabled
        await this.auditService.logUnitConversionEvent(
          organizationId,
          product.id,
          {
            productName: product.name,
            fromUnit: servingUnit,
            toUnit: product.unit,
            fromAmount: servingSize * quantity,
            toAmount: depletionAmount,
            conversionRate: unitConversion.conversionFactor,
            source: options.source || 'pos_sale',
            success: true,
          },
          {
            userId: options.auditUserId,
            source: options.source || 'pos_sale',
            externalOrderId,
          }
        )
      } else {
        // Same units - need to consider if we're depleting fractions of a container
        // For example: 44ml serving from a 750ml bottle = 44/750 = 0.0587 bottles
        const totalServingAmount = quantity * servingSize
        
        // If product has a unitSize (e.g., 750ml bottle), calculate fractional depletion
        if (product.unitSize && product.unitSize > 0) {
          depletionAmount = totalServingAmount / product.unitSize
        } else {
          // No unitSize defined, use the serving amount directly
          depletionAmount = totalServingAmount
        }
        
        // Log this as a "conversion" for audit purposes
        await this.auditService.logUnitConversionEvent(
          organizationId,
          product.id,
          {
            productName: product.name,
            fromUnit: servingUnit,
            toUnit: product.unit,
            fromAmount: totalServingAmount,
            toAmount: depletionAmount,
            conversionRate: product.unitSize ? 1 / product.unitSize : 1,
            source: options.source || 'pos_sale',
            success: true,
          },
          {
            userId: options.auditUserId,
            source: options.source || 'pos_sale',
            externalOrderId,
          }
        )
      }
    }

    // Sum total current quantity across all locations for this product
    const totalCurrentQuantity = inventoryItems.reduce(
      (sum: number, item: any) => sum + item.currentQuantity,
      0
    )

    // Check inventory sufficiency and over-depletion policy
    const shortfall = depletionAmount - totalCurrentQuantity
    
    if (totalCurrentQuantity < depletionAmount) {
      if (!options.allowOverDepletion) {
        throw new Error(
          `Insufficient inventory for ${product.name}. Available: ${totalCurrentQuantity}, Required: ${depletionAmount}`
        )
      } else {
        warnings.push(
          `Over-depletion allowed: ${product.name} went negative by ${shortfall.toFixed(2)} ${product.unit}`
        )
        
        // Log over-depletion event for audit
        await this.auditService.logOverDepletionEvent(
          organizationId,
          product.id,
          {
            productName: product.name,
            originalQuantity: totalCurrentQuantity,
            requestedQuantity: depletionAmount,
            resultingQuantity: totalCurrentQuantity - depletionAmount,
            allowedByPolicy: true,
            externalOrderId,
          },
          {
            userId: options.auditUserId,
            source: options.source || 'pos_sale',
            externalOrderId,
          }
        )
      }
    }
    
    // Check warning thresholds
    const finalQuantity = totalCurrentQuantity - depletionAmount
    this.checkWarningThresholds(product, finalQuantity, warnings, options.warningThresholds)

    // Deplete inventory with proper over-depletion handling
    let remainingToDeplete = depletionAmount
    const itemUpdates = new Map<string, { item: any; totalDepletion: number }>()

    // First pass: deplete from available stock
    for (const inventoryItem of inventoryItems) {
      if (remainingToDeplete <= 0) break
      
      const availableQuantity = Math.max(0, inventoryItem.currentQuantity)
      const amountToDeplete = Math.min(remainingToDeplete, availableQuantity)
      
      if (amountToDeplete > 0) {
        itemUpdates.set(inventoryItem.id, {
          item: inventoryItem,
          totalDepletion: amountToDeplete
        })
        remainingToDeplete -= amountToDeplete
      }
    }

    // Second pass: if over-depletion is allowed and there's still amount remaining,
    // apply it to the first inventory item (making it negative)
    if (remainingToDeplete > 0 && options.allowOverDepletion && inventoryItems.length > 0) {
      const firstItem = inventoryItems[0]
      const existingUpdate = itemUpdates.get(firstItem.id)
      
      if (existingUpdate) {
        // Add to existing depletion
        existingUpdate.totalDepletion += remainingToDeplete
      } else {
        // Create new depletion entry
        itemUpdates.set(firstItem.id, {
          item: firstItem,
          totalDepletion: remainingToDeplete
        })
      }
    }

    // Create the actual database updates
    const updatePromises = []
    for (const { item, totalDepletion } of itemUpdates.values()) {
      updatePromises.push(
        this.prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentQuantity: item.currentQuantity - totalDepletion,
            updatedAt: new Date(),
          },
        })
      )
    }

    // Execute all updates
    await Promise.all(updatePromises)

    // Calculate final total quantity
    const finalTotalQuantity = totalCurrentQuantity - depletionAmount

    // Log the inventory depletion
    // console.log(`Inventory depleted: ${product.name}`, {
    //   depletedAmount: depletionAmount,
    //   originalQuantity: totalCurrentQuantity,
    //   newQuantity: finalTotalQuantity,
    //   source: 'pos_sale',
    //   externalOrderId,
    // })

    return {
      type: 'direct',
      productId: product.id,
      productName: product.name,
      depletedAmount: depletionAmount,
      remainingInventory: finalTotalQuantity,
      unitConversion,
      warnings: warnings.length > 0 ? warnings : undefined,
      overDepletionAllowed: options.allowOverDepletion && shortfall > 0,
    }
  }

  /**
   * Process recipe-based sale and deplete ingredient inventory
   */
  private async processRecipeSale(
    organizationId: string,
    mapping: any,
    _posProduct: any,
    quantity: number,
    externalOrderId: string,
    _timestamp: string,
    options: InventoryDepletionOptions = {}
  ): Promise<InventoryDepletionResult> {
    const recipe = mapping.recipe
    const results = []
    const warnings: string[] = []

    // Process each ingredient in the recipe
    for (const ingredient of recipe.items) {
      const product = ingredient.product
      const inventoryItems = product.inventoryItems

      if (!inventoryItems || inventoryItems.length === 0) {
        console.warn(`No inventory items found for ingredient: ${product.name}`)
        continue
      }

      // Calculate total ingredient usage: recipe quantity * number of servings sold
      const totalIngredientUsage = ingredient.quantity * quantity

      // Sum total current quantity across all locations for this ingredient
      const totalCurrentQuantity = inventoryItems.reduce(
        (sum: number, item: any) => sum + item.currentQuantity,
        0
      )

      // Check inventory sufficiency and over-depletion policy
      const shortfall = totalIngredientUsage - totalCurrentQuantity
      
      if (totalCurrentQuantity < totalIngredientUsage) {
        if (!options.allowOverDepletion) {
          throw new Error(
            `Insufficient inventory for ingredient ${product.name}. Available: ${totalCurrentQuantity}, Required: ${totalIngredientUsage}`
          )
        } else {
          warnings.push(
            `Over-depletion allowed: ${product.name} went negative by ${shortfall.toFixed(2)} ${product.unit}`
          )
          
          // Log over-depletion event for audit
          await this.auditService.logOverDepletionEvent(
            organizationId,
            product.id,
            {
              productName: product.name,
              originalQuantity: totalCurrentQuantity,
              requestedQuantity: totalIngredientUsage,
              resultingQuantity: totalCurrentQuantity - totalIngredientUsage,
              allowedByPolicy: true,
              externalOrderId,
            },
            {
              recipeId: recipe.id,
              userId: options.auditUserId,
              source: options.source || 'pos_sale_recipe',
              externalOrderId,
            }
          )
        }
      }
      
      // Check warning thresholds
      const finalQuantity = totalCurrentQuantity - totalIngredientUsage
      this.checkWarningThresholds(product, finalQuantity, warnings, options.warningThresholds)

      // Deplete inventory with proper over-depletion handling for this ingredient
      let remainingToDeplete = totalIngredientUsage
      const itemUpdates = new Map<string, { item: any; totalDepletion: number }>()

      // First pass: deplete from available stock
      for (const inventoryItem of inventoryItems) {
        if (remainingToDeplete <= 0) break
        
        const availableQuantity = Math.max(0, inventoryItem.currentQuantity)
        const amountToDeplete = Math.min(remainingToDeplete, availableQuantity)
        
        if (amountToDeplete > 0) {
          itemUpdates.set(inventoryItem.id, {
            item: inventoryItem,
            totalDepletion: amountToDeplete
          })
          remainingToDeplete -= amountToDeplete
        }
      }

      // Second pass: if over-depletion is allowed and there's still amount remaining,
      // apply it to the first inventory item (making it negative)
      if (remainingToDeplete > 0 && options.allowOverDepletion && inventoryItems.length > 0) {
        const firstItem = inventoryItems[0]
        const existingUpdate = itemUpdates.get(firstItem.id)
        
        if (existingUpdate) {
          // Add to existing depletion
          existingUpdate.totalDepletion += remainingToDeplete
        } else {
          // Create new depletion entry
          itemUpdates.set(firstItem.id, {
            item: firstItem,
            totalDepletion: remainingToDeplete
          })
        }
      }

      // Create and execute the actual database updates for this ingredient
      const updatePromises = []
      for (const { item, totalDepletion } of itemUpdates.values()) {
        updatePromises.push(
          this.prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              currentQuantity: item.currentQuantity - totalDepletion,
              updatedAt: new Date(),
            },
          })
        )
      }

      // Execute all updates for this ingredient
      await Promise.all(updatePromises)

      // Calculate final total quantity
      const finalTotalQuantity = totalCurrentQuantity - totalIngredientUsage

      // Log the ingredient depletion
      // console.log(`Recipe ingredient depleted: ${product.name}`, {
      //   recipe: recipe.name,
      //   totalIngredientUsage,
      //   originalQuantity: totalCurrentQuantity,
      //   newQuantity: finalTotalQuantity,
      //   servings: quantity,
      //   source: 'pos_sale',
      //   externalOrderId,
      // })

      results.push({
        productId: product.id,
        productName: product.name,
        depletedAmount: totalIngredientUsage,
        remainingInventory: finalTotalQuantity,
      })
    }

    return {
      type: 'recipe',
      recipeId: recipe.id,
      recipeName: recipe.name,
      ingredients: results,
      warnings: warnings.length > 0 ? warnings : undefined,
      overDepletionAllowed: options.allowOverDepletion,
    }
  }

  /**
   * Check warning thresholds and add warnings
   */
  private checkWarningThresholds(
    product: any,
    finalQuantity: number,
    warnings: string[],
    thresholds?: { low: number; critical: number }
  ) {
    if (!thresholds) {
      thresholds = { low: 20, critical: 10 } // Default: 20% and 10% of minimum
    }

    // Get minimum quantity across all locations for this product
    const inventoryItems = product.inventoryItems || []
    const minQuantity = Math.min(...inventoryItems.map((item: any) => item.minimumQuantity || 0))
    
    if (minQuantity > 0) {
      const percentageOfMin = (finalQuantity / minQuantity) * 100
      
      if (percentageOfMin <= thresholds.critical) {
        warnings.push(`CRITICAL: ${product.name} is at ${percentageOfMin.toFixed(1)}% of minimum stock level`)
      } else if (percentageOfMin <= thresholds.low) {
        warnings.push(`LOW STOCK: ${product.name} is at ${percentageOfMin.toFixed(1)}% of minimum stock level`)
      }
    } else if (finalQuantity <= 5) {
      // If no minimum set, warn when very low
      warnings.push(`LOW STOCK: ${product.name} has only ${finalQuantity.toFixed(2)} ${product.unit} remaining`)
    }
  }

}
