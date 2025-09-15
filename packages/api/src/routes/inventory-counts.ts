import {
  AppError,
  AreaStatus,
  CountType,
  DEFAULT_STORAGE_AREAS,
  ErrorCode,
  InventoryCountStatus,
} from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

// Validation schemas
const countTypeSchema = z.nativeEnum(CountType)
const inventoryCountStatusSchema = z.nativeEnum(InventoryCountStatus)
const areaStatusSchema = z.nativeEnum(AreaStatus)

const createCountSchema = z.object({
  locationId: z.string(),
  name: z.string().optional(),
  type: countTypeSchema.default(CountType.FULL),
  notes: z.string().optional(),
  areas: z
    .array(
      z.object({
        name: z.string(),
        order: z.number(),
      })
    )
    .optional(),
})

const updateCountSchema = z.object({
  name: z.string().optional(),
  notes: z.string().optional(),
  status: inventoryCountStatusSchema.optional(),
  customCompletedAt: z.string().optional(), // ISO date string for custom completion date
})

const addAreaSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0).optional(),
})

const addItemSchema = z.object({
  areaId: z.string(),
  productId: z.string(),
  fullUnits: z.number().int().min(0).default(0),
  partialUnit: z.number().min(0).max(0.9).default(0),
  notes: z.string().optional(),
})

const updateItemSchema = z.object({
  fullUnits: z.number().int().min(0).optional(),
  partialUnit: z.number().min(0).max(0.9).optional(),
  notes: z.string().optional(),
})

const inventoryCountRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all inventory counts for organization
  fastify.get('/', async (request, reply) => {
    const organizationId = getOrganizationId(request)

    const {
      page: pageParam = '1',
      limit: limitParam = '20',
      status,
      locationId,
    } = request.query as {
      page?: string
      limit?: string
      status?: InventoryCountStatus
      locationId?: string
    }

    // Convert string params to numbers with validation
    const page = Math.max(1, parseInt(pageParam, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20))

    const where: any = { organizationId }
    if (status) where.status = status
    if (locationId) where.locationId = locationId

    const [counts, total] = await Promise.all([
      fastify.prisma.inventoryCount.findMany({
        where,
        include: {
          location: true,
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
          areas: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      unit: true,
                      container: true,
                      unitSize: true,
                    },
                  },
                  countedBy: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
              _count: {
                select: { items: true },
              },
            },
          },
          _count: {
            select: { areas: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      fastify.prisma.inventoryCount.count({ where }),
    ])

    return {
      success: true,
      data: {
        counts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        total,
      },
    }
  })

  // Get specific inventory count
  fastify.get('/:id', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
      include: {
        location: true,
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        areas: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    unit: true,
                    container: true,
                    unitSize: true,
                  },
                },
                countedBy: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    return { success: true, data: count }
  })

  // Create new inventory count
  fastify.post('/', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const userId = (request.user as any)?.id

    if (!userId) {
      throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED, 401)
    }

    const data = createCountSchema.parse(request.body)

    // Verify location exists and belongs to organization
    const location = await fastify.prisma.location.findFirst({
      where: { id: data.locationId, organizationId },
    })

    if (!location) {
      throw new AppError('Location not found', ErrorCode.NOT_FOUND, 404)
    }

    // Generate name if not provided
    const name =
      data.name || `${data.type} Count - ${new Date().toLocaleDateString()}`

    const count = await fastify.prisma.inventoryCount.create({
      data: {
        organizationId,
        locationId: data.locationId,
        name,
        type: data.type,
        notes: data.notes,
        areas: data.areas
          ? {
              create: data.areas.map((area) => ({
                name: area.name,
                order: area.order,
                status: AreaStatus.PENDING,
              })),
            }
          : undefined,
        status: InventoryCountStatus.DRAFT,
      },
      include: {
        location: true,
        areas: true,
      },
    })

    return { success: true, data: count }
  })

  // Update inventory count
  fastify.put('/:id', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }
    const data = updateCountSchema.parse(request.body)

    const existingCount = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!existingCount) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    // Don't allow status changes to approved counts
    if (existingCount.status === InventoryCountStatus.APPROVED && data.status) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    const updateData: any = { ...data }

    // Handle custom completion date
    let completionDate = new Date()
    if (data.customCompletedAt) {
      completionDate = new Date(data.customCompletedAt)
      // Validate that the date is not in the future
      if (completionDate > new Date()) {
        throw new AppError('Completion date cannot be in the future', ErrorCode.BAD_REQUEST, 400)
      }
    }

    // Set completion/approval timestamps based on status
    if (
      data.status === InventoryCountStatus.COMPLETED &&
      existingCount.status !== InventoryCountStatus.COMPLETED
    ) {
      updateData.completedAt = completionDate

      // If custom completion date is before startedAt, update startedAt
      if (existingCount.startedAt && completionDate < existingCount.startedAt) {
        updateData.startedAt = completionDate
      }
    }
    if (
      data.status === InventoryCountStatus.APPROVED &&
      existingCount.status !== InventoryCountStatus.APPROVED
    ) {
      updateData.approvedAt = new Date() // Always use current time for approval
      updateData.approvedById = (request.user as any)?.id

      // If completing and approving at the same time with custom date
      if (existingCount.status !== InventoryCountStatus.COMPLETED) {
        updateData.completedAt = completionDate

        // If custom completion date is before startedAt, update startedAt
        if (existingCount.startedAt && completionDate < existingCount.startedAt) {
          updateData.startedAt = completionDate
        }
      }

      // Apply count results to actual inventory when approved
      await applyCountResultsToInventory(fastify, id, organizationId)
    }

    // Remove customCompletedAt from updateData as it's not a database field
    delete updateData.customCompletedAt

    const count = await fastify.prisma.inventoryCount.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        areas: {
          include: {
            _count: {
              select: { items: true },
            },
          },
        },
      },
    })

    return { success: true, data: count }
  })

  // Delete inventory count (only drafts)
  fastify.delete('/:id', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new AppError(
        'Can only delete draft counts',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    await fastify.prisma.inventoryCount.delete({
      where: { id },
    })

    return { success: true }
  })

  // Add storage area to count
  fastify.post('/:id/areas', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }
    const data = addAreaSchema.parse(request.body)

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status === InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    // Get current max order if not provided
    const order =
      data.order ??
      (await fastify.prisma.countArea.count({ where: { countId: id } }))

    const area = await fastify.prisma.countArea.create({
      data: {
        countId: id,
        name: data.name,
        order,
        status: AreaStatus.PENDING,
      },
    })

    return { success: true, data: area }
  })

  // Batch create default areas
  fastify.post('/:id/areas/default', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status === InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    // Create areas for default storage areas
    const areas = await Promise.all(
      DEFAULT_STORAGE_AREAS.map((areaName, index) =>
        fastify.prisma.countArea.create({
          data: {
            countId: id,
            name: areaName,
            order: index,
            status: AreaStatus.PENDING,
          },
        })
      )
    )

    return { success: true, data: areas }
  })

  // Update area status
  fastify.put('/:id/areas/:areaId', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id, areaId } = request.params as { id: string; areaId: string }
    const { status } = z
      .object({ status: areaStatusSchema })
      .parse(request.body)

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    const area = await fastify.prisma.countArea.findFirst({
      where: { id: areaId, countId: id },
    })

    if (!area) {
      throw new AppError('Area not found', ErrorCode.NOT_FOUND, 404)
    }

    const updatedArea = await fastify.prisma.countArea.update({
      where: { id: areaId },
      data: { status },
    })

    return { success: true, data: updatedArea }
  })

  // Add/Update count item
  fastify.post('/:id/items', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }
    const userId = (request.user as any)?.id

    if (!userId) {
      throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED, 401)
    }

    const data = addItemSchema.parse(request.body)

    // Verify count exists and belongs to organization
    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status === InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    // Verify area belongs to count
    const area = await fastify.prisma.countArea.findFirst({
      where: { id: data.areaId, countId: id },
    })

    if (!area) {
      throw new AppError('Area not found', ErrorCode.NOT_FOUND, 404)
    }

    // Verify product exists
    const product = await fastify.prisma.product.findFirst({
      where: { id: data.productId, organizationId },
    })

    if (!product) {
      throw new AppError('Product not found', ErrorCode.NOT_FOUND, 404)
    }

    // Calculate total quantity
    const totalQuantity = data.fullUnits + data.partialUnit

    // Get expected quantity from current inventory or par levels
    const inventoryItem = await fastify.prisma.inventoryItem.findFirst({
      where: { productId: data.productId, locationId: count.locationId },
    })

    const expectedQty = inventoryItem?.currentQuantity ?? 0

    const variance = totalQuantity - expectedQty

    const itemData = {
      areaId: data.areaId,
      productId: data.productId,
      fullUnits: data.fullUnits,
      partialUnit: data.partialUnit,
      totalQuantity,
      expectedQty,
      variance,
      unitCost: product.costPerUnit || 0,
      totalValue: totalQuantity * (product.costPerUnit || 0),
      notes: data.notes,
      countedById: userId,
      countedAt: new Date(),
    }

    // Upsert the count item (create or update if exists)
    const item = await fastify.prisma.inventoryCountItem.upsert({
      where: {
        areaId_productId: {
          areaId: data.areaId,
          productId: data.productId,
        },
      },
      update: itemData,
      create: itemData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            container: true,
            unitSize: true,
          },
        },
        countedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Update count summary
    await updateCountSummary(fastify, id)

    return { success: true, data: item }
  })

  // Update count item
  fastify.put('/:id/items/:itemId', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id, itemId } = request.params as { id: string; itemId: string }
    const userId = (request.user as any)?.id

    if (!userId) {
      throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED, 401)
    }

    const data = updateItemSchema.parse(request.body)

    // Verify count exists and belongs to organization
    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status === InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    // Get existing item
    const existingItem = await fastify.prisma.inventoryCountItem.findFirst({
      where: { id: itemId },
      include: {
        area: true,
        product: true,
      },
    })

    if (!existingItem || existingItem.area.countId !== id) {
      throw new AppError('Count item not found', ErrorCode.NOT_FOUND, 404)
    }

    const updateData: any = {
      ...data,
      countedById: userId,
      countedAt: new Date(),
    }

    // Recalculate totals if quantities changed
    if (data.fullUnits !== undefined || data.partialUnit !== undefined) {
      const fullUnits = data.fullUnits ?? existingItem.fullUnits
      const partialUnit = data.partialUnit ?? existingItem.partialUnit
      const totalQuantity = fullUnits + partialUnit

      updateData.fullUnits = fullUnits
      updateData.partialUnit = partialUnit
      updateData.totalQuantity = totalQuantity
      updateData.variance = totalQuantity - (existingItem.expectedQty || 0)
      updateData.totalValue =
        totalQuantity * (existingItem.product.costPerUnit || 0)
    }

    const item = await fastify.prisma.inventoryCountItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            container: true,
            unitSize: true,
          },
        },
        countedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Update count summary
    await updateCountSummary(fastify, id)

    return { success: true, data: item }
  })

  // Delete count item
  fastify.delete('/:id/items/:itemId', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id, itemId } = request.params as { id: string; itemId: string }

    // Verify count exists and belongs to organization
    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status === InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Cannot modify approved count',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    // Verify item exists and belongs to count
    const item = await fastify.prisma.inventoryCountItem.findFirst({
      where: { id: itemId },
      include: { area: true },
    })

    if (!item || item.area.countId !== id) {
      throw new AppError('Count item not found', ErrorCode.NOT_FOUND, 404)
    }

    await fastify.prisma.inventoryCountItem.delete({
      where: { id: itemId },
    })

    // Update count summary
    await updateCountSummary(fastify, id)

    return { success: true }
  })

  // Get count report/summary
  fastify.get('/:id/report', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
      include: {
        location: true,
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        areas: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    unit: true,
                    container: true,
                    unitSize: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    // Calculate summary statistics
    const allItems = count.areas.flatMap((area) => area.items)
    const totalItems = allItems.length
    const totalValue = allItems.reduce(
      (sum, item) => sum + (item.totalValue || 0),
      0
    )
    const itemsWithVariance = allItems.filter(
      (item) => Math.abs(item.variance || 0) > 0.01
    )
    const significantVariances = allItems
      .filter(
        (item) =>
          Math.abs(item.variance || 0) > 1 ||
          Math.abs((item.variance || 0) / Math.max(item.expectedQty || 1, 1)) >
            0.1
      )
      .map((item) => ({
        productId: item.productId,
        productName: item.product?.name || 'Unknown',
        areaName:
          count.areas.find((area) => area.items.some((i) => i.id === item.id))
            ?.name || 'Unknown',
        totalQuantity: item.totalQuantity,
        expectedQty: item.expectedQty,
        variance: item.variance,
        variancePercent: item.expectedQty
          ? ((item.variance || 0) / item.expectedQty) * 100
          : 0,
        unitCost: item.unitCost,
        varianceValue: (item.variance || 0) * (item.unitCost || 0),
      }))

    const areasCompleted = count.areas.filter(
      (area) => area.status === AreaStatus.COMPLETED
    ).length
    const progressPercent =
      count.areas.length > 0 ? (areasCompleted / count.areas.length) * 100 : 0

    const summary = {
      totalItems,
      totalValue,
      areasCompleted,
      totalAreas: count.areas.length,
      significantVariances,
      progressPercent,
    }

    const itemsByArea = count.areas.map((area) => ({
      area,
      items: area.items,
      subtotal: area.items.reduce(
        (sum, item) => sum + (item.totalValue || 0),
        0
      ),
    }))

    const report = {
      count,
      summary,
      itemsByArea,
      variances: significantVariances,
    }

    return { success: true, data: report }
  })

  // Apply count results to inventory (manual trigger)
  fastify.post('/:id/apply', async (request, reply) => {
    const organizationId = getOrganizationId(request)
    const { id } = request.params as { id: string }

    const count = await fastify.prisma.inventoryCount.findFirst({
      where: { id, organizationId },
    })

    if (!count) {
      throw new AppError('Count not found', ErrorCode.NOT_FOUND, 404)
    }

    if (count.status !== InventoryCountStatus.APPROVED) {
      throw new AppError(
        'Can only apply approved counts to inventory',
        ErrorCode.BAD_REQUEST,
        400
      )
    }

    await applyCountResultsToInventory(fastify, id, organizationId)

    return { success: true, message: 'Count results applied to inventory' }
  })
}

