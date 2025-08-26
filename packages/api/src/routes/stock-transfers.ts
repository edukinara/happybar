import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireTransferApproval } from '../middleware/approval'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'
import {
  checkLocationAccess,
  getAccessibleLocationIds,
} from '../utils/permissions'

export default async function stockTransferRoutes(fastify: FastifyInstance) {
  // Create a stock transfer between locations
  fastify.post(
    '/transfers',
    {
      preHandler: [
        authMiddleware,
        requirePermission('inventory', 'transfer'),
        requireTransferApproval(),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organization = request.organization!

      const validatedData = z
        .object({
          productId: z.string(),
          fromLocationId: z.string(),
          toLocationId: z.string(),
          quantity: z.number().positive(),
          notes: z.string().optional(),
        })
        .parse(request.body)

      const user = (request as any).user

      try {
        // Check location access for both source and destination locations
        const canAccessFrom = await checkLocationAccess(
          (request as any).member.role,
          validatedData.fromLocationId,
          organization.id,
          user.id,
          fastify.prisma,
          'write' // Need write access to transfer from
        )

        const canAccessTo = await checkLocationAccess(
          (request as any).member.role,
          validatedData.toLocationId,
          organization.id,
          user.id,
          fastify.prisma,
          'write' // Need write access to transfer to
        )

        if (!canAccessFrom) {
          return reply.code(403).send({
            error: 'You do not have access to the source location',
          })
        }

        if (!canAccessTo) {
          return reply.code(403).send({
            error: 'You do not have access to the destination location',
          })
        }

        // Start a transaction to ensure consistency
        const result = await fastify.prisma.$transaction(async (tx) => {
          // Get source inventory
          const sourceInventory = await tx.inventoryItem.findFirst({
            where: {
              organizationId: organization.id,
              productId: validatedData.productId,
              locationId: validatedData.fromLocationId,
            },
          })

          if (!sourceInventory) {
            throw new Error('Source inventory not found')
          }

          if (sourceInventory.currentQuantity < validatedData.quantity) {
            throw new Error(
              `Insufficient stock. Available: ${sourceInventory.currentQuantity}`
            )
          }

          // Get or create destination inventory
          let destInventory = await tx.inventoryItem.findFirst({
            where: {
              organizationId: organization.id,
              productId: validatedData.productId,
              locationId: validatedData.toLocationId,
            },
          })

          if (!destInventory) {
            // Create new inventory record at destination
            destInventory = await tx.inventoryItem.create({
              data: {
                organizationId: organization.id,
                productId: validatedData.productId,
                locationId: validatedData.toLocationId,
                currentQuantity: 0,
                minimumQuantity: sourceInventory.minimumQuantity,
                maximumQuantity: sourceInventory.maximumQuantity,
              },
            })
          }

          // Update quantities
          await tx.inventoryItem.update({
            where: { id: sourceInventory.id },
            data: {
              currentQuantity: {
                decrement: validatedData.quantity,
              },
            },
          })

          await tx.inventoryItem.update({
            where: { id: destInventory.id },
            data: {
              currentQuantity: {
                increment: validatedData.quantity,
              },
            },
          })

          // Create stock movement record
          const movement = await tx.stockMovement.create({
            data: {
              organizationId: organization.id,
              productId: validatedData.productId,
              fromLocationId: validatedData.fromLocationId,
              toLocationId: validatedData.toLocationId,
              quantity: validatedData.quantity,
              type: 'TRANSFER',
              status: 'COMPLETED',
              userId: user.id,
              notes: validatedData.notes,
              completedAt: new Date(),
            },
            include: {
              product: true,
              fromLocation: true,
              toLocation: true,
            },
          })

          return movement
        })

        return reply.send({
          success: true,
          data: { movement: result },
        })
      } catch (error) {
        console.error('Stock transfer error:', error)
        return reply.code(400).send({
          error:
            error instanceof Error ? error.message : 'Failed to transfer stock',
        })
      }
    }
  )

  // Get stock transfers history
  fastify.get(
    '/transfers',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request, reply) => {
      const organization = (request as any).organization
      if (!organization) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const user = (request as any).user
      const member = (request as any).member

      const {
        locationId,
        productId,
        page = 1,
        limit: lmt = 20,
      } = request.query as any
      const limit = Number(lmt)
      const offset = (page - 1) * limit

      // Get accessible locations for the current user
      const accessibleLocationIds = await getAccessibleLocationIds(
        member.role,
        organization.id,
        user.id,
        fastify.prisma
      )

      const where: any = {
        organizationId: organization.id,
      }

      // Filter by accessible locations for users with restricted access
      if (!['owner', 'admin', 'manager', 'buyer'].includes(member.role)) {
        if (accessibleLocationIds.length === 0) {
          // User has no location access, return empty results
          return reply.send({
            success: true,
            data: {
              movements: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
              },
            },
          })
        }

        // User can only see transfers involving locations they have access to
        where.OR = [
          { fromLocationId: { in: accessibleLocationIds } },
          { toLocationId: { in: accessibleLocationIds } },
        ]
      }

      if (locationId) {
        // If specific location requested, ensure user has access
        if (
          !['owner', 'admin', 'manager', 'buyer'].includes(member.role) &&
          !accessibleLocationIds.includes(locationId)
        ) {
          return reply
            .code(403)
            .send({ error: 'Access denied to this location' })
        }
        where.OR = [
          { fromLocationId: locationId },
          { toLocationId: locationId },
        ]
      }

      if (productId) {
        where.productId = productId
      }

      const [movements, total] = await Promise.all([
        fastify.prisma.stockMovement.findMany({
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
          skip: offset,
          take: limit,
        }),
        fastify.prisma.stockMovement.count({ where }),
      ])

      return reply.send({
        success: true,
        data: {
          movements,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      })
    }
  )

  // Get inventory by location
  fastify.get(
    '/inventory/by-location/:locationId',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request, reply) => {
      const organization = (request as any).organization
      if (!organization) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const { locationId } = request.params as any
      const { lowStockOnly } = request.query as any

      const where: any = {
        organizationId: organization.id,
        locationId,
      }

      if (lowStockOnly === 'true') {
        where.currentQuantity = {
          lte: fastify.prisma.inventoryItem.fields.minimumQuantity,
        }
      }

      const inventory = await fastify.prisma.inventoryItem.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          location: true,
          zone: true,
        },
        orderBy: [{ product: { name: 'asc' } }],
      })

      // Calculate totals
      const totalItems = inventory.length
      const lowStockItems = inventory.filter(
        (item) => item.currentQuantity < item.minimumQuantity
      ).length
      const totalValue = inventory.reduce(
        (sum, item) =>
          sum + (item.currentQuantity * (item.product as any).costPerUnit || 0),
        0
      )

      return reply.send({
        success: true,
        data: {
          inventory,
          summary: {
            totalItems,
            lowStockItems,
            totalValue,
          },
        },
      })
    }
  )

  // Adjust stock at a specific location
  fastify.post(
    '/inventory/adjust',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'write')],
    },
    async (request, reply) => {
      const organization = (request as any).organization
      if (!organization) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const validatedData = z
        .object({
          productId: z.string(),
          locationId: z.string(),
          adjustment: z.number(), // Can be positive or negative
          reason: z.enum(['DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'OTHER']),
          notes: z.string().optional(),
        })
        .parse(request.body)

      const user = (request as any).user

      try {
        const result = await fastify.prisma.$transaction(async (tx) => {
          // Get current inventory
          const inventory = await tx.inventoryItem.findFirst({
            where: {
              organizationId: organization.id,
              productId: validatedData.productId,
              locationId: validatedData.locationId,
            },
          })

          if (!inventory) {
            throw new Error(
              'Inventory not found for this product at this location'
            )
          }

          const newQuantity =
            inventory.currentQuantity + validatedData.adjustment
          if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative inventory')
          }

          // Update inventory
          const updatedInventory = await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              currentQuantity: newQuantity,
            },
          })

          // Create adjustment record
          const movement = await tx.stockMovement.create({
            data: {
              organizationId: organization.id,
              productId: validatedData.productId,
              fromLocationId: validatedData.locationId,
              toLocationId: validatedData.locationId,
              quantity: Math.abs(validatedData.adjustment),
              type:
                validatedData.adjustment > 0
                  ? 'ADJUSTMENT_IN'
                  : 'ADJUSTMENT_OUT',
              status: 'COMPLETED',
              reason: validatedData.reason,
              userId: user.id,
              notes: validatedData.notes,
              completedAt: new Date(),
            },
          })

          return { inventory: updatedInventory, movement }
        })

        return reply.send({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('Stock adjustment error:', error)
        return reply.code(400).send({
          error:
            error instanceof Error ? error.message : 'Failed to adjust stock',
        })
      }
    }
  )

  // Get stock levels across all locations for a product
  fastify.get(
    '/inventory/product/:productId/locations',
    {
      preHandler: [authMiddleware, requirePermission('inventory', 'read')],
    },
    async (request, reply) => {
      const organization = (request as any).organization
      if (!organization) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const { productId } = request.params as any

      const inventory = await fastify.prisma.inventoryItem.findMany({
        where: {
          organizationId: organization.id,
          productId,
        },
        include: {
          location: true,
          zone: true,
        },
        orderBy: [{ location: { name: 'asc' } }],
      })

      const totalQuantity = inventory.reduce(
        (sum, item) => sum + item.currentQuantity,
        0
      )

      return reply.send({
        success: true,
        data: {
          inventory,
          summary: {
            totalQuantity,
            locationCount: inventory.length,
          },
        },
      })
    }
  )
}
