import { Prisma, PrismaClient } from '@happy-bar/database'
import { DefaultArgs } from '@happy-bar/database/dist/client/runtime/library'
import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  authMiddleware,
  requireAnyPermission,
  requirePermission,
} from '../middleware/auth-simple'
import { getAccessibleLocationIds } from '../utils/permissions'

// Validation schemas
const createProductSchema = z.object({
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
  costPerUnit: z.number().min(0),
  costPerCase: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  alcoholContent: z.number().optional(),
  supplierId: z.string().optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  upc: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z
    .enum(['ml', 'L', 'fl oz', 'gal', 'g', 'kg', 'lb', 'count', 'cl', 'oz'])
    .optional(),
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
  unitSize: z.number().positive().optional(),
  caseSize: z.number().positive().optional(),
  costPerUnit: z.number().min(0).optional(),
  costPerCase: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  alcoholContent: z.number().optional(),
  supplierId: z.string().optional(),
  isActive: z.boolean().optional(),
})

const updateInventorySchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  quantity: z.number().optional(),
  minimumQuantity: z.number().min(0).optional(),
  maximumQuantity: z.number().min(0).optional(),
  notes: z.string().optional(),
})

const countItemSchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  actualQuantity: z.number(),
  notes: z.string().optional(),
})

// Helper to get organization ID or throw error
function getOrganizationId(request: FastifyRequest): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

// Helper to get accessible location IDs for user
async function getLocationFilter(
  request: FastifyRequest,
  prisma: any
): Promise<{ id: { in: string[] } } | {}> {
  const accessibleLocationIds = await getAccessibleLocationIds(
    request.member!.role,
    request.organization!.id,
    (request.user! as any).id,
    prisma
  )

  // If user can access all locations or has admin privileges, return empty filter
  if (['owner', 'admin', 'manager', 'buyer'].includes(request.member!.role)) {
    return {}
  }

  // Otherwise filter by accessible locations
  return accessibleLocationIds.length > 0
    ? { id: { in: accessibleLocationIds } }
    : { id: 'NEVER_MATCH' }
}