// Helper function to update count summary
async function updateCountSummary(fastify: any, countId: string) {
  const items = await fastify.prisma.inventoryCountItem.findMany({
    where: {
      area: { countId },
    },
  })

  const totalValue = items.reduce(
    (sum: number, item: any) => sum + (item.totalValue || 0),
    0
  )
  const itemsCounted = new Set(items.map((item: any) => item.productId)).size

  await fastify.prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      totalValue,
      itemsCounted,
    },
  })
}

// Helper function to apply count results to actual inventory levels
async function applyCountResultsToInventory(
  fastify: any,
  countId: string,
  organizationId: string
) {
  // Get the count with all its items
  const count = await fastify.prisma.inventoryCount.findFirst({
    where: { id: countId, organizationId },
    include: {
      areas: {
        include: {
          items: true,
        },
      },
    },
  })

  if (!count) {
    throw new Error('Count not found')
  }

  // Get all count items and aggregate by product
  const allItems = count.areas.flatMap((area: any) => area.items)
  const aggregatedResults = new Map<string, number>()

  // Sum up quantities for each product across all areas
  allItems.forEach((item: any) => {
    const existing = aggregatedResults.get(item.productId) || 0
    aggregatedResults.set(item.productId, existing + item.totalQuantity)
  })

  // Update inventory levels
  const updatePromises = Array.from(aggregatedResults.entries()).map(
    async ([productId, totalQuantity]) => {
      // Find existing inventory item or create new one
      const existingItem = await fastify.prisma.inventoryItem.findFirst({
        where: {
          organizationId,
          productId,
          locationId: count.locationId,
        },
      })

      if (existingItem) {
        // Update existing inventory item
        await fastify.prisma.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            currentQuantity: totalQuantity,
            lastCountDate: new Date(),
            updatedAt: new Date(),
          },
        })
      } else {
        // Create new inventory item
        await fastify.prisma.inventoryItem.create({
          data: {
            organizationId,
            productId,
            locationId: count.locationId,
            currentQuantity: totalQuantity,
            minimumQuantity: 0,
            lastCountDate: new Date(),
          },
        })
      }
    }
  )

  await Promise.all(updatePromises)
}

export default inventoryCountRoutes
