#!/usr/bin/env node

import { PrismaClient } from '@happy-bar/database'
import { SalesCountUpdater } from '../utils/sales-count-updater'

async function updateAllSalesCounts() {
  const prisma = new PrismaClient()
  const salesCountUpdater = new SalesCountUpdater(prisma)

  try {
    await salesCountUpdater.updateAllProductSalesCounts()

    // Show some stats
    const totalProducts = await prisma.product.count()
    const productsWithSales = await prisma.product.count({
      where: {
        salesCount: {
          gt: 0,
        },
      },
    })
  } catch (error) {
    console.error('❌ Failed to update sales counts:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  updateAllSalesCounts()
}

export { updateAllSalesCounts }
