import type { PrismaClient } from '@happy-bar/database'

export class SalesCountUpdater {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Update sales count for a specific product
   */
  async updateProductSalesCount(productId: string): Promise<void> {
    try {
      const salesCount = await this.prisma.saleItem.count({
        where: {
          productId: productId,
        },
      })

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          salesCount: salesCount,
          salesCountUpdatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error(
        `Failed to update sales count for product ${productId}:`,
        error
      )
      // Don't throw to avoid breaking the main sales flow
    }
  }

  /**
   * Update sales counts for multiple products
   */
  async updateMultipleProductSalesCounts(productIds: string[]): Promise<void> {
    try {
      const promises = productIds.map((productId) =>
        this.updateProductSalesCount(productId)
      )
      await Promise.allSettled(promises) // Use allSettled to avoid one failure stopping all updates
    } catch (error) {
      console.error('Failed to update multiple product sales counts:', error)
    }
  }

  /**
   * Bulk update all products' sales counts (for initial setup or periodic refresh)
   */
  async updateAllProductSalesCounts(): Promise<void> {
    try {
      // Get all products with their current sales counts
      const salesCounts = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        _count: {
          productId: true,
        },
        where: {
          productId: {
            not: null,
          },
        },
      })

      // Update each product's sales count
      const updatePromises = salesCounts.map(async (item) => {
        if (item.productId) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              salesCount: item._count.productId,
              salesCountUpdatedAt: new Date(),
            },
          })
        }
      })

      await Promise.allSettled(updatePromises)

      // Also set salesCount to 0 for products with no sales
      await this.prisma.product.updateMany({
        where: {
          salesCountUpdatedAt: null,
        },
        data: {
          salesCount: 0,
          salesCountUpdatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to update all product sales counts:', error)
      throw error
    }
  }
}
