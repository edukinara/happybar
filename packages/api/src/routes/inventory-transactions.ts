import { MovementType } from '@happy-bar/database'
import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { UnitConverter } from '../utils/unit-conversion'

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

const getTransactionsSchema = z.object({
  productId: z.string(),
  locationId: z.string().optional(),
  limit: z.string().optional().default('100'),
  offset: z.string().optional().default('0'),
})

const inventoryTransactionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all transactions for a product
  fastify.get('/history', async (request, reply) => {
    const organizationId = getOrganizationId(request)

    const query = getTransactionsSchema.parse(request.query)
    const { productId, locationId, limit, offset } = query

    const transactions: any[] = []

    // 1. Get inventory counts where this product was counted
    const inventoryCounts = await fastify.prisma.inventoryCountItem.findMany({
      where: {
        productId,
        area: {
          count: {
            organizationId,
            locationId: locationId || undefined,
          },
        },
      },
      include: {
        area: {
          include: {
            count: {
              include: {
                location: true,
                approvedBy: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        countedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { countedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })

    // Add count transactions
    inventoryCounts.forEach((item) => {
      const variance = item.totalQuantity - (item.expectedQty || 0)
      transactions.push({
        id: `count-${item.id}`,
        type: 'count',
        date: item.countedAt,
        productId: item.productId,
        locationId: item.area.count.locationId,
        quantity: variance,
        fromQuantity: item.expectedQty,
        toQuantity: item.totalQuantity,
        reference: item.area.name,
        notes: item.notes || item.area.count.notes,
        performedBy:
          item.countedBy?.name || item.area.count.approvedBy?.name || 'Unknown',
        metadata: {
          areaName: item.area.name,
          countType: item.area.count.type,
          fullUnits: item.fullUnits,
          partialUnit: item.partialUnit,
        },
      })
    })

    // 2. Get stock movements (adjustments and transfers)
    const stockMovements = await fastify.prisma.stockMovement.findMany({
      where: {
        organizationId,
        productId,
        OR: locationId
          ? [{ fromLocationId: locationId }, { toLocationId: locationId }]
          : undefined,
      },
      include: {
        fromLocation: true,
        toLocation: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })

    // Add stock movement transactions
    stockMovements.forEach((movement) => {
      if (
        movement.type === MovementType.ADJUSTMENT_IN ||
        movement.type === MovementType.ADJUSTMENT_OUT
      ) {
        transactions.push({
          id: `adjustment-${movement.id}`,
          type: 'adjustment',
          date: movement.createdAt,
          productId: movement.productId,
          locationId: movement.fromLocationId,
          quantity: movement.quantity,
          reason: movement.reason,
          reference: movement.id,
          notes: movement.notes,
          performedBy: movement.user?.name || 'Unknown',
          metadata: {
            status: movement.status,
          },
        })
      } else if (movement.type === 'TRANSFER') {
        // For transfers, create two transactions (out and in)
        if (!locationId || locationId === movement.fromLocationId) {
          transactions.push({
            id: `transfer-out-${movement.id}`,
            type: 'transfer',
            date: movement.createdAt,
            productId: movement.productId,
            locationId: movement.fromLocationId,
            quantity: -movement.quantity, // Negative for outgoing
            reference: movement.id,
            notes: `Transfer to ${movement.toLocation.name}`,
            performedBy: movement.user?.name || 'Unknown',
            metadata: {
              direction: 'out',
              fromLocation: movement.fromLocation.name,
              toLocation: movement.toLocation.name,
              status: movement.status,
            },
          })
        }
        if (!locationId || locationId === movement.toLocationId) {
          transactions.push({
            id: `transfer-in-${movement.id}`,
            type: 'transfer',
            date: movement.createdAt,
            productId: movement.productId,
            locationId: movement.toLocationId,
            quantity: movement.quantity, // Positive for incoming
            reference: movement.id,
            notes: `Transfer from ${movement.fromLocation.name}`,
            performedBy: movement.user?.name || 'Unknown',
            metadata: {
              direction: 'in',
              fromLocation: movement.fromLocation.name,
              toLocation: movement.toLocation.name,
              status: movement.status,
            },
          })
        }
      }
    })

    // 3. Get sales data directly from SaleItem table
    const saleItems = await fastify.prisma.saleItem.findMany({
      where: {
        OR: [
          { productId }, // Direct product mapping
          {
            recipe: {
              items: {
                some: {
                  productId, // Recipe contains this product
                },
              },
            },
          },
        ],
      },
      include: {
        sale: true,
        posProduct: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            unitSize: true,
          },
        },
        recipe: {
          include: {
            items: {
              where: { productId },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    unitSize: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { sale: { saleDate: 'desc' } },
      take: Number(limit),
      skip: Number(offset),
    })

    // Add sales transactions
    saleItems.forEach((saleItem) => {
      // Calculate the actual quantity depleted for this specific product
      let depletedQuantity = 0
      let conversionDetails: any = null

      if (saleItem.productId === productId) {
        // Direct product sale
        const product = saleItem.product
        if (!product) {
          depletedQuantity = saleItem.quantity
        } else {
          // Check if there's a product mapping with serving units
          const mapping = saleItem.posProduct

          if (mapping?.servingSize && mapping?.servingUnit && product.unit) {
            // Use unit conversion for POS serving to inventory unit
            const conversion = UnitConverter.calculateServingDepletion(
              mapping.servingSize,
              mapping.servingUnit,
              product.unit,
              product.unitSize,
              saleItem.quantity
            )
            // Divide by unitSize to get the number of inventory units depleted
            depletedQuantity = conversion.convertedAmount / product.unitSize
            conversionDetails = {
              posServingSize: mapping.servingSize,
              posServingUnit: mapping.servingUnit,
              inventoryUnit: product.unit,
              inventoryUnitSize: product.unitSize,
              convertedAmount: conversion.convertedAmount,
              depletedUnits: depletedQuantity,
              conversionFactor: conversion.conversionFactor,
              isFullDepletion: conversion.isFullDepletion,
            }
          } else if (
            saleItem.posProduct?.servingSize &&
            saleItem.posProduct?.servingUnit &&
            product.unit
          ) {
            // Use POS product serving info directly
            const conversion = UnitConverter.calculateServingDepletion(
              saleItem.posProduct.servingSize,
              saleItem.posProduct.servingUnit,
              product.unit,
              product.unitSize,
              saleItem.quantity
            )
            // Divide by unitSize to get the number of inventory units depleted
            depletedQuantity = conversion.convertedAmount / product.unitSize
            conversionDetails = {
              posServingSize: saleItem.posProduct.servingSize,
              posServingUnit: saleItem.posProduct.servingUnit,
              inventoryUnit: product.unit,
              inventoryUnitSize: product.unitSize,
              convertedAmount: conversion.convertedAmount,
              depletedUnits: depletedQuantity,
              conversionFactor: conversion.conversionFactor,
              isFullDepletion: conversion.isFullDepletion,
            }
          } else {
            // No unit conversion available, use raw quantity
            depletedQuantity = saleItem.quantity
          }
        }
      } else if (saleItem.recipe) {
        // Recipe-based sale - calculate depletion for this specific ingredient
        const recipeItem = saleItem.recipe.items.find(
          (item) => item.productId === productId
        )
        if (recipeItem && recipeItem.product) {
          // Recipe item quantity is already in the product's unit
          // Just multiply by the number of recipes sold
          depletedQuantity = recipeItem.quantity * saleItem.quantity
          conversionDetails = {
            recipeQuantity: recipeItem.quantity,
            recipeUnit: recipeItem.product.unit,
            salesQuantity: saleItem.quantity,
          }
        }
      }

      if (depletedQuantity > 0) {
        transactions.push({
          id: `sale-${saleItem.id}`,
          type: 'sale',
          date: saleItem.sale.saleDate,
          productId: productId,
          locationId: undefined, // Could add location tracking to sales if needed
          quantity: -depletedQuantity, // Negative for depletion
          reference: saleItem.totalPrice,
          notes: saleItem.itemName || saleItem.posProduct?.name || 'POS Sale',
          performedBy: 'POS System',
          metadata: {
            saleId: saleItem.saleId,
            posProductName: saleItem.posProduct?.name,
            recipeId: saleItem.recipeId,
            recipeName: saleItem.recipe?.name,
            unitPrice: saleItem.unitPrice,
            totalPrice: saleItem.totalPrice,
            quantity: saleItem.quantity,
            conversionDetails,
          },
        })
      }
    })

    // 4. Get receipts/purchases (if we have a purchases table)
    // For now, we'll check if there are any positive adjustments marked as receipts
    const receipts = await fastify.prisma.stockMovement.findMany({
      where: {
        organizationId,
        productId,
        type: MovementType.ADJUSTMENT_IN || MovementType.ADJUSTMENT_OUT,
        quantity: { gt: 0 },
        reason: { in: ['RECEIPT', 'PURCHASE', 'DELIVERY'] },
        OR: locationId
          ? [{ fromLocationId: locationId }, { toLocationId: locationId }]
          : undefined,
      },
      include: {
        fromLocation: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })

    // Add receipt transactions
    receipts.forEach((receipt) => {
      transactions.push({
        id: `receipt-${receipt.id}`,
        type: 'receipt',
        date: receipt.createdAt,
        productId: receipt.productId,
        locationId: receipt.fromLocationId,
        quantity: receipt.quantity,
        reference: receipt.id,
        notes: receipt.notes || 'Inventory receipt',
        performedBy: receipt.user?.name || 'Unknown',
        metadata: {
          reason: receipt.reason,
          status: receipt.status,
        },
      })
    })

    // Sort all transactions by date descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })

    // Return paginated results
    return {
      success: true,
      data: {
        transactions: transactions.slice(0, Number(limit)),
        pagination: {
          limit,
          offset,
          total: transactions.length,
        },
      },
    }
  })

  // Get transaction statistics for a product
  fastify.get('/stats', async (request, reply) => {
    const organizationId = getOrganizationId(request)

    const {
      productId,
      locationId,
      days = 30,
    } = request.query as {
      productId: string
      locationId?: string
      days?: number
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get counts of each transaction type
    const [counts, movements, sales] = await Promise.all([
      fastify.prisma.inventoryCountItem.count({
        where: {
          productId,
          countedAt: { gte: startDate },
          area: {
            count: {
              organizationId,
              locationId: locationId || undefined,
            },
          },
        },
      }),
      fastify.prisma.stockMovement.count({
        where: {
          organizationId,
          productId,
          createdAt: { gte: startDate },
          OR: locationId
            ? [{ fromLocationId: locationId }, { toLocationId: locationId }]
            : undefined,
        },
      }),
      fastify.prisma.auditLog.count({
        where: {
          organizationId,
          productId,
          createdAt: { gte: startDate },
          eventType: {
            in: ['inventory_depletion', 'inventory_over_depletion'],
          },
        },
      }),
    ])

    return {
      success: true,
      data: {
        counts,
        movements,
        sales,
        total: counts + movements + sales,
        period: `Last ${days} days`,
      },
    }
  })
}

export default inventoryTransactionsRoutes