export const inventoryRoutes: FastifyPluginAsync = async function (fastify) {
  // Authentication is now handled by global Better Auth organization middleware

  // Get all products
  fastify.get(
    '/products',
    {
      preHandler: [authMiddleware, requirePermission('products', 'read')],
    },
    async (request: FastifyRequest, _reply) => {
      // Get location filter for the current user
      const locationFilter = await getLocationFilter(request, fastify.prisma)
      
      const products = await fastify.prisma.product.findMany({
        where: { organizationId: getOrganizationId(request), isActive: true },
        include: {
          category: true,
          inventoryItems: {
            where: locationFilter,
            include: { location: true },
          },
          mappings: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return {
        success: true,
        data: products,
      }
    }
  )

  // Create new product
  fastify.post(
    '/products',
    {
      preHandler: [authMiddleware, requirePermission('products', 'write')],
    },
    async (request: FastifyRequest, reply) => {
      const data = createProductSchema.parse(request.body)

      const product = await fastify.prisma.product.create({
        data: {
          ...data,
          organizationId: getOrganizationId(request),
        },
        include: {
          category: true,
          inventoryItems: {
            include: { location: true },
          },
          mappings: {
            select: { id: true },
          },
        },
      })

      reply.code(201)
      return {
        success: true,
        data: product,
      }
    }
  )

  // Get single product
  fastify.get(
    '/products/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'read')],
    },
    async (request: FastifyRequest, _reply) => {
      const { id } = request.params as { id: string }

      const product = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
          isActive: true,
        },
        include: {
          category: true,
          inventoryItems: {
            include: { location: true },
          },
          mappings: {
            select: { id: true },
          },
        },
      })

      if (!product) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      return {
        success: true,
        data: product,
      }
    }
  )

  // Update product
  fastify.put(
    '/products/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'write')],
    },
    async (request: FastifyRequest, _reply) => {
      const { id } = request.params as { id: string }
      const data = updateProductSchema.parse(request.body)

      // Verify product exists and belongs to organization
      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
        },
        include: {
          mappings: true,
        },
      })

      if (!existingProduct) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      // Don't allow editing sellPrice for mapped products (POS-synced)
      const updateData = { ...data }
      if (existingProduct.mappings.length > 0 && data.sellPrice !== undefined) {
        delete updateData.sellPrice
      }

      const product = await fastify.prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          inventoryItems: {
            include: { location: true },
          },
          mappings: {
            select: { id: true },
          },
        },
      })

      return {
        success: true,
        data: product,
      }
    }
  )

  // Delete product (soft delete)
  fastify.delete(
    '/products/:id',
    {
      preHandler: [authMiddleware, requirePermission('products', 'delete')],
    },
    async (request: FastifyRequest, _reply) => {
      const { id } = request.params as { id: string }

      // Verify product exists and belongs to organization
      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
        },
      })

      if (!existingProduct) {
        throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
      }

      await fastify.prisma.product.update({
        where: { id },
        data: { isActive: false },
      })

      return {
        success: true,
        message: 'Product deleted successfully',
      }
    }
  )

  // Get inventory levels
  fastify.get(
    '/levels',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request: FastifyRequest, _reply) => {
      const locationFilter = await getLocationFilter(request, fastify.prisma)

      const inventory = await fastify.prisma.inventoryItem.findMany({
        where: {
          organizationId: getOrganizationId(request),
          location: locationFilter,
        },
        include: {
          product: {
            include: { category: true },
          },
          location: true,
        },
        orderBy: [{ product: { name: 'asc' } }, { location: { name: 'asc' } }],
      })

      return {
        success: true,
        data: inventory,
      }
    }
  )

  // Update inventory level
  fastify.post(
    '/levels',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'write')],
    },
    async (request: FastifyRequest, _reply) => {
      const data = updateInventorySchema.parse(request.body)
      const {
        productId,
        locationId,
        quantity,
        minimumQuantity,
        maximumQuantity,
      } = data

      // Check location access
      const locationFilter = await getLocationFilter(request, fastify.prisma)
      const canAccessLocation = await request.server.prisma.location.findFirst({
        where: {
          id: locationId,
          organizationId: getOrganizationId(request),
          ...(Object.keys(locationFilter).length > 0 ? locationFilter : {}),
        },
      })

      if (!canAccessLocation) {
        throw new AppError('Location access denied', ErrorCode.FORBIDDEN, 403)
      }

      // First check if inventory item exists
      const existingItem = await fastify.prisma.inventoryItem.findFirst({
        where: {
          organizationId: getOrganizationId(request),
          productId,
          locationId,
        },
      })

      // Prepare update data
      const updateData: any = {}
      if (quantity !== undefined) updateData.currentQuantity = quantity
      if (minimumQuantity !== undefined)
        updateData.minimumQuantity = minimumQuantity
      if (maximumQuantity !== undefined)
        updateData.maximumQuantity = maximumQuantity
      updateData.updatedAt = new Date()

      const inventoryItem = existingItem
        ? await fastify.prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: updateData,
            include: {
              product: true,
              location: true,
            },
          })
        : await fastify.prisma.inventoryItem.create({
            data: {
              organizationId: getOrganizationId(request),
              productId,
              locationId,
              currentQuantity: quantity || 0,
              minimumQuantity: minimumQuantity || 0,
              maximumQuantity: maximumQuantity,
            },
            include: {
              product: true,
              location: true,
            },
          })

      return {
        success: true,
        data: inventoryItem,
      }
    }
  )

  // Start inventory count
  fastify.post(
    '/counts',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'count')],
    },
    async (request: FastifyRequest, reply) => {
      const { name, scheduledAt } = request.body as {
        name: string
        scheduledAt?: Date
      }

      if (
        typeof request.user !== 'object' ||
        request.user === null ||
        Buffer.isBuffer(request.user)
      ) {
        throw new AppError('User not found', ErrorCode.UNAUTHORIZED, 401)
      }

      const count = await fastify.prisma.count.create({
        data: {
          organizationId: getOrganizationId(request),
          name,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          userId: (request.user as any).id,
          status: 'PLANNED',
        },
      })

      reply.code(201)
      return {
        success: true,
        data: count,
      }
    }
  )

  // Get inventory counts
  fastify.get(
    '/counts',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request: FastifyRequest, _reply) => {
      const counts = await fastify.prisma.inventoryCount.findMany({
        where: { organizationId: getOrganizationId(request) },
        include: {
          areas: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      const name = await fastify.prisma.user
        .findFirst({
          where: { id: counts[0]?.approvedById || '__UNKNOWN' },
          select: { name: true },
        })
        .then((user) => user?.name)

      return {
        success: true,
        data: counts.map((count) => ({
          id: count.id,
          name: count.name,
          status: count.status,
          scheduledAt: count.createdAt.toISOString(),
          startedAt: count.startedAt?.toISOString() || null,
          completedAt: count.completedAt?.toISOString() || null,
          user: name,
          itemsCount: count.itemsCounted,
        })),
      }
    }
  )

  // Submit count items
  fastify.post(
    '/counts/:countId/items',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'count')],
    },
    async (request: FastifyRequest, _reply) => {
      const { countId } = request.params as { countId: string }
      const items = request.body as z.infer<typeof countItemSchema>[]

      // Verify count belongs to organization
      const count = await fastify.prisma.count.findFirst({
        where: { id: countId, organizationId: getOrganizationId(request) },
      })

      if (!count) {
        throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
      }

      // Process count items in transaction
      const result = await fastify.prisma.$transaction(
        async (
          tx: Omit<
            PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
            '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
          >
        ) => {
          const countItems = []

          // Get accessible location IDs for validation
          const accessibleLocationIds = await getAccessibleLocationIds(
            request.member!.role,
            request.organization!.id,
            (request.user! as any).id,
            tx as any
          )

          for (const item of items) {
            // Check location access before processing
            if (
              !['owner', 'admin', 'manager', 'buyer'].includes(
                request.member!.role
              )
            ) {
              if (!accessibleLocationIds.includes(item.locationId)) {
                throw new AppError(
                  `Access denied to location ${item.locationId}`,
                  ErrorCode.FORBIDDEN,
                  403
                )
              }
            }

            // Get expected quantity from current inventory
            const inventoryItem = await tx.inventoryItem.findFirst({
              where: {
                organizationId: getOrganizationId(request),
                productId: item.productId,
                locationId: item.locationId,
              },
            })

            const expectedQuantity = inventoryItem?.currentQuantity || 0
            const variance = item.actualQuantity - expectedQuantity
            const variancePercent =
              expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0

            // Check if count item already exists
            const existingCountItem = await tx.countItem.findFirst({
              where: {
                countId,
                productId: item.productId,
                locationId: item.locationId,
              },
            })

            const countItem = existingCountItem
              ? await tx.countItem.update({
                  where: { id: existingCountItem.id },
                  data: {
                    actualQuantity: item.actualQuantity,
                    variance,
                    variancePercent,
                    notes: item.notes,
                    countedAt: new Date(),
                  },
                  include: {
                    product: true,
                    location: true,
                  },
                })
              : await tx.countItem.create({
                  data: {
                    countId,
                    productId: item.productId,
                    locationId: item.locationId,
                    expectedQuantity,
                    actualQuantity: item.actualQuantity,
                    variance,
                    variancePercent,
                    notes: item.notes,
                    countedAt: new Date(),
                  },
                  include: {
                    product: true,
                    location: true,
                  },
                })

            countItems.push(countItem)

            // Update inventory level
            const existingInventory = await tx.inventoryItem.findFirst({
              where: {
                organizationId: getOrganizationId(request),
                productId: item.productId,
                locationId: item.locationId,
              },
            })

            if (existingInventory) {
              await tx.inventoryItem.update({
                where: { id: existingInventory.id },
                data: {
                  currentQuantity: item.actualQuantity,
                  lastCountDate: new Date(),
                },
              })
            } else {
              await tx.inventoryItem.create({
                data: {
                  organizationId: getOrganizationId(request),
                  productId: item.productId,
                  locationId: item.locationId,
                  currentQuantity: item.actualQuantity,
                  lastCountDate: new Date(),
                },
              })
            }
          }

          // Update count status if all expected items are counted
          await tx.count.update({
            where: { id: countId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: count.startedAt || new Date(),
            },
          })

          return countItems
        }
      )

      return {
        success: true,
        data: result,
      }
    }
  )

  // Get low stock items
  fastify.get(
    '/low-stock',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request: FastifyRequest, _reply) => {
      const locationFilter = await getLocationFilter(request, fastify.prisma)

      // Get all inventory items and filter in application code
      const allInventoryItems = await fastify.prisma.inventoryItem.findMany({
        where: {
          organizationId: getOrganizationId(request),
          location: locationFilter,
        },
        include: {
          product: {
            include: { category: true },
          },
          location: true,
        },
        orderBy: { currentQuantity: 'asc' },
      })

      // Filter low stock items
      const lowStockItems = allInventoryItems.filter((item: any) => {
        if (item.minimumQuantity > 0) {
          return item.currentQuantity < item.minimumQuantity
        } else {
          // If no minimum is set, consider anything <= 5 as low stock
          return item.currentQuantity <= 5
        }
      })

      return {
        success: true,
        data: lowStockItems,
      }
    }
  )

  // Update inventory level (par levels, etc.)
  fastify.put(
    '/levels/:id',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['inventory.write', 'inventory.par_levels']),
      ],
    },
    async (request: FastifyRequest, _reply) => {
      const { id } = request.params as { id: string }
      const updateData = z
        .object({
          minimumQuantity: z.number().min(0).optional(),
          maximumQuantity: z.number().min(0).optional(),
          currentQuantity: z.number().min(0).optional(),
        })
        .parse(request.body)

      // Verify inventory item belongs to organization and user has location access
      const locationFilter = await getLocationFilter(request, fastify.prisma)
      const existingItem = await fastify.prisma.inventoryItem.findFirst({
        where: {
          id,
          organizationId: getOrganizationId(request),
          location: locationFilter,
        },
      })

      if (!existingItem) {
        throw new AppError('Inventory item not found', ErrorCode.NOT_FOUND, 404)
      }

      const updatedItem = await fastify.prisma.inventoryItem.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            include: { category: true },
          },
          location: true,
        },
      })

      return {
        success: true,
        data: updatedItem,
      }
    }
  )
}
