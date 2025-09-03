import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  upc: z.string().optional(),
  categoryId: z.string(),
  unit: z.enum([
    'ml',
    'L',
    'fl oz',
    'gal',
    'g',
    'kg',
    'lb',
    'count',
    'cl',
    'oz',
  ]),
  container: z
    .enum([
      'can',
      'bottle',
      'keg',
      'box',
      'bag',
      'carton',
      'unit',
      'firkin',
      'cask',
      'growler',
      'mini keg',
      'pouch',
      'jar',
      'beer ball',
      'reserved',
      'decanter',
      'cartridge',
      'fiasco',
      'bucket',
      'glass',
    ])
    .optional(),
  unitSize: z.number().positive().default(1),
  caseSize: z.number().positive().default(1),
  costPerUnit: z.number().min(0).default(0),
  costPerCase: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  alcoholContent: z.number().min(0).max(100).optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
})

const updateProductSchema = productSchema.partial()

const posProductImportSchema = z.object({
  integrationId: z.string(),
  productIds: z.array(z.string()).optional(), // If not provided, import all
  categoryFilter: z.string().optional(),
  selectedGroupGuids: z.array(z.string()).optional(), // Filter by menu groups
  autoMap: z.boolean().default(true),
})

const productMappingSchema = z.object({
  productId: z.string(),
  posProductId: z.string(),
  isConfirmed: z.boolean().default(true),
  servingUnit: z
    .enum([
      'container',
      'can',
      'bottle',
      'keg',
      'box',
      'bag',
      'carton',
      'unit',
      'firkin',
      'cask',
      'growler',
      'mini keg',
      'pouch',
      'jar',
      'beer ball',
      'reserved',
      'decanter',
      'cartridge',
      'fiasco',
      'bucket',
      'glass',
      'ml',
      'L',
      'fl oz',
      'gal',
      'g',
      'kg',
      'lb',
      'count',
      'cl',
      'oz',
    ])
    .optional(),
  servingSize: z.number().positive().optional(),
})

// Helper to get organization ID from authenticated request
function getOrganizationId(request: any): string {
  return request.organization!.id
}

