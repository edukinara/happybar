import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import { authMiddleware, requireAnyPermission } from '../middleware/auth-simple'
import { getOrganizationId } from '../types/route-helpers'

const inventoryReportsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Get theoretical vs actual usage analysis
  fastify.get(
    '/usage-analysis',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['analytics.inventory', 'analytics.variance']),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = getOrganizationId(request)

      const { startDate, endDate, locationId, productId } =
        request.query as Record<string, string | undefined>

      try {
        // Build date filters
        const dateFilter: { gte?: Date; lte?: Date } = {}
        if (startDate) {
          dateFilter.gte = new Date(startDate)
        }
        if (endDate) {
          dateFilter.lte = new Date(endDate)
        }

        // Get theoretical usage from sales data
        const saleItems = await fastify.prisma.saleItem.findMany({
          where: {
            sale: {
              organizationId,
              ...(dateFilter.gte || dateFilter.lte
                ? { saleDate: dateFilter }
                : {}),
            },
            OR: [
              { productId }, // Direct product sales
              {
                recipe: {
                  items: {
                    some: { productId }, // Recipe-based sales containing this product
                  },
                },
              },
            ],
          },
          include: {
            sale: true,
            posProduct: true,
            product: true,
            recipe: {
              include: {
                items: {
                  where: { productId },
                  include: { product: true },
                },
              },
            },
          },
        })

        // Calculate theoretical depletion by product
        const theoreticalUsage = new Map<
          string,
          {
            productId: string
            productName: string
            theoreticalQuantity: number
            salesCount: number
            averagePrice: number
          }
        >()

        saleItems.forEach((saleItem) => {
          const targetProductId = productId || saleItem.productId
          if (!targetProductId) return

          let depletedQuantity = 0
          let productName = ''

          if (saleItem.productId === targetProductId) {
            // Direct product sale
            depletedQuantity = saleItem.quantity
            productName = saleItem.product?.name || 'Unknown Product'
          } else if (saleItem.recipe) {
            // Recipe-based sale
            const recipeItem = saleItem.recipe.items.find(
              (item) => item.productId === targetProductId
            )
            if (recipeItem) {
              depletedQuantity = recipeItem.quantity * saleItem.quantity
              productName = recipeItem.product.name
            }
          }

          if (depletedQuantity > 0) {
            const existing = theoreticalUsage.get(targetProductId) || {
              productId: targetProductId,
              productName,
              theoreticalQuantity: 0,
              salesCount: 0,
              averagePrice: 0,
            }

            existing.theoreticalQuantity += depletedQuantity
            existing.salesCount += 1
            existing.averagePrice =
              (existing.averagePrice + saleItem.unitPrice) / existing.salesCount

            theoreticalUsage.set(targetProductId, existing)
          }
        })

        // Get actual usage from inventory counts/adjustments
        const inventoryChanges =
          await fastify.prisma.inventoryCountItem.findMany({
            where: {
              productId: productId || undefined,
              area: {
                count: {
                  organizationId,
                  status: 'COMPLETED',
                  ...(locationId && { locationId }),
                  ...(dateFilter.gte || dateFilter.lte
                    ? { completedAt: dateFilter }
                    : {}),
                },
              },
            },
            include: {
              product: true,
              area: {
                include: {
                  count: {
                    include: { location: true },
                  },
                },
              },
            },
          })

        // Calculate actual usage (negative variances indicate depletion)
        const actualUsage = new Map<
          string,
          {
            productId: string
            productName: string
            actualQuantity: number
            countEvents: number
            lastCountDate: Date
          }
        >()

        inventoryChanges.forEach((countItem) => {
          const pid = countItem.productId
          const variance = countItem.variance || 0

          // Negative variance means actual quantity was lower than expected (depletion)
          const actualDepletion = Math.abs(Math.min(variance, 0))

          if (actualDepletion > 0) {
            const existing = actualUsage.get(pid) || {
              productId: pid,
              productName: countItem.product.name,
              actualQuantity: 0,
              countEvents: 0,
              lastCountDate: countItem.area.count.completedAt || new Date(),
            }

            existing.actualQuantity += actualDepletion
            existing.countEvents += 1
            if (
              countItem.area.count.completedAt &&
              countItem.area.count.completedAt > existing.lastCountDate
            ) {
              existing.lastCountDate = countItem.area.count.completedAt
            }

            actualUsage.set(pid, existing)
          }
        })

        // Combine theoretical and actual data for analysis
        const allProductIds = new Set([
          ...theoreticalUsage.keys(),
          ...actualUsage.keys(),
        ])

        const usageAnalysis = Array.from(allProductIds)
          .map((pid) => {
            const theoretical = theoreticalUsage.get(pid) || {
              productId: pid,
              productName: 'Unknown',
              theoreticalQuantity: 0,
              salesCount: 0,
              averagePrice: 0,
            }

            const actual = actualUsage.get(pid) || {
              productId: pid,
              productName: theoretical.productName,
              actualQuantity: 0,
              countEvents: 0,
              lastCountDate: new Date(),
            }

            const variance =
              actual.actualQuantity - theoretical.theoreticalQuantity
            const variancePercent =
              theoretical.theoreticalQuantity > 0
                ? (variance / theoretical.theoreticalQuantity) * 100
                : 0

            const costImpact = variance * theoretical.averagePrice

            return {
              productId: pid,
              productName: theoretical.productName || actual.productName,
              theoreticalQuantity: theoretical.theoreticalQuantity,
              actualQuantity: actual.actualQuantity,
              variance,
              variancePercent,
              costImpact,
              salesCount: theoretical.salesCount,
              countEvents: actual.countEvents,
              efficiency:
                theoretical.theoreticalQuantity > 0
                  ? (theoretical.theoreticalQuantity / actual.actualQuantity) *
                    100
                  : 100,
              lastCountDate: actual.lastCountDate,
            }
          })
          .filter(
            (item) => item.theoreticalQuantity > 0 || item.actualQuantity > 0
          )

        // Calculate summary metrics
        const totalTheoreticalUsage = usageAnalysis.reduce(
          (sum, item) => sum + item.theoreticalQuantity,
          0
        )
        const totalActualUsage = usageAnalysis.reduce(
          (sum, item) => sum + item.actualQuantity,
          0
        )
        const totalVariance = totalActualUsage - totalTheoreticalUsage
        const overallEfficiency =
          totalTheoreticalUsage > 0
            ? (totalTheoreticalUsage / totalActualUsage) * 100
            : 100
        const totalCostImpact = usageAnalysis.reduce(
          (sum, item) => sum + item.costImpact,
          0
        )

        return {
          summary: {
            totalTheoreticalUsage,
            totalActualUsage,
            totalVariance,
            overallEfficiency,
            totalCostImpact,
            productsAnalyzed: usageAnalysis.length,
            significantVariances: usageAnalysis.filter(
              (item) => Math.abs(item.variancePercent) > 10
            ).length,
          },
          productAnalysis: usageAnalysis.sort(
            (a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent)
          ),
          topOverusers: usageAnalysis
            .filter((item) => item.variance > 0)
            .sort((a, b) => b.variancePercent - a.variancePercent)
            .slice(0, 10),
          topWasters: usageAnalysis
            .filter((item) => item.efficiency < 80)
            .sort((a, b) => a.efficiency - b.efficiency)
            .slice(0, 10),
        }
      } catch (error) {
        console.error('Usage analysis error:', error)
        return reply
          .code(500)
          .send({ error: 'Failed to generate usage analysis' })
      }
    }
  )

  // Get variance analysis report
  fastify.get(
    '/variance-analysis',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['analytics.inventory', 'analytics.variance']),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = getOrganizationId(request)

      const { startDate, endDate, locationId } = request.query as Record<
        string,
        string | undefined
      >

      try {
        // Build date filters
        const dateFilter: { gte?: Date; lte?: Date } = {}
        if (startDate) {
          dateFilter.gte = new Date(startDate)
        }
        if (endDate) {
          dateFilter.lte = new Date(endDate)
        }

        // Get count items with variance from completed counts
        const countItems = await fastify.prisma.inventoryCountItem.findMany({
          where: {
            area: {
              count: {
                organizationId,
                status: 'COMPLETED',
                ...(locationId && { locationId }),
                ...(dateFilter.gte || dateFilter.lte
                  ? { completedAt: dateFilter }
                  : {}),
              },
            },
            variance: {
              not: 0,
            },
          },
          include: {
            product: true,
            area: {
              include: {
                count: {
                  include: {
                    location: true,
                  },
                },
              },
            },
          },
        })

        // Calculate summary statistics
        const totalItemsCounted = await fastify.prisma.inventoryCountItem.count(
          {
            where: {
              area: {
                count: {
                  organizationId,
                  status: 'COMPLETED',
                  ...(locationId && { locationId }),
                  ...(dateFilter.gte || dateFilter.lte
                    ? { completedAt: dateFilter }
                    : {}),
                },
              },
            },
          }
        )

        const itemsWithVariance = countItems.length
        const totalVariance = countItems.reduce(
          (sum, item) => sum + (item.variance || 0),
          0
        )
        const totalCostImpact = countItems.reduce(
          (sum, item) => sum + (item.variance || 0) * (item.unitCost || 0),
          0
        )
        const totalVariancePercent =
          totalItemsCounted > 0
            ? (itemsWithVariance / totalItemsCounted) * 100
            : 0

        // Group variances by location
        const variancesByLocation = Object.values(
          countItems.reduce(
            (acc, item) => {
              const locId = item.area.count.locationId
              const locName = item.area.count.location?.name || 'Unknown'

              if (!acc[locId]) {
                acc[locId] = {
                  locationId: locId,
                  locationName: locName,
                  totalVariance: 0,
                  costImpact: 0,
                  itemCount: 0,
                }
              }

              acc[locId].totalVariance += item.variance || 0
              acc[locId].costImpact +=
                (item.variance || 0) * (item.unitCost || 0)
              acc[locId].itemCount += 1

              return acc
            },
            {} as Record<string, any>
          )
        )

        // Group variances by product
        const variancesByProduct = Object.values(
          countItems.reduce(
            (acc, item) => {
              const prodId = item.productId
              const prodName = item.product?.name || 'Unknown'

              if (!acc[prodId]) {
                acc[prodId] = {
                  productId: prodId,
                  productName: prodName,
                  totalVariance: 0,
                  costImpact: 0,
                  countFrequency: 0,
                }
              }

              acc[prodId].totalVariance += item.variance || 0
              acc[prodId].costImpact +=
                (item.variance || 0) * (item.unitCost || 0)
              acc[prodId].countFrequency += 1

              return acc
            },
            {} as Record<string, any>
          )
        ).sort((a, b) => Math.abs(b.costImpact) - Math.abs(a.costImpact))

        return reply.send({
          success: true,
          data: {
            summary: {
              totalVariance,
              totalVariancePercent,
              totalCostImpact,
              itemsWithVariance,
              totalItemsCounted,
            },
            variancesByLocation,
            variancesByProduct: variancesByProduct.slice(0, 10), // Top 10 products
          },
        })
      } catch (error) {
        console.error('Variance analysis error:', error)
        return reply
          .code(500)
          .send({ error: 'Failed to generate variance analysis' })
      }
    }
  )

  // Get inventory valuation report
  fastify.get('/valuation', async (request, reply) => {
    const organizationId = request.organization?.id
    if (!organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { locationId } = request.query as Record<string, string | undefined>

    try {
      // Get all inventory items
      const inventoryItems = await fastify.prisma.inventoryItem.findMany({
        where: {
          organizationId,
          ...(locationId && { locationId }),
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          location: true,
        },
      })

      // Calculate summary
      const totalValue = inventoryItems.reduce(
        (sum, item) => sum + item.currentQuantity * item.product.costPerUnit,
        0
      )
      const totalItems = inventoryItems.length

      // Get sales data for turnover calculation (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const stockMovements = await fastify.prisma.stockMovement.findMany({
        where: {
          organizationId,
          type: 'SOLD',
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          product: true,
        },
      })

      // Calculate average turnover (simplified - would need more complex calculation in production)
      const averageTurnover =
        stockMovements.length > 0
          ? (stockMovements.length / totalItems) * 12 // Annualized
          : 0

      // Identify slow moving items (no sales in last 30 days)
      const soldProductIds = new Set(stockMovements.map((m) => m.productId))
      const slowMovingItems = inventoryItems.filter(
        (item) => !soldProductIds.has(item.productId)
      ).length

      // Group by category
      const valueByCategory = Object.values(
        inventoryItems.reduce(
          (acc, item) => {
            const catId = item.product.categoryId
            const catName = item.product.category?.name || 'Uncategorized'

            if (!acc[catId]) {
              acc[catId] = {
                categoryId: catId,
                categoryName: catName,
                totalValue: 0,
                itemCount: 0,
                turnoverRate: 0,
              }
            }

            acc[catId].totalValue +=
              item.currentQuantity * item.product.costPerUnit
            acc[catId].itemCount += 1

            return acc
          },
          {} as Record<string, any>
        )
      ).map((cat) => {
        // Calculate category-specific turnover
        const categorySales = stockMovements.filter(
          (m) =>
            inventoryItems.find((i) => i.productId === m.productId)?.product
              .categoryId === cat.categoryId
        ).length
        cat.turnoverRate =
          cat.itemCount > 0 ? (categorySales / cat.itemCount) * 12 : 0
        return cat
      })

      // Group by location
      const valueByLocation = Object.values(
        inventoryItems.reduce(
          (acc, item) => {
            const locId = item.locationId
            const locName = item.location?.name || 'Unknown'

            if (!acc[locId]) {
              acc[locId] = {
                locationId: locId,
                locationName: locName,
                totalValue: 0,
                itemCount: 0,
                averageAge: 0, // Would need to track receipt dates for real calculation
              }
            }

            acc[locId].totalValue +=
              item.currentQuantity * item.product.costPerUnit
            acc[locId].itemCount += 1

            // Simplified age calculation - would need actual receipt tracking
            const lastUpdate = new Date(item.updatedAt)
            const ageInDays = Math.floor(
              (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
            )
            acc[locId].averageAge =
              (acc[locId].averageAge * (acc[locId].itemCount - 1) + ageInDays) /
              acc[locId].itemCount

            return acc
          },
          {} as Record<string, any>
        )
      )

      return reply.send({
        success: true,
        data: {
          summary: {
            totalValue,
            totalItems,
            averageTurnover,
            slowMovingItems,
          },
          valueByCategory,
          valueByLocation,
        },
      })
    } catch (error) {
      console.error('Valuation report error:', error)
      return reply
        .code(500)
        .send({ error: 'Failed to generate valuation report' })
    }
  })

  // Get movement history report
  fastify.get('/movement-history', async (request, reply) => {
    const organizationId = request.organization?.id
    if (!organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { startDate, endDate, locationId, productId, movementType } =
      request.query as Record<string, string | undefined>

    try {
      // Build filters
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }

      const where: any = {
        organizationId,
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
        ...(productId && { productId }),
        ...(movementType && { type: movementType }),
      }

      if (locationId) {
        where.OR = [
          { fromLocationId: locationId },
          { toLocationId: locationId },
        ]
      }

      // Get movements
      const movements = await fastify.prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to recent 100 for performance
      })

      // Calculate summary
      const totalMovements = movements.length
      const transferCount = movements.filter(
        (m) => m.type === 'TRANSFER'
      ).length
      const adjustmentCount = movements.filter(
        (m) => m.type === 'ADJUSTMENT_IN' || m.type === 'ADJUSTMENT_OUT'
      ).length

      const totalValue = movements.reduce((sum, movement) => {
        const value = movement.quantity * (movement.product?.costPerUnit || 0)
        return sum + (movement.type === 'ADJUSTMENT_OUT' ? -value : value)
      }, 0)

      // Group by type
      const movementsByType = Object.values(
        movements.reduce(
          (acc, movement) => {
            const type = movement.type

            if (!acc[type]) {
              acc[type] = {
                type,
                count: 0,
                totalQuantity: 0,
                totalValue: 0,
              }
            }

            const quantity =
              movement.type === 'ADJUSTMENT_OUT'
                ? -movement.quantity
                : movement.quantity
            const value =
              movement.quantity * (movement.product?.costPerUnit || 0)

            acc[type].count += 1
            acc[type].totalQuantity += quantity
            acc[type].totalValue +=
              movement.type === 'ADJUSTMENT_OUT' ? -value : value

            return acc
          },
          {} as Record<string, any>
        )
      )

      return reply.send({
        success: true,
        data: {
          movements: movements.slice(0, 20), // Return first 20 for display
          summary: {
            totalMovements,
            transferCount,
            adjustmentCount,
            totalValue,
          },
          movementsByType,
        },
      })
    } catch (error) {
      console.error('Movement history error:', error)
      return reply
        .code(500)
        .send({ error: 'Failed to generate movement history' })
    }
  })

  // Get count summary report
  fastify.get('/count-summary', async (request, reply) => {
    const organizationId = request.organization?.id
    if (!organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { startDate, endDate, locationId } = request.query as Record<
      string,
      string | undefined
    >

    try {
      // Build date filters
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }

      // Get counts
      const counts = await fastify.prisma.inventoryCount.findMany({
        where: {
          organizationId,
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(dateFilter.gte || dateFilter.lte
            ? { completedAt: dateFilter }
            : {}),
        },
        include: {
          location: true,
          areas: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      })

      // Calculate summary
      const totalCounts = counts.length
      const completedCounts = counts.filter(
        (c) => c.status === 'COMPLETED'
      ).length

      const allVariances = counts.flatMap((count) =>
        count.areas.flatMap((area) =>
          area.items.map((item) => ({
            variance: item.variance || 0,
            costImpact: (item.variance || 0) * (item.unitCost || 0),
          }))
        )
      )

      const averageVariance =
        allVariances.length > 0
          ? allVariances.reduce((sum, v) => sum + Math.abs(v.variance), 0) /
            allVariances.length
          : 0

      const totalCostImpact = allVariances.reduce(
        (sum, v) => sum + v.costImpact,
        0
      )

      // Group counts by location
      const countsByLocation = Object.values(
        counts.reduce(
          (acc, count) => {
            const locId = count.locationId
            const locName = count.location?.name || 'Unknown'

            if (!acc[locId]) {
              acc[locId] = {
                locationId: locId,
                locationName: locName,
                countFrequency: 0,
                totalVariance: 0,
                lastCountDate: '',
              }
            }

            acc[locId].countFrequency += 1

            const countVariance = count.areas.reduce(
              (sum, area) =>
                sum +
                area.items.reduce(
                  (itemSum, item) => itemSum + Math.abs(item.variance || 0),
                  0
                ),
              0
            )
            acc[locId].totalVariance += countVariance

            if (
              !acc[locId].lastCountDate ||
              (count.completedAt &&
                count.completedAt > new Date(acc[locId].lastCountDate))
            ) {
              acc[locId].lastCountDate = count.completedAt?.toISOString() || ''
            }

            return acc
          },
          {} as Record<string, any>
        )
      ).map((loc) => ({
        ...loc,
        averageVariance:
          loc.countFrequency > 0 ? loc.totalVariance / loc.countFrequency : 0,
      }))

      // Get recent counts
      const recentCounts = counts.slice(0, 10).map((count) => {
        const totalItems = count.areas.reduce(
          (sum, area) => sum + area.items.length,
          0
        )
        const varianceCount = count.areas.reduce(
          (sum, area) =>
            sum +
            area.items.filter((item) => (item.variance || 0) !== 0).length,
          0
        )
        const costImpact = count.areas.reduce(
          (sum, area) =>
            sum +
            area.items.reduce(
              (itemSum, item) =>
                itemSum + (item.variance || 0) * (item.unitCost || 0),
              0
            ),
          0
        )

        return {
          id: count.id,
          name: count.name,
          locationName: count.location?.name || 'Unknown',
          completedAt: count.completedAt?.toISOString() || '',
          totalItems,
          varianceCount,
          costImpact,
        }
      })

      return reply.send({
        success: true,
        data: {
          summary: {
            totalCounts,
            completedCounts,
            averageVariance,
            totalCostImpact,
          },
          countsByLocation,
          recentCounts,
        },
      })
    } catch (error) {
      console.error('Count summary error:', error)
      return reply.code(500).send({ error: 'Failed to generate count summary' })
    }
  })
}

export default inventoryReportsRoutes
