import { PrismaClient } from '../dist/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // const backup = fs.readFileSync(
  //   '../../backups/complete-backup-2025-08-20T22-22-04-440Z.json'
  // )
  // const catalog = fs.readFileSync('../../backups/catalog.json', 'utf-8')
  // const catalogna = fs.readFileSync('../../backups/catalog-na.json', 'utf-8')
  // const dnlds = fs.readFileSync('../../backups/dnlds.txt', 'utf-8')

  // const data = JSON.parse(backup.toString()) as any

  // await prisma.location.createMany({
  //   data: data.locations,
  // })
  // await prisma.category.createMany({
  //   data: data.categories,
  // })
  // await prisma.pOSIntegration.createMany({
  //   data: data.posIntegrations,
  // })
  // for await (const product of data.products) {
  //   await prisma.product.upsert({
  //     where: {
  //       id: product.id,
  //     },
  //     update: product,
  //     create: product,
  //   })
  // }
  // await prisma.pOSProduct.createMany({
  //   data: data.posProducts,
  // })
  // await prisma.productMapping.createMany({
  //   data: data.productMappings,
  // })
  // await prisma.inventoryCount.createMany({
  //   data: data.inventoryCounts,
  // })
  // await prisma.countArea.createMany({
  //   data: data.countAreas,
  // })
  // await prisma.inventoryCountItem.createMany({
  //   data: data.inventoryCountItems,
  // })
  // await prisma.inventoryItem.createMany({
  //   data: data.inventoryItems,
  // })
  // await prisma.recipe.createMany({
  //   data: data.recipes,
  // })
  // await prisma.recipeItem.createMany({
  //   data: data.recipeItems,
  // })
  // await prisma.recipePOSMapping.createMany({
  //   data: data.recipePOSMappings,
  // })
  // for await (const posProduct of data.posProducts) {
  //   await prisma.pOSProduct.upsert({
  //     where: {
  //       id: posProduct.id,
  //     },
  //     update: posProduct,
  //     create: posProduct,
  //   })
  // }
  // await prisma.productMapping.createMany({
  //   data: data.productMappings,
  // })
  // await prisma.inventorySettings.createMany({
  //   data: data.inventorySettings,
  // })

  // Create sample products
  // const products = [
  //   {
  //     name: 'Budweiser 12oz Bottle',
  //     sku: 'BUD-12OZ',
  //     categoryId: beerCategory.id,
  //     unit: 'bottle',
  //     packageSize: 1,
  //     costPerUnit: 1.25,
  //     sellPrice: 4.5,
  //     alcoholContent: 5.0,
  //   },
  //   {
  //     name: 'Stella Artois Draft',
  //     sku: 'STELLA-DRAFT',
  //     categoryId: beerCategory.id,
  //     unit: 'keg',
  //     packageSize: 15.5, // gallon keg
  //     costPerUnit: 95.0,
  //     sellPrice: 6.0,
  //     alcoholContent: 5.2,
  //   },
  //   {
  //     name: 'House Cabernet 750ml',
  //     sku: 'CAB-HOUSE',
  //     categoryId: wineCategory.id,
  //     unit: 'bottle',
  //     packageSize: 750,
  //     costPerUnit: 8.5,
  //     sellPrice: 32.0,
  //     alcoholContent: 13.5,
  //   },
  //   {
  //     name: 'Grey Goose Vodka 1L',
  //     sku: 'GOOSE-1L',
  //     categoryId: spiritsCategory.id,
  //     unit: 'bottle',
  //     packageSize: 1000,
  //     costPerUnit: 28.0,
  //     sellPrice: 12.0, // per pour
  //     alcoholContent: 40.0,
  //   },
  // ]

  // for (const productData of products) {
  //   const product = await prisma.product.upsert({
  //     where: {
  //       tenantId_sku: {
  //         tenantId: tenant.id,
  //         sku: productData.sku!,
  //       },
  //     },
  //     update: {},
  //     create: {
  //       ...productData,
  //       tenantId: tenant.id,
  //     },
  //   })

  //   // First check if inventory item exists
  //   const existingItem = await prisma.inventoryItem.findFirst({
  //     where: {
  //       tenantId: tenant.id,
  //       productId: product.id,
  //       locationId: mainStorage.id,
  //     },
  //   })

  //   existingItem
  //     ? await prisma.inventoryItem.update({
  //         where: { id: existingItem.id },
  //         data: {
  //           currentQuantity: Math.floor(Math.random() * 50) + 10, // Random quantity 10-60
  //           minimumQuantity: 5,
  //         },
  //       })
  //     : await prisma.inventoryItem.create({
  //         data: {
  //           tenantId: tenant.id,
  //           productId: product.id,
  //           locationId: mainStorage.id,
  //           currentQuantity: Math.floor(Math.random() * 50) + 10, // Random quantity 10-60
  //           minimumQuantity: 5,
  //         },
  //       })

  //   console.log('✅ Created product:', product.name)
  // }

  // // Create a sample supplier
  // const supplier = await prisma.supplier.upsert({
  //   where: {
  //     tenantId_name: {
  //       tenantId: tenant.id,
  //       name: 'ABC Beverage Distributors',
  //     },
  //   },
  //   update: {},
  //   create: {
  //     tenantId: tenant.id,
  //     name: 'ABC Beverage Distributors',
  //     contactEmail: 'orders@abcbeverage.com',
  //     contactPhone: '+1-555-123-4567',
  //     terms: 'NET30',
  //   },
  // })

  // console.log('✅ Created supplier:', supplier.name)

  // console.log('🎉 Database seed completed successfully!')
  // console.log('')
  // console.log('Demo credentials:')
  // console.log('  Email: admin@demo.com')
  // console.log('  Password: demo123')
  // console.log('  Domain: demo')

  // const prods = await prisma.productCatalog.findMany({
  //   where: { categoryId: 'cmek26esd0003livta4nz094o' },
  // })
  // fs.writeFileSync('../../backups/catalogna.json', JSON.stringify(prods))

  // await prisma.productCatalog.createMany({
  //   data: JSON.parse(catalogna),
  //   skipDuplicates: true,
  // })

  // for await (const product of JSON.parse(catalog)) {
  //   const { id, name } = product
  //   await prisma.productCatalog
  //     .update({
  //       where: {
  //         id,
  //       },
  //       data: {
  //         name,
  //       },
  //     })
  //     .catch(() => {
  //       console.error(id)
  //     })
  // }

  // const images = dnlds.split('\n')
  // for (const image of images) {
  //   if (!image) continue
  //   await prisma.productCatalog.update({
  //     where: {
  //       id: image,
  //     },
  //     data: {
  //       image: `https://happy-bar-catalog.s3.us-east-2.amazonaws.com/${image}`,
  //     },
  //   })
  // }
  const p = await prisma.productCatalog.findMany()
  for (const product of p) {
    await prisma.productCatalog.update({
      where: {
        id: product.id,
      },
      data: {
        costPerUnit: product.costPerUnit
          ? Number(product.costPerUnit.toFixed(2))
          : undefined,
        costPerCase: product.costPerCase
          ? Number(product.costPerCase.toFixed(2))
          : undefined,
      },
    })
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