export async function productRoutes(fastify: FastifyInstance) {
  // Authentication is now handled by global Better Auth organization middleware

  // Get all products
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('products', 'read')],
    },
    async (request: any, reply) => {
      const query = request.query as {
        page?: string
        limit?: string
        category?: string
        search?: string
        isActive?: string
      }

      const page = parseInt(query.page || '1', 10)
      const limit = !!query.limit
        ? parseInt(query.limit || '50', 10)
        : undefined
      const category = query.category
      const search = query.search
      const isActive =
        query.isActive === 'true'
          ? true
          : query.isActive === 'false'
            ? false
            : undefined

      const skip = limit ? (page - 1) * limit : undefined

      const where: any = {
        organizationId: getOrganizationId(request),
      }

      if (category) {
        where.category = { name: { contains: category, mode: 'insensitive' } }
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { upc: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      const [products, total] = await Promise.all([
        fastify.prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            mappings: {
              include: {
                posProduct: {
                  include: {
                    integration: true,
                  },
                },
              },
            },
            inventoryItems: {
              select: {
                id: true,
                currentQuantity: true,
                locationId: true,
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        fastify.prisma.product.count({ where }),
      ])

      return {
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            pages: limit ? Math.ceil(total / limit) : 1,
          },
        },
      }
    }
  )

  // Get product by ID
  fastify.get(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'read')],
    },
    async (request: any, reply) => {
      const { id } = request.params as { id: string }

      const product = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
        },
        include: {
          category: true,
          suppliers: {
            include: {
              supplier: true,
            },
          },
          mappings: {
            include: {
              posProduct: {
                include: {
                  integration: true,
                },
              },
            },
          },
          inventoryItems: {
            include: {
              location: true,
            },
          },
        },
      })

      if (!product) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      return { success: true, data: { product } }
    }
  )

  // Create product
  fastify.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('products', 'write')],
    },
    async (request: any, reply) => {
      const validatedData = productSchema.parse(request.body)

      // Check if SKU or UPC already exists
      if (validatedData.sku || validatedData.upc) {
        const existing = await fastify.prisma.product.findFirst({
          where: {
            organizationId: getOrganizationId(request),
            OR: [
              ...(validatedData.sku ? [{ sku: validatedData.sku }] : []),
              ...(validatedData.upc ? [{ upc: validatedData.upc }] : []),
            ],
          },
        })

        if (existing) {
          throw new AppError(
            'Product with this SKU or UPC already exists',
            ErrorCode.VALIDATION_ERROR,
            409
          )
        }
      }

      const product = await fastify.prisma.product.create({
        data: {
          ...validatedData,
          organizationId: getOrganizationId(request),
        },
        include: {
          category: true,
        },
      })

      return { success: true, data: { product } }
    }
  )

  // Update product
  fastify.put(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'write')],
    },
    async (request: any, reply) => {
      const { id } = request.params as { id: string }
      const validatedData = updateProductSchema.parse(request.body)

      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
        },
      })

      if (!existingProduct) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      // Check for SKU/UPC conflicts
      if (validatedData.sku || validatedData.upc) {
        const existing = await fastify.prisma.product.findFirst({
          where: {
            organizationId: getOrganizationId(request),
            id: { not: id },
            OR: [
              ...(validatedData.sku ? [{ sku: validatedData.sku }] : []),
              ...(validatedData.upc ? [{ upc: validatedData.upc }] : []),
            ],
          },
        })

        if (existing) {
          throw new AppError(
            'Product with this SKU or UPC already exists',
            ErrorCode.VALIDATION_ERROR,
            409
          )
        }
      }

      const product = await fastify.prisma.product.update({
        where: { id },
        data: validatedData,
        include: {
          category: true,
        },
      })

      return { success: true, data: { product } }
    }
  )

  // Delete product
  fastify.delete(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'delete')],
    },
    async (request: any, reply) => {
      const { id } = request.params as { id: string }

      const product = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
        },
      })

      if (!product) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      // Delete related records that don't have cascade delete
      // This includes InventoryCountItems which don't have onDelete: Cascade
      await fastify.prisma.$transaction([
        // Delete inventory count items first
        fastify.prisma.inventoryCountItem.deleteMany({
          where: { productId: id },
        }),
        // Delete audit logs
        fastify.prisma.auditLog.deleteMany({
          where: { productId: id },
        }),
        // Then delete the product
        fastify.prisma.product.delete({
          where: { id },
        }),
      ])

      return { success: true }
    }
  )

  // Get POS products for mapping
  fastify.get('/pos-products', async (request, reply) => {
    const query = request.query as {
      integrationId?: string
      unmappedOnly?: string
      search?: string
      category?: string
    }

    const integrationId = query.integrationId
    const unmappedOnly = query.unmappedOnly === 'true'
    const search = query.search
    const category = query.category

    const where: any = {
      organizationId: getOrganizationId(request),
    }

    if (!!integrationId) {
      where.integrationId = integrationId
    }

    if (!!unmappedOnly) {
      where.mappings = {
        none: {},
      }
    }

    if (!!search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (!!category) {
      where.category = { contains: category, mode: 'insensitive' }
    }

    const posProducts = await fastify.prisma.pOSProduct.findMany({
      where,
      include: {
        integration: true,
        mappings: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: { posProducts } }
  })

  // Import POS products
  fastify.post('/import-pos-products', async (request, reply) => {
    console.log('🚀 Starting POS product import...', request.body)
    const validatedData = posProductImportSchema.parse(request.body)

    const integration = await fastify.prisma.pOSIntegration.findFirst({
      where: {
        id: validatedData.integrationId,
        organizationId: getOrganizationId(request),
      },
    })

    if (!integration) {
      throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
    }

    // Import POS products via sync service
    const { createPOSClient } = await import('@happy-bar/pos')
    const { POSSyncService } = await import('../services/pos-sync')

    const { integrationId } = request.params as { integrationId: string }
    // Create callback to save updated credentials
    const updateCredentials = async (updatedCredentials: any) => {
      await fastify.prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { credentials: updatedCredentials },
      })
    }
    const client = createPOSClient(
      integration.credentials as any,
      updateCredentials
    )
    const syncService = new POSSyncService(fastify.prisma)

    try {
      // Determine location IDs based on integration mode
      const credentials = integration.credentials as any
      let locationIds: string[] = []

      if (credentials.integrationMode === 'standard') {
        // For Standard API Access, use the restaurant GUID
        if (credentials.partnerLocationId) {
          locationIds = [credentials.partnerLocationId]
        }
      } else {
        // For partner mode, we need location IDs - for now use empty array and let client handle it
        locationIds = []
      }

      // Determine which group GUIDs to use
      const selectedGroupGuids =
        validatedData.selectedGroupGuids ||
        (integration.selectedGroupGuids as string[]) ||
        []

      // Get products from POS
      const syncResult = await client.syncData(locationIds, {
        selectedGroupGuids:
          selectedGroupGuids.length > 0 ? selectedGroupGuids : undefined,
      })

      if (!syncResult.success) {
        throw new Error(
          `Failed to import POS products: ${syncResult.errors.join(', ')}`
        )
      }

      let importedCount = 0

      // Save products to database if we got them
      if (
        syncResult.productsSync &&
        syncResult.productsSync.products &&
        syncResult.productsSync.products.length > 0
      ) {
        console.log(
          `📦 About to save ${syncResult.productsSync.products.length} products to database`
        )
        console.log(
          `Organization: ${getOrganizationId(request)}, Integration: ${validatedData.integrationId}`
        )

        await syncService.saveProductsToDatabase(
          getOrganizationId(request),
          validatedData.integrationId,
          syncResult.productsSync.products
        )
        importedCount = syncResult.productsSync.products.length

        console.log(`✅ Successfully processed ${importedCount} products`)
      } else {
        console.log('❌ No products to save - sync result:', {
          hasProductsSync: !!syncResult.productsSync,
          hasProducts: !!syncResult.productsSync?.products,
          productCount: syncResult.productsSync?.products?.length || 0,
        })
      }

      // Auto-map products if requested
      if (validatedData.autoMap) {
        const autoMappingResult = await autoMapProducts(
          fastify,
          getOrganizationId(request),
          validatedData.integrationId
        )

        return {
          success: true,
          data: {
            success: true,
            imported: importedCount,
            autoMapped: autoMappingResult.mapped,
            suggestions: autoMappingResult.suggestions,
          },
        }
      }

      return {
        success: true,
        data: {
          success: true,
          imported: importedCount,
        },
      }
    } catch (error) {
      throw new AppError(
        `Failed to import POS products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.INTEGRATION_ERROR,
        400
      )
    }
  })

  // Create product mapping
  fastify.post('/mappings', async (request, reply) => {
    const validatedData = productMappingSchema.parse(request.body)

    // Verify product and POS product exist and belong to tenant
    const [product, posProduct] = await Promise.all([
      fastify.prisma.product.findFirst({
        where: {
          id: validatedData.productId,
          organizationId: getOrganizationId(request),
        },
      }),
      fastify.prisma.pOSProduct.findFirst({
        where: {
          id: validatedData.posProductId,
          organizationId: getOrganizationId(request),
        },
      }),
    ])

    if (!product) {
      throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
    }

    if (!posProduct) {
      throw new AppError('POS product not found', ErrorCode.NOT_FOUND, 404)
    }

    // Check if mapping already exists
    const existingMapping = await fastify.prisma.productMapping.findFirst({
      where: {
        organizationId: getOrganizationId(request),
        productId: validatedData.productId,
        posProductId: validatedData.posProductId,
      },
    })

    if (existingMapping) {
      throw new AppError(
        'Mapping already exists',
        ErrorCode.VALIDATION_ERROR,
        409
      )
    }

    const mapping = await fastify.prisma.productMapping.create({
      data: {
        productId: validatedData.productId,
        posProductId: validatedData.posProductId,
        isConfirmed: validatedData.isConfirmed,
        servingUnit: validatedData.servingUnit,
        servingSize: validatedData.servingSize,
        organizationId: getOrganizationId(request),
        mappedBy: (request.user as any)?.id,
        confidence: 1.0, // Manual mapping has full confidence
      },
      include: {
        product: true,
        posProduct: {
          include: {
            integration: true,
          },
        },
      },
    })

    return { success: true, data: { mapping } }
  })

  // Get product mappings
  fastify.get('/mappings', async (request, reply) => {
    const query = request.query as {
      integrationId?: string
      productId?: string
      unconfirmedOnly?: string
    }

    const integrationId = query.integrationId
    const productId = query.productId
    const unconfirmedOnly = query.unconfirmedOnly === 'true'

    const where: any = {
      organizationId: getOrganizationId(request),
    }

    if (integrationId) {
      where.posProduct = {
        integrationId,
      }
    }

    if (productId) {
      where.productId = productId
    }

    if (unconfirmedOnly) {
      where.isConfirmed = false
    }

    const mappings = await fastify.prisma.productMapping.findMany({
      where,
      include: {
        product: true,
        posProduct: {
          include: {
            integration: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: { mappings } }
  })

  // Update product mapping
  fastify.put('/mappings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const validatedData = productMappingSchema.parse(request.body)

    // Check if mapping exists and belongs to tenant
    const existingMapping = await fastify.prisma.productMapping.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!existingMapping) {
      throw new AppError('Mapping not found', ErrorCode.NOT_FOUND, 404)
    }

    // Verify product and POS product exist and belong to tenant
    const [product, posProduct] = await Promise.all([
      fastify.prisma.product.findFirst({
        where: {
          id: validatedData.productId,
          organizationId: getOrganizationId(request),
        },
      }),
      fastify.prisma.pOSProduct.findFirst({
        where: {
          id: validatedData.posProductId,
          organizationId: getOrganizationId(request),
        },
      }),
    ])

    if (!product) {
      throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
    }

    if (!posProduct) {
      throw new AppError('POS product not found', ErrorCode.NOT_FOUND, 404)
    }

    // Check if mapping to this POS product already exists (different mapping ID)
    const conflictingMapping = await fastify.prisma.productMapping.findFirst({
      where: {
        organizationId: getOrganizationId(request),
        productId: validatedData.productId,
        posProductId: validatedData.posProductId,
        id: { not: id },
      },
    })

    if (conflictingMapping) {
      throw new AppError(
        'Another mapping already exists for this product-POS product combination',
        ErrorCode.VALIDATION_ERROR,
        409
      )
    }

    const updatedMapping = await fastify.prisma.productMapping.update({
      where: { id },
      data: {
        productId: validatedData.productId,
        posProductId: validatedData.posProductId,
        isConfirmed: validatedData.isConfirmed,
        servingUnit: validatedData.servingUnit,
        servingSize: validatedData.servingSize,
        updatedAt: new Date(),
        mappedBy: (request.user as any)?.id,
        confidence: 1.0, // Manual update has full confidence
      },
      include: {
        product: true,
        posProduct: {
          include: {
            integration: true,
          },
        },
      },
    })

    return { success: true, data: { mapping: updatedMapping } }
  })

  // Delete product mapping
  fastify.delete('/mappings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const mapping = await fastify.prisma.productMapping.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!mapping) {
      throw new AppError('Mapping not found', ErrorCode.NOT_FOUND, 404)
    }

    await fastify.prisma.productMapping.delete({
      where: { id },
    })

    return { success: true }
  })

  // Get auto-mapping suggestions
  fastify.get('/mapping-suggestions/:integrationId', async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string }

    const suggestions = await generateMappingSuggestions(
      fastify,
      getOrganizationId(request),
      integrationId
    )

    return { success: true, data: { suggestions } }
  })

  // Update POS product serving information
  fastify.patch('/pos-products/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const validatedData = z
      .object({
        servingUnit: z.string().optional(),
        servingSize: z.number().positive().optional(),
      })
      .parse(request.body)

    const posProduct = await fastify.prisma.pOSProduct.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!posProduct) {
      throw new AppError('POS product not found', ErrorCode.NOT_FOUND, 404)
    }

    const updatedProduct = await fastify.prisma.pOSProduct.update({
      where: { id },
      data: {
        servingUnit:
          validatedData.servingUnit !== undefined
            ? validatedData.servingUnit
            : posProduct.servingUnit,
        servingSize:
          validatedData.servingSize !== undefined
            ? validatedData.servingSize
            : posProduct.servingSize,
      },
    })

    return { success: true, data: { posProduct: updatedProduct } }
  })

  // Get all categories for tenant
  fastify.get('/categories', async (request, reply) => {
    const categories = await fastify.prisma.category.findMany({
      where: {
        organizationId: getOrganizationId(request),
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: { categories } }
  })

  // Bulk create internal products from POS products
  fastify.post('/bulk-create-from-pos', async (request, reply) => {
    const validatedData = z
      .object({
        integrationId: z.string(),
        posProductIds: z.array(z.string()),
        categoryId: z.string().optional(),
        defaultUnit: z
          .enum([
            'ml',
            'L',
            'fl oz',
            'gal',
            'g',
            'kg',
            'lb',
            'count',
            'cl',
            'oz',
          ])
          .default('count'),
        defaultUnitSize: z.number().positive().default(1),
        defaultCaseSize: z.number().positive().default(1),
        defaultContainer: z
          .enum([
            'can',
            'bottle',
            'keg',
            'box',
            'bag',
            'carton',
            'unit',
            'firkin',
            'cask',
            'growler',
            'mini keg',
            'pouch',
            'jar',
            'beer ball',
            'reserved',
            'decanter',
            'cartridge',
            'fiasco',
            'bucket',
            'glass',
          ])
          .optional(),
        defaultServingUnit: z
          .enum([
            'container',
            'can',
            'bottle',
            'keg',
            'box',
            'bag',
            'carton',
            'unit',
            'firkin',
            'cask',
            'growler',
            'mini keg',
            'pouch',
            'jar',
            'beer ball',
            'reserved',
            'decanter',
            'cartridge',
            'fiasco',
            'bucket',
            'glass',
            'ml',
            'L',
            'fl oz',
            'gal',
            'g',
            'kg',
            'lb',
            'count',
            'cl',
            'oz',
          ])
          .optional(),
        defaultServingSize: z.number().positive().optional(),
      })
      .parse(request.body)

    const organizationId = getOrganizationId(request)

    // Get the POS products to create internal products from
    const posProducts = await fastify.prisma.pOSProduct.findMany({
      where: {
        id: { in: validatedData.posProductIds },
        organizationId,
        integrationId: validatedData.integrationId,
      },
    })

    if (posProducts.length === 0) {
      throw new AppError(
        'No valid POS products found',
        ErrorCode.NOT_FOUND,
        404
      )
    }

    // Check if we need a default category
    let defaultCategoryId = validatedData.categoryId
    if (!defaultCategoryId) {
      // Create or get a default category for imported products
      const defaultCategory = await fastify.prisma.category.upsert({
        where: {
          organizationId_name: {
            organizationId: organizationId,
            name: 'Imported from POS',
          },
        },
        update: {},
        create: {
          organizationId: organizationId,
          name: 'Imported from POS',
          // description: 'Products automatically imported from POS system',
        },
      })
      defaultCategoryId = defaultCategory.id
    }

    const createdProducts = []
    const createdMappings = []
    const errors = []

    for (const posProduct of posProducts) {
      try {
        // Update POS product with serving information if provided
        if (
          validatedData.defaultServingUnit ||
          validatedData.defaultServingSize
        ) {
          await fastify.prisma.pOSProduct.update({
            where: { id: posProduct.id },
            data: {
              servingUnit:
                validatedData.defaultServingUnit || posProduct.servingUnit,
              servingSize:
                validatedData.defaultServingSize || posProduct.servingSize,
            },
          })
        }

        // Check if a product with the same name or SKU already exists
        const existingProduct = await fastify.prisma.product.findFirst({
          where: {
            organizationId,
            OR: [
              { name: posProduct.name },
              ...(posProduct.sku ? [{ sku: posProduct.sku }] : []),
            ],
          },
        })

        if (existingProduct) {
          errors.push(`Product "${posProduct.name}" already exists`)
          continue
        }

        // Create internal product from POS product
        const internalProduct = await fastify.prisma.product.create({
          data: {
            organizationId,
            name: posProduct.name,
            sku: posProduct.sku || undefined,
            categoryId: defaultCategoryId,
            unit: validatedData.defaultUnit,
            container: validatedData.defaultContainer || undefined,
            unitSize: validatedData.defaultUnitSize,
            caseSize: validatedData.defaultCaseSize,
            costPerUnit: posProduct.price || 0,
            sellPrice: posProduct.price || undefined,
            isActive: posProduct.isActive,
          },
        })

        createdProducts.push(internalProduct)

        // Create automatic mapping between internal product and POS product
        const mapping = await fastify.prisma.productMapping.create({
          data: {
            organizationId,
            productId: internalProduct.id,
            posProductId: posProduct.id,
            confidence: 1.0, // Perfect match since we're creating from the POS product
            mappedBy: 'BULK_IMPORT',
            isConfirmed: true,
          },
        })

        createdMappings.push(mapping)
      } catch (error) {
        console.error('Error creating product from POS product:', error)
        errors.push(
          `Failed to create product "${posProduct.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return {
      success: true,
      data: {
        success: true,
        created: createdProducts.length,
        mapped: createdMappings.length,
        errors: errors.length,
        errorMessages: errors,
        products: createdProducts,
      },
    }
  })

  // Search Product Catalog
  fastify.get(
    '/catalog',
    {
      preHandler: [authMiddleware, requirePermission('products', 'read')],
    },
    async (request: any, reply) => {
      const query = request.query as {
        limit?: string
        search?: string
      }

      const limit = !!query.limit ? parseInt(query.limit || '25', 10) : 25
      const search = query.search

      const catalogMatches = await fastify.prisma.productCatalog.findMany({
        where: { name: { contains: search, mode: 'insensitive' } },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: limit,
        orderBy: { name: 'asc' },
      })

      return {
        success: true,
        data: catalogMatches,
      }
    }
  )
}

// Helper function to auto-map products
async function autoMapProducts(
  fastify: FastifyInstance,
  organizationId: string,
  integrationId: string
) {
  const suggestions = await generateMappingSuggestions(
    fastify,
    organizationId,
    integrationId
  )

  let mapped = 0
  const lowConfidenceSuggestions = []

  for (const suggestion of suggestions) {
    if (suggestion.confidence >= 0.8) {
      // Auto-map high confidence matches
      try {
        await fastify.prisma.productMapping.create({
          data: {
            organizationId,
            productId: suggestion.productId,
            posProductId: suggestion.posProductId,
            confidence: suggestion.confidence,
            isConfirmed: false, // Require manual confirmation for auto-mapped items
          },
        })
        mapped++
      } catch (error) {
        // Mapping might already exist, skip
      }
    } else {
      lowConfidenceSuggestions.push(suggestion)
    }
  }

  return {
    mapped,
    suggestions: lowConfidenceSuggestions,
  }
}

// Helper function to generate mapping suggestions
async function generateMappingSuggestions(
  fastify: FastifyInstance,
  organizationId: string,
  integrationId: string
) {
  // Get unmapped POS products
  const posProducts = await fastify.prisma.pOSProduct.findMany({
    where: {
      organizationId,
      integrationId,
      mappings: {
        none: {},
      },
      recipePOSMappings: {
        none: {},
      },
    },
  })

  // Get unmapped internal products
  const products = await fastify.prisma.product.findMany({
    where: {
      organizationId,
      // mappings: {
      //   none: {
      //     posProduct: {
      //       integrationId,
      //     },
      //   },
      // },
    },
  })

  const suggestions = []

  for (const posProduct of posProducts) {
    for (const product of products) {
      const confidence = calculateMappingConfidence(product, posProduct)

      if (confidence > 0.3) {
        // Only suggest if some confidence
        suggestions.push({
          productId: product.id,
          posProductId: posProduct.id,
          productName: product.name,
          posProductName: posProduct.name,
          confidence,
          reasons: getMappingReasons(product, posProduct),
        })
      }
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Helper function to calculate mapping confidence
function calculateMappingConfidence(product: any, posProduct: any): number {
  let confidence = 0

  // Exact name match
  if (product.name.toLowerCase() === posProduct.name.toLowerCase()) {
    confidence += 0.8
  }
  // Partial name match
  else if (
    product.name.toLowerCase().includes(posProduct.name.toLowerCase()) ||
    posProduct.name.toLowerCase().includes(product.name.toLowerCase())
  ) {
    confidence += 0.4
  }

  // SKU match
  if (product.sku && posProduct.sku && product.sku === posProduct.sku) {
    confidence += 0.6
  }

  // Category match (if available)
  if (product.category?.name && posProduct.category) {
    if (
      product.category.name.toLowerCase() === posProduct.category.toLowerCase()
    ) {
      confidence += 0.3
    }
  }

  // Price match (within 10%)
  if (product.sellPrice && posProduct.price) {
    const priceDiff =
      Math.abs(product.sellPrice - posProduct.price) / product.sellPrice
    if (priceDiff <= 0.1) {
      confidence += 0.2
    }
  }

  return Math.min(confidence, 1.0)
}

// Helper function to get mapping reasons
function getMappingReasons(product: any, posProduct: any): string[] {
  const reasons = []

  if (product.name.toLowerCase() === posProduct.name.toLowerCase()) {
    reasons.push('Exact name match')
  } else if (
    product.name.toLowerCase().includes(posProduct.name.toLowerCase()) ||
    posProduct.name.toLowerCase().includes(product.name.toLowerCase())
  ) {
    reasons.push('Partial name match')
  }

  if (product.sku && posProduct.sku && product.sku === posProduct.sku) {
    reasons.push('SKU match')
  }

  if (product.category?.name && posProduct.category) {
    if (
      product.category.name.toLowerCase() === posProduct.category.toLowerCase()
    ) {
      reasons.push('Category match')
    }
  }

  if (product.sellPrice && posProduct.price) {
    const priceDiff =
      Math.abs(product.sellPrice - posProduct.price) / product.sellPrice
    if (priceDiff <= 0.1) {
      reasons.push('Price match')
    }
  }

  return reasons
}
