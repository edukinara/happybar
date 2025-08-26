#!/usr/bin/env tsx

/**
 * Migration script to transition from Tenant-based to Organization-based architecture
 *
 * This script will:
 * 1. Create organizations from existing tenants
 * 2. Migrate all tenant-related data to use organizationId
 * 3. Clean up old tenant references
 */

import { PrismaClient } from '../dist/client'

const prisma = new PrismaClient()

interface MigrationStats {
  organizationsCreated: number
  locationsUpdated: number
  zonesUpdated: number
  aislesUpdated: number
  shelvesUpdated: number
  binsUpdated: number
  categoriesUpdated: number
  productsUpdated: number
  suppliersUpdated: number
  ordersUpdated: number
  inventoryItemsUpdated: number
  recipesUpdated: number
  salesUpdated: number
  analyticsUpdated: number
  posIntegrationsUpdated: number
  posProductsUpdated: number
  productMappingsUpdated: number
  integrationGroupsUpdated: number
  countsUpdated: number
}

async function migrateToOrganizations(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    organizationsCreated: 0,
    locationsUpdated: 0,
    zonesUpdated: 0,
    aislesUpdated: 0,
    shelvesUpdated: 0,
    binsUpdated: 0,
    categoriesUpdated: 0,
    productsUpdated: 0,
    suppliersUpdated: 0,
    ordersUpdated: 0,
    inventoryItemsUpdated: 0,
    recipesUpdated: 0,
    salesUpdated: 0,
    analyticsUpdated: 0,
    posIntegrationsUpdated: 0,
    posProductsUpdated: 0,
    productMappingsUpdated: 0,
    integrationGroupsUpdated: 0,
    countsUpdated: 0,
  }

  console.log(
    '🚀 Starting migration from Tenant to Organization architecture...\n'
  )

  try {
    // Check if we have any tenant data to migrate
    let tenantCount: any[]
    try {
      tenantCount =
        await prisma.$queryRaw`SELECT COUNT(*) as count FROM tenants`
    } catch (error: any) {
      if (
        error.code === 'P2010' &&
        error.meta?.message?.includes('relation "tenants" does not exist')
      ) {
        console.log(
          '✅ No tenant table found. This database is already using organization-based architecture.'
        )
        return stats
      }
      throw error
    }

    const tenantCountValue =
      Array.isArray(tenantCount) &&
      tenantCount[0] &&
      typeof tenantCount[0] === 'object' &&
      tenantCount[0] !== null &&
      'count' in tenantCount[0]
        ? Number(tenantCount[0].count)
        : 0

    if (tenantCountValue === 0) {
      console.log(
        '✅ No tenant data found. Migration complete - this database is already using organization-based architecture.'
      )
      return stats
    }

    console.log(`📊 Found ${tenantCountValue} tenants to migrate\n`)

    // Step 1: Get all existing tenants
    const tenants = (await prisma.$queryRaw`SELECT * FROM tenants`) as any[]

    for (const tenant of tenants) {
      console.log(`📋 Migrating tenant: ${tenant.name} (${tenant.id})`)

      // Check if organization already exists for this tenant
      const existingOrg = await prisma.organization.findFirst({
        where: {
          OR: [{ slug: tenant.domain }, { name: tenant.name }],
        },
      })

      let organizationId: string

      if (existingOrg) {
        console.log(`   ℹ️ Organization already exists: ${existingOrg.name}`)
        organizationId = existingOrg.id
      } else {
        // Create organization from tenant
        const organization = await prisma.organization.create({
          data: {
            name: tenant.name,
            slug: tenant.domain,
            metadata: {
              plan: tenant.plan || 'free',
              settings: tenant.settings || {},
              migratedFromTenant: tenant.id,
            },
          },
        })

        organizationId = organization.id
        stats.organizationsCreated++
        console.log(`   ✅ Created organization: ${organization.name}`)
      }

      // Step 2: Migrate all related data
      console.log(`   📦 Migrating related data...`)

      // Update locations
      const locationsResult = await prisma.$executeRaw`
        UPDATE locations SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.locationsUpdated += Number(locationsResult)

      // Update zones
      const zonesResult = await prisma.$executeRaw`
        UPDATE zones SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.zonesUpdated += Number(zonesResult)

      // Update aisles
      const aislesResult = await prisma.$executeRaw`
        UPDATE aisles SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.aislesUpdated += Number(aislesResult)

      // Update shelves
      const shelvesResult = await prisma.$executeRaw`
        UPDATE shelves SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.shelvesUpdated += Number(shelvesResult)

      // Update bins
      const binsResult = await prisma.$executeRaw`
        UPDATE bins SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.binsUpdated += Number(binsResult)

      // Update categories
      const categoriesResult = await prisma.$executeRaw`
        UPDATE categories SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.categoriesUpdated += Number(categoriesResult)

      // Update products
      const productsResult = await prisma.$executeRaw`
        UPDATE products SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.productsUpdated += Number(productsResult)

      // Update suppliers
      const suppliersResult = await prisma.$executeRaw`
        UPDATE suppliers SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.suppliersUpdated += Number(suppliersResult)

      // Update orders
      const ordersResult = await prisma.$executeRaw`
        UPDATE orders SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.ordersUpdated += Number(ordersResult)

      // Update inventory items
      const inventoryResult = await prisma.$executeRaw`
        UPDATE inventory_items SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.inventoryItemsUpdated += Number(inventoryResult)

      // Update recipes
      const recipesResult = await prisma.$executeRaw`
        UPDATE recipes SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.recipesUpdated += Number(recipesResult)

      // Update sales
      const salesResult = await prisma.$executeRaw`
        UPDATE sales SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.salesUpdated += Number(salesResult)

      // Update analytics
      const analyticsResult = await prisma.$executeRaw`
        UPDATE analytics SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.analyticsUpdated += Number(analyticsResult)

      // Update POS integrations
      const posIntegrationsResult = await prisma.$executeRaw`
        UPDATE pos_integrations SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.posIntegrationsUpdated += Number(posIntegrationsResult)

      // Update POS products
      const posProductsResult = await prisma.$executeRaw`
        UPDATE pos_products SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.posProductsUpdated += Number(posProductsResult)

      // Update product mappings
      const productMappingsResult = await prisma.$executeRaw`
        UPDATE product_mappings SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.productMappingsUpdated += Number(productMappingsResult)

      // Update integration groups
      const integrationGroupsResult = await prisma.$executeRaw`
        UPDATE integration_groups SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.integrationGroupsUpdated += Number(integrationGroupsResult)

      // Update counts
      const countsResult = await prisma.$executeRaw`
        UPDATE counts SET "organizationId" = ${organizationId} 
        WHERE "tenantId" = ${tenant.id}
      `
      stats.countsUpdated += Number(countsResult)

      console.log(`   ✅ Migrated tenant: ${tenant.name}\n`)
    }

    console.log('📊 Migration Summary:')
    console.log(`   Organizations created: ${stats.organizationsCreated}`)
    console.log(`   Locations updated: ${stats.locationsUpdated}`)
    console.log(`   Zones updated: ${stats.zonesUpdated}`)
    console.log(`   Aisles updated: ${stats.aislesUpdated}`)
    console.log(`   Shelves updated: ${stats.shelvesUpdated}`)
    console.log(`   Bins updated: ${stats.binsUpdated}`)
    console.log(`   Categories updated: ${stats.categoriesUpdated}`)
    console.log(`   Products updated: ${stats.productsUpdated}`)
    console.log(`   Suppliers updated: ${stats.suppliersUpdated}`)
    console.log(`   Orders updated: ${stats.ordersUpdated}`)
    console.log(`   Inventory items updated: ${stats.inventoryItemsUpdated}`)
    console.log(`   Recipes updated: ${stats.recipesUpdated}`)
    console.log(`   Sales updated: ${stats.salesUpdated}`)
    console.log(`   Analytics updated: ${stats.analyticsUpdated}`)
    console.log(`   POS integrations updated: ${stats.posIntegrationsUpdated}`)
    console.log(`   POS products updated: ${stats.posProductsUpdated}`)
    console.log(`   Product mappings updated: ${stats.productMappingsUpdated}`)
    console.log(
      `   Integration groups updated: ${stats.integrationGroupsUpdated}`
    )
    console.log(`   Counts updated: ${stats.countsUpdated}`)

    console.log('\n✅ Migration completed successfully!')
    console.log('\n⚠️  Next steps:')
    console.log('   1. Verify all data has been migrated correctly')
    console.log('   2. Update application code to use organizationId')
    console.log('   3. Remove tenantId columns and tenant table')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }

  return stats
}

// Run migration if called directly
if (require.main === module) {
  migrateToOrganizations()
    .then((stats) => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { migrateToOrganizations }
