import { PrismaClient } from '@happy-bar/database'
import { AppError, ErrorCode, POSSale, POSSaleItem } from '@happy-bar/types'
// Remove unused import - APIError from better-auth
import { InventoryDepletionService } from './inventory-depletion'

export class POSSalesSyncService {
  private prisma: PrismaClient
  private inventoryService: InventoryDepletionService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.inventoryService = new InventoryDepletionService(prisma)
  }

  /**
   * Calculate business date string in yyyymmdd format based on restaurant timezone and closeout hour
   */
  private calculateBusinessDate(
    date: Date,
    timeZone: string,
    closeoutHour: number = 3
  ): string {
    // Convert date to restaurant timezone
    const restaurantDate = new Date(date.toLocaleString('en-US', { timeZone }))

    // If current hour is before closeout hour, this is still previous business day
    if (restaurantDate.getHours() < closeoutHour) {
      restaurantDate.setDate(restaurantDate.getDate() - 1)
    }

    // Format as yyyymmdd
    const year = restaurantDate.getFullYear()
    const month = (restaurantDate.getMonth() + 1).toString().padStart(2, '0')
    const day = restaurantDate.getDate().toString().padStart(2, '0')

    return `${year}${month}${day}`
  }

  /**
   * Sync sales data for a specific POS integration
   */
  async syncSalesForIntegration(
    integrationId: string,
    options?: {
      startDate?: Date
      endDate?: Date
      forced?: boolean // Skip last sync check
      lastCountDate: Date
    }
  ): Promise<{
    success: boolean
    processed: number
    errors: number
    newSales: number
    duplicates: number
    errorDetails?: string[]
  }> {
    // Get integration details
    const integration = await this.prisma.pOSIntegration.findUnique({
      where: { id: integrationId },
      include: {
        organization: true,
      },
    })

    if (!integration) {
      throw new AppError(ErrorCode.NOT_FOUND, 'POS integration not found')
    }

    if (!integration.isActive) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'POS integration is not active'
      )
    }

    const organizationId = integration.organizationId
    try {
      const completedCount = await this.prisma.inventoryCount
        .findFirst({
          where: {
            status: 'APPROVED',
          },
        })
        .then((r) => !!r)
      if (!completedCount) {
        return {
          success: true,
          processed: 0,
          errors: 0,
          newSales: 0,
          duplicates: 0,
        }
      }

      // Determine date range for sync
      const endDate = options?.endDate || new Date()
      let startDate = options?.startDate

      if (!startDate && !options?.forced && options?.lastCountDate) {
        // Use last sales sync time as start date (default to last count date for business date approach)
        startDate = integration.lastSalesSyncAt
          ? new Date(integration.lastSalesSyncAt.getTime() + 1000) // Start 1 second after last sync
          : options.lastCountDate // last count date for business date safety
      } else if (!startDate && options?.lastCountDate) {
        // Forced sync without start date - use last count date for comprehensive sync
        startDate = options.lastCountDate
      } else {
        // Forced sync without start date - use 7 days ago for comprehensive sync
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }

      // For now, we'll use the Toast client directly
      // TODO: Refactor POS client interface to support sales fetching
      if (integration.type !== 'TOAST') {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Sales sync only supports Toast POS currently'
        )
      }

      // Import Toast client directly
      const { ToastAPIClient } = await import(
        '@happy-bar/pos/dist/toast/client'
      )

      // Create callback to save updated credentials
      const updateCredentials = async (updatedCredentials: any) => {
        await this.prisma.pOSIntegration.update({
          where: { id: integrationId },
          data: { credentials: updatedCredentials },
        })
      }

      const posClient = new ToastAPIClient(
        integration.credentials as any,
        updateCredentials
      )

      // Get restaurants/locations for this integration
      const restaurants = await posClient.getRestaurants()

      if (restaurants.length === 0) {
        console.warn(`No restaurants found for integration ${integration.name}`)
        return {
          success: true,
          processed: 0,
          errors: 0,
          newSales: 0,
          duplicates: 0,
        }
      }

      let totalProcessed = 0
      let totalErrors = 0
      let totalNewSales = 0
      let totalDuplicates = 0
      const errorDetails: string[] = []

      // Sync sales from each restaurant
      for (const restaurant of restaurants) {
        try {
          // Try to use business date approach for better accuracy
          let orders: any[] = []

          try {
            // Calculate business dates based on restaurant's timezone and closeout hour
            const restaurantTimeZone =
              restaurant.general?.timeZone || 'America/Chicago'
            const closeoutHour = restaurant.general?.closeoutHour || 3

            // Calculate business date range
            const startBusinessDate = this.calculateBusinessDate(
              startDate,
              restaurantTimeZone,
              closeoutHour
            )
            const endBusinessDate = this.calculateBusinessDate(
              endDate,
              restaurantTimeZone,
              closeoutHour
            )

            // Use business date range if available
            if (startBusinessDate === endBusinessDate) {
              // Single business date - more efficient
              orders = await posClient.getOrdersByBusinessDate(
                restaurant.guid,
                startBusinessDate
              )
            } else {
              // Multiple business dates
              orders = await posClient.getOrdersByBusinessDateRange(
                restaurant.guid,
                startBusinessDate,
                endBusinessDate
              )
            }
          } catch (businessDateError) {
            console.warn(
              `Business date fetching failed, falling back to timestamp range:`,
              businessDateError
            )
            // Fallback to timestamp-based approach
            orders = await posClient.getOrders(
              restaurant.guid,
              startDate,
              endDate
            )
          }

          const sales = posClient.convertToPOSSales(orders)

          // Process each sale
          for (const sale of sales) {
            try {
              const result = await this.processSale(
                organizationId,
                integrationId,
                sale,
                options?.lastCountDate
              )

              totalProcessed++
              if (result.isNew) {
                totalNewSales++
              } else {
                totalDuplicates++
              }
            } catch (error) {
              totalErrors++
              const errorMsg = `Failed to process sale ${sale.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`
              console.error(errorMsg)
              errorDetails.push(errorMsg)
            }
          }
        } catch (error) {
          const errorMsg = `Failed to sync sales from restaurant ${restaurant.general.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errorDetails.push(errorMsg)
          totalErrors++
        }
      }

      // Update integration sync status
      await this.prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: {
          lastSalesSyncAt: new Date(),
          syncStatus: totalErrors > 0 ? 'FAILED' : 'SUCCESS',
          syncErrors: totalErrors === 0 ? [] : undefined,
        },
      })

      // Create sync log entry
      await this.prisma.syncLog.create({
        data: {
          organizationId: integration.organizationId,
          syncType: 'SALES',
          status:
            totalErrors === 0
              ? 'SUCCESS'
              : totalErrors < totalProcessed
                ? 'PARTIAL_SUCCESS'
                : 'FAILED',
          recordsProcessed: totalProcessed,
          recordsFailed: totalErrors,
          errorMessage:
            errorDetails.length > 0 ? errorDetails.join('; ') : null,
          startDate: startDate,
          endDate: endDate,
          completedAt: new Date(),
        },
      })

      const result = {
        success: totalErrors === 0,
        processed: totalProcessed,
        errors: totalErrors,
        newSales: totalNewSales,
        duplicates: totalDuplicates,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      }

      return result
    } catch (error) {
      console.error(
        `Failed to sync sales for integration ${integrationId}:`,
        error
      )

      // Update integration sync status to error
      try {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown sync error'

        await this.prisma.pOSIntegration.update({
          where: { id: integrationId },
          data: {
            syncStatus: 'FAILED',
            syncErrors: [errorMessage],
          },
        })

        // Log the failed sync
        await this.prisma.syncLog.create({
          data: {
            organizationId,
            syncType: 'SALES',
            status: 'FAILED',
            recordsProcessed: 0,
            recordsFailed: 0,
            errorMessage,
            startDate: options?.startDate,
            endDate: options?.endDate || new Date(),
            completedAt: new Date(),
          },
        })
      } catch (updateError) {
        console.error('Failed to update integration sync status:', updateError)
      }

      throw error
    }
  }

  /**
   * Process a single sale and trigger inventory depletion
   */
  private async processSale(
    organizationId: string,
    integrationId: string,
    sale: POSSale,
    lastCountDate?: Date
  ): Promise<{ isNew: boolean; saleId?: string }> {
    // Check if this sale has already been processed
    const existingSale = await this.prisma.sale.findFirst({
      where: {
        organizationId,
        posId: sale.externalId,
      },
    })

    if (existingSale) {
      return { isNew: false, saleId: existingSale.id }
    }

    // Create sale record with items using the new schema
    // First, aggregate items by productId to handle duplicates
    const aggregatedItems = new Map<string, POSSaleItem>()
    for (const item of sale.items) {
      const existing = aggregatedItems.get(item.productId)
      if (existing) {
        // Aggregate quantities and prices for duplicate items
        existing.quantity += item.quantity
        existing.totalPrice += item.totalPrice
        // Recalculate unit price as weighted average
        existing.unitPrice = existing.totalPrice / existing.quantity
      } else {
        aggregatedItems.set(item.productId, { ...item })
      }
    }

    const saleRecord = await this.prisma.sale.create({
      data: {
        organizationId,
        posId: sale.externalId, // Map externalId to posId
        totalAmount: sale.totalAmount,
        saleDate: sale.timestamp,
        items: {
          create: await Promise.all(
            Array.from(aggregatedItems.values()).map(async (item) => {
              // Find the POS product for this sale item
              const posProduct = await this.prisma.pOSProduct.findFirst({
                where: {
                  organizationId,
                  integrationId,
                  externalId: item.productId,
                },
                include: {
                  mappings: true,
                  recipePOSMappings: {
                    include: {
                      recipe: true,
                    },
                  },
                },
              })

              if (!posProduct) {
                console.warn(
                  `POS Product not found for external ID: ${item.productId}`
                )
                // Create a placeholder POS product if it doesn't exist
                const newPosProduct = await this.prisma.pOSProduct.create({
                  data: {
                    organizationId,
                    integrationId,
                    externalId: item.productId,
                    name: `Unknown Product ${item.productId}`,
                    isActive: true,
                  },
                })

                return {
                  posProductId: newPosProduct.id,
                  itemName: item.name || newPosProduct.name,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                }
              }

              // Determine if this maps to a product or recipe
              const productMapping = posProduct.mappings[0]
              const recipeMapping = posProduct.recipePOSMappings[0]

              return {
                posProductId: posProduct.id,
                productId: productMapping?.productId || undefined,
                recipeId: recipeMapping?.recipeId || undefined,
                itemName: item.name || posProduct.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              }
            })
          ),
        },
      },
      include: {
        items: true,
      },
    })

    // Check if we should deplete inventory for this sale
    // Only deplete if the sale occurred after the last approved inventory count
    const shouldDepleteInventory = !lastCountDate || sale.timestamp > lastCountDate
    
    if (!shouldDepleteInventory) {
      console.log(`⏭️  Skipping inventory depletion for sale ${sale.externalId} (${sale.timestamp.toISOString()}) - occurred before last approved count (${lastCountDate?.toISOString()})`)
      return { isNew: true, saleId: saleRecord.id }
    }

    // Process inventory depletion for each aggregated sale item
    console.log(`✅ Processing inventory depletion for sale ${sale.externalId} (${sale.timestamp.toISOString()}) - occurred after last approved count`)
    const inventoryResults = []
    const inventoryErrors = []

    for (const item of aggregatedItems.values()) {
      try {
        const result = await this.inventoryService.depleteInventoryForSaleItem(
          organizationId,
          integrationId,
          item.productId, // This is the external product ID from POS
          item.quantity,
          sale.externalId,
          sale.timestamp.toISOString(),
          {
            source: 'pos_cron_sync', // Let settings determine policy
          }
        )

        inventoryResults.push({
          productId: item.productId,
          quantity: item.quantity,
          ...result,
        })
      } catch (error) {
        const errorMsg = `❌ Failed to deplete inventory for item ${item.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        // console.error(errorMsg)
        inventoryErrors.push(errorMsg)

        // Don't fail the entire sale if individual item depletion fails
        // This allows sales to be recorded even if inventory mapping is incomplete
      }
    }

    return { isNew: true, saleId: saleRecord.id }
  }

  /**
   * Sync sales for all active integrations
   */
  async syncAllIntegrations(options?: {
    organizationId?: string
    forced?: boolean
  }): Promise<{
    success: boolean
    totalIntegrations: number
    successCount: number
    errorCount: number
    results: Array<{
      integrationId: string
      integrationName: string
      success: boolean
      processed: number
      newSales: number
      error?: string
    }>
  }> {
    const whereClause = {
      isActive: true,
      ...(options?.organizationId && {
        organizationId: options.organizationId,
      }),
    }

    const integrations = await this.prisma.pOSIntegration.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        organizationId: true,
        type: true,
        credentials: true,
        lastSalesSyncAt: true,
      },
    })

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const integration of integrations) {
      try {
        const completedCount = await this.prisma.inventoryCount.findFirst({
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
            await this.prisma.syncLog.create({
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
          results.push({
            integrationId: integration.id,
            integrationName: integration.name,
            success: true,
            processed: 0,
            newSales: 0,
          })
          successCount++
          continue
        }

        const result = await this.syncSalesForIntegration(integration.id, {
          forced: options?.forced,
          lastCountDate: completedCount.approvedAt,
        })

        results.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: result.success,
          processed: result.processed,
          newSales: result.newSales,
        })

        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Failed to sync integration ${integration.name}:`, error)

        results.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: false,
          processed: 0,
          newSales: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        errorCount++
      }
    }

    return {
      success: errorCount === 0,
      totalIntegrations: integrations.length,
      successCount,
      errorCount,
      results,
    }
  }
}
