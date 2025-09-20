import { PrismaClient } from '@happy-bar/database'
import { createPOSClient } from '@happy-bar/pos'
import { POSProduct, SyncResult } from '@happy-bar/types'

export class POSSyncService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Sync products from POS to database
   */
  async syncProducts(
    organizationId: string,
    posProducts: POSProduct[]
  ): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0
    let updated = 0
    let errors = 0

    for (const posProduct of posProducts) {
      try {
        // Check if product already exists by external ID
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            organizationId,
            posProductId: posProduct.externalId,
          },
        })

        if (existingProduct) {
          // Update existing product
          await this.prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: posProduct.name,
              sku: posProduct.sku,
              sellPrice: posProduct.price,
              isActive: posProduct.isActive,
              updatedAt: new Date(),
            },
          })
          updated++
        } else {
          // Get or create category
          let category = posProduct.category
            ? await this.prisma.category.findFirst({
                where: {
                  organizationId,
                  name: posProduct.category,
                },
              })
            : null

          if (!category && posProduct.category) {
            category = await this.prisma.category.create({
              data: {
                organizationId,
                name: posProduct.category,
                sortOrder: 999,
              },
            })
          }

          // Create new product
          await this.prisma.product.create({
            data: {
              organizationId,
              name: posProduct.name,
              sku: posProduct.sku || null,
              categoryId: category?.id || '',
              unit: 'each', // Default unit
              unitSize: 1,
              caseSize: 1,
              costPerUnit: (posProduct.price || 0) * 0.7, // Estimate 30% margin
              sellPrice: posProduct.price || 0,
              isActive: posProduct.isActive,
              posProductId: posProduct.externalId,
            },
          })
          created++
        }
      } catch (error) {
        console.error(`Failed to sync product ${posProduct.name}:`, error)
        errors++
      }
    }

    return { created, updated, errors }
  }

  /**
   * Perform full sync from POS integration
   */
  async performSync(
    organizationId: string,
    integrationId: string,
    syncSales: boolean = false,
    salesDateRange?: { start: Date; end: Date },
    locationIds?: string[],
    selectedGroupGuids?: string[]
  ): Promise<SyncResult> {
    try {
      // Get integration details
      const integration = await this.prisma.pOSIntegration.findFirst({
        where: { id: integrationId, organizationId },
      })

      if (!integration) {
        throw new Error('Integration not found')
      }
      // Create callback to save updated credentials
      const updateCredentials = async (updatedCredentials: any) => {
        await this.prisma.pOSIntegration.update({
          where: { id: integrationId },
          data: { credentials: updatedCredentials },
        })
      }

      // Create POS client
      const client = createPOSClient(
        integration.credentials as any,
        updateCredentials
      )

      // Use provided location IDs or determine them based on integration mode
      if (!locationIds || locationIds.length === 0) {
        // If not provided, determine based on credentials
        const credentials = integration.credentials as any

        if (credentials.integrationMode === 'standard') {
          // For Standard API Access, the partnerLocationId is the restaurant GUID
          if (credentials.partnerLocationId) {
            locationIds = [credentials.partnerLocationId]
          }
        } else {
          throw new Error('Location IDs must be provided for partner mode sync')
        }
      }

      if (!locationIds || locationIds.length === 0) {
        throw new Error('No locations configured for sync')
      }

      // Perform sync
      const syncOptions: any = {}
      if (syncSales && salesDateRange) {
        syncOptions.salesDateRange = salesDateRange
      }
      if (selectedGroupGuids && selectedGroupGuids.length > 0) {
        syncOptions.selectedGroupGuids = selectedGroupGuids
      }
      const syncResult = await client.syncData(
        locationIds,
        Object.keys(syncOptions).length > 0 ? syncOptions : undefined
      )

      // If we have products to sync, save them to database
      if (
        syncResult.productsSync &&
        syncResult.productsSync.created > 0 &&
        syncResult.productsSync.products
      ) {
        await this.saveProductsToDatabase(
          organizationId,
          integrationId,
          syncResult.productsSync.products
        )
      }

      // If we have sales to sync, save them to database
      if (syncResult.salesSync && syncResult.salesSync.imported > 0) {
        // would sync
      }

      return syncResult
    } catch (error) {
      return {
        success: false,
        productsSync: { created: 0, updated: 0, errors: 1 },
        salesSync: { imported: 0, errors: 1 },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Calculate theoretical usage based on sales data
   * This helps identify discrepancies between POS sales and inventory usage
   */
  async calculateTheoreticalUsage(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      productId: string
      theoreticalUsage: number
      actualUsage: number
      variance: number
    }>
  > {
    // Get all sales in the date range
    const sales = await this.prisma.sale.findMany({
      where: {
        organizationId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipes: {
                  include: {
                    recipe: {
                      include: {
                        items: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const usageMap = new Map<string, { theoretical: number; actual: number }>()

    // Calculate theoretical usage based on recipes
    for (const sale of sales) {
      for (const item of sale.items) {
        const product = item.product
        if (!product) continue

        // If product has recipes, calculate ingredient usage
        for (const recipeItem of product.recipes) {
          for (const ingredient of recipeItem.recipe.items) {
            const key = ingredient.productId
            const current = usageMap.get(key) || { theoretical: 0, actual: 0 }
            current.theoretical += ingredient.quantity * item.quantity
            usageMap.set(key, current)
          }
        }

        // If no recipe, assume 1:1 usage
        if (product.recipes.length === 0) {
          const key = product.id
          const current = usageMap.get(key) || { theoretical: 0, actual: 0 }
          current.theoretical += item.quantity
          usageMap.set(key, current)
        }
      }
    }

    // Get actual inventory changes in the same period
    const inventoryChanges = await this.prisma.countItem.findMany({
      where: {
        product: { organizationId },
        countedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
      },
    })

    // Calculate actual usage from inventory counts
    for (const change of inventoryChanges) {
      const key = change.productId
      const current = usageMap.get(key) || { theoretical: 0, actual: 0 }
      // Actual usage is the difference between expected and actual (if negative, it was used)
      if (change.variance && change.variance < 0) {
        current.actual += Math.abs(change.variance)
      }
      usageMap.set(key, current)
    }

    // Convert to result format
    return Array.from(usageMap.entries()).map(([productId, usage]) => ({
      productId,
      theoreticalUsage: usage.theoretical,
      actualUsage: usage.actual,
      variance: usage.actual - usage.theoretical,
    }))
  }

  /**
   * Save POS products to database, updating existing ones
   */
  async saveProductsToDatabase(
    organizationId: string,
    integrationId: string,
    products: any[]
  ): Promise<void> {
    for (const product of products) {
      try {
        await this.prisma.pOSProduct.upsert({
          where: {
            organizationId_integrationId_externalId: {
              organizationId,
              integrationId,
              externalId: product.externalId,
            },
          },
          update: {
            name: product.name,
            sku: product.sku || null,
            category: product.category || null,
            price: product.price || null,
            servingUnit: product.servingUnit || null,
            servingSize: product.servingSize || null,
            isActive: product.isActive ?? true,
            lastSyncedAt: new Date(),
            rawData: product,
          },
          create: {
            organizationId,
            integrationId,
            externalId: product.externalId,
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            servingUnit: product.servingUnit || null,
            servingSize: product.servingSize || null,
            isActive: product.isActive,
            lastSyncedAt: new Date(),
            rawData: product,
          },
        })
      } catch (error) {
        console.error(
          `Failed to save POS product ${product.externalId} - ${product.name}:`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }
}
