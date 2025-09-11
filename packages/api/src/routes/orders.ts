import { OrderStatus, Prisma } from '@happy-bar/database'
import { AppError, ErrorCode } from '@happy-bar/types'
import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'
import { sendSupplierOrderEmail } from '../utils/supplier-order-email'

// Helper to get organization ID or throw error
function getOrganizationId(request: FastifyRequest): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

// Helper to get user ID
function getUserId(request: FastifyRequest): string {
  if (!(request.user! as any).id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return (request.user! as any).id
}

interface CreateOrderRequest {
  supplierId: string
  expectedDate?: string
  notes?: string
  items: Array<{
    productId: string
    quantityOrdered: number
    unitCost?: number
    orderingUnit?: 'UNIT' | 'CASE'
  }>
}

interface UpdateOrderRequest {
  status?: string
  receivedDate?: string
  notes?: string
  items?: Array<{
    id?: string
    productId: string
    quantityOrdered?: number
    quantityReceived?: number
    unitCost?: number
  }>
}

export const ordersRoutes: FastifyPluginAsync = async function (
  fastify: FastifyInstance
) {
  // Get all orders with filtering and pagination
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('orders', 'read')],
    },
    async (request, reply) => {
      const { status, supplierId, limit, offset, startDate, endDate } =
        request.query as {
          status?: string
          supplierId?: string
          limit?: string
          offset?: string
          startDate?: string
          endDate?: string
        }
      const organizationId = getOrganizationId(request)

      // Build where clause
      const where: any = { organizationId }

      if (status) {
        where.status = status
      }

      if (supplierId) {
        where.supplierId = supplierId
      }

      if (startDate || endDate) {
        where.orderDate = {}
        if (startDate) where.orderDate.gte = new Date(startDate)
        if (endDate) where.orderDate.lte = new Date(endDate)
      }

      const orders = await fastify.prisma.order.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : undefined,
        skip: offset ? parseInt(offset) : undefined,
      })

      // Get total count for pagination
      const totalCount = await fastify.prisma.order.count({ where })

      return {
        success: true,
        data: orders,
        pagination: {
          total: totalCount,
          limit: limit ? parseInt(limit) : orders.length,
          offset: offset ? parseInt(offset) : 0,
        },
      }
    }
  )

  // Get single order by ID
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string }
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params
      const organizationId = getOrganizationId(request)

      const order = await fastify.prisma.order.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  sku: true,
                  caseSize: true,
                  category: true,
                  suppliers: {
                    include: { supplier: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!order) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      return { success: true, data: order }
    }
  )

  // Create new order
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{
        Body: CreateOrderRequest
      }>,
      reply: FastifyReply
    ) => {
      const { supplierId, expectedDate, notes, items } = request.body
      const organizationId = getOrganizationId(request)

      if (!supplierId || !items || items.length === 0) {
        reply.code(400)
        return { success: false, error: 'Supplier ID and items are required' }
      }

      // Verify supplier exists and belongs to organization
      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id: supplierId, organizationId },
      })

      if (!supplier) {
        reply.code(400)
        return { success: false, error: 'Invalid supplier' }
      }

      // Generate order number
      const orderCount = await fastify.prisma.order.count({
        where: { organizationId },
      })
      const orderNumber = `ORD-${Date.now()}-${orderCount + 1}`

      // Validate products and get pricing
      const productIds = items.map((item) => item.productId)
      const products = await fastify.prisma.product.findMany({
        where: {
          id: { in: productIds },
          organizationId,
        },
        include: {
          suppliers: {
            where: { supplierId },
            include: { supplier: true },
          },
        },
      })

      if (products.length !== productIds.length) {
        reply.code(400)
        return { success: false, error: 'One or more products not found' }
      }

      // Calculate costs and prepare order items
      let totalAmount = 0
      const orderItems = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!
        const supplierProduct = product.suppliers.find(
          (s) => s.supplierId === supplierId
        )

        // Use provided unit cost or fall back to supplier pricing or product cost
        const unitCost =
          item.unitCost ?? supplierProduct?.costPerUnit ?? product.costPerUnit
        const totalCost = unitCost * item.quantityOrdered
        totalAmount += totalCost

        return {
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: 0,
          unitCost,
          totalCost,
          orderingUnit: item.orderingUnit || 'UNIT',
        }
      })

      // Create order with items
      const order = await fastify.prisma.order.create({
        data: {
          organizationId,
          supplierId,
          orderNumber,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes,
          totalAmount,
          items: {
            create: orderItems,
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      })

      return { success: true, data: order }
    }
  )

  // Update order
  fastify.put(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string }
        Body: UpdateOrderRequest
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params
      const { status, receivedDate, notes, items } = request.body
      const organizationId = getOrganizationId(request)

      // Verify order exists and belongs to organization
      const existingOrder = await fastify.prisma.order.findFirst({
        where: { id, organizationId },
        include: { items: true },
      })

      if (!existingOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // Prepare update data
      const updateData: Prisma.OrderUpdateInput = {}

      // Store the previous status to check if it changed to SENT
      const previousStatus = existingOrder.status

      if (status) {
        updateData.status = status as OrderStatus
      }

      if (receivedDate) {
        updateData.receivedDate = new Date(receivedDate)
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      // Handle items updates if provided
      if (items && items.length > 0) {
        // Update existing items or create new ones
        for (const item of items) {
          if (item.id) {
            // Update existing item
            await fastify.prisma.orderItem.update({
              where: { id: item.id },
              data: {
                quantityOrdered: item.quantityOrdered,
                quantityReceived: item.quantityReceived,
                unitCost: item.unitCost,
                totalCost:
                  item.unitCost && item.quantityOrdered
                    ? item.unitCost * item.quantityOrdered
                    : undefined,
              },
            })
          } else {
            // Create new item
            const product = await fastify.prisma.product.findFirst({
              where: { id: item.productId, organizationId },
            })

            if (product) {
              const unitCost = item.unitCost ?? product.costPerUnit
              await fastify.prisma.orderItem.create({
                data: {
                  orderId: id,
                  productId: item.productId,
                  quantityOrdered: item.quantityOrdered ?? 0,
                  quantityReceived: item.quantityReceived ?? 0,
                  unitCost,
                  totalCost: unitCost * (item.quantityOrdered ?? 0),
                },
              })
            }
          }
        }

        // Recalculate total amount
        const updatedItems = await fastify.prisma.orderItem.findMany({
          where: { orderId: id },
        })
        updateData.totalAmount = updatedItems.reduce(
          (sum, item) => sum + item.totalCost,
          0
        )

        // Auto-determine order status based on received quantities
        const allItemsReceived = updatedItems.every(
          (item) => (item.quantityReceived ?? 0) >= item.quantityOrdered
        )
        const someItemsReceived = updatedItems.some(
          (item) => (item.quantityReceived ?? 0) > 0
        )

        if (allItemsReceived && someItemsReceived) {
          updateData.status = 'RECEIVED'
          updateData.receivedDate = new Date()
        } else if (someItemsReceived) {
          updateData.status = 'PARTIALLY_RECEIVED'
        }

        // Update inventory for received items - convert to units first
        for (const item of updatedItems) {
          const receivedQty = item.quantityReceived ?? 0
          const previouslyReceivedQty =
            existingOrder.items.find((existing) => existing.id === item.id)
              ?.quantityReceived ?? 0

          const newlyReceivedQty = receivedQty - previouslyReceivedQty

          if (newlyReceivedQty > 0) {
            // Get product information for unit conversion
            const product = await fastify.prisma.product.findFirst({
              where: { id: item.productId, organizationId },
              select: { caseSize: true },
            })

            if (!product) continue

            // Convert received quantity to units (inventory is always in units)
            const newlyReceivedInUnits =
              item.orderingUnit === 'CASE'
                ? newlyReceivedQty * product.caseSize
                : newlyReceivedQty
            // Find or create inventory item for this product
            const inventoryItem = await fastify.prisma.inventoryItem.findFirst({
              where: {
                organizationId,
                productId: item.productId,
                // Use primary location if no specific location is set
                // You might want to make location configurable in your UI
              },
            })

            if (inventoryItem) {
              // Update existing inventory (using units)
              await fastify.prisma.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: {
                  currentQuantity:
                    inventoryItem.currentQuantity + newlyReceivedInUnits,
                  updatedAt: new Date(),
                },
              })
            } else {
              // Find primary location for this organization
              const primaryLocation = await fastify.prisma.location.findFirst({
                where: { organizationId },
              })

              if (primaryLocation) {
                // Create new inventory item (using units)
                await fastify.prisma.inventoryItem.create({
                  data: {
                    organizationId,
                    productId: item.productId,
                    locationId: primaryLocation.id,
                    currentQuantity: newlyReceivedInUnits,
                    minimumQuantity: 6,
                  },
                })
              }
            }

            // Create audit log for inventory addition
            await fastify.prisma.auditLog.create({
              data: {
                organizationId,
                eventType: 'INVENTORY_RECEIVED',
                productId: item.productId,
                eventData: {
                  orderId: id,
                  quantityAdded: newlyReceivedInUnits, // Log the units added to inventory
                  orderQuantity: newlyReceivedQty, // Also log the original order quantity
                  orderingUnit: item.orderingUnit,
                  unitCost: item.unitCost,
                  source: 'ORDER_RECEIPT',
                },
              },
            })
          }
        }
      }

      // Update order
      const updatedOrder = await fastify.prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          supplier: {
            include: {
              contacts: true,
            },
          },
          organization: true,
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      })

      // Send email to supplier if order status changed to SENT
      if (previousStatus !== 'SENT' && updatedOrder.status === 'SENT') {
        console.log(
          `Order ${updatedOrder.orderNumber} status changed to SENT, sending emails to supplier contacts`
        )

        // Get all supplier contacts with email addresses
        const contactsWithEmail = updatedOrder.supplier.contacts.filter(
          (contact) => contact.email
        )

        if (contactsWithEmail.length > 0) {
          console.log(
            `Found ${contactsWithEmail.length} contacts with email addresses for ${updatedOrder.supplier.name}`
          )

          // Prepare base email data
          const organizationMetadata = updatedOrder.organization.metadata as any
          const address = organizationMetadata?.address || {}

          const baseEmailData = {
            supplierName: updatedOrder.supplier.name,
            organizationName: updatedOrder.organization.name,
            organizationAddress: {
              street: address.street,
              city: address.city,
              state: address.state,
              zip: address.zip,
              country: address.country,
            },
            orderNumber: updatedOrder.orderNumber,
            orderDate: updatedOrder.createdAt,
            items: updatedOrder.items.map((item) => ({
              productName: item.product.name,
              size: `${item.product.unitSize} ${item.product.unit}`,
              quantity: item.quantityOrdered,
              orderingUnit: item.orderingUnit || 'UNIT',
              unitsPerCase: item.product.caseSize,
            })),
            notes: updatedOrder.notes || undefined,
          }

          // Send email to each contact
          for (const contact of contactsWithEmail) {
            try {
              const emailData = {
                ...baseEmailData,
                email: contact.email!,
              }

              const emailResult = await sendSupplierOrderEmail(emailData)

              if (emailResult.success) {
                console.log(
                  `Successfully sent order email to ${contact.name || 'contact'} (${contact.email}) at ${updatedOrder.supplier.name}`
                )
              } else {
                console.error(
                  `Failed to send order email to ${contact.name || 'contact'} (${contact.email}):`,
                  emailResult.error
                )
              }
            } catch (error) {
              console.error(
                `Error sending order email to ${contact.name || 'contact'} (${contact.email}):`,
                error
              )
            }
          }
        } else {
          console.warn(
            `Cannot send order emails - supplier ${updatedOrder.supplier.name} has no contacts with email addresses`
          )
        }
      }

      return { success: true, data: updatedOrder }
    }
  )

  // Delete order (only if DRAFT status)
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string }
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params
      const organizationId = getOrganizationId(request)

      const order = await fastify.prisma.order.findFirst({
        where: { id, organizationId },
      })

      if (!order) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      if (order.status !== 'DRAFT') {
        reply.code(400)
        return { success: false, error: 'Only draft orders can be deleted' }
      }

      await fastify.prisma.order.delete({
        where: { id },
      })

      return { success: true, message: 'Order deleted successfully' }
    }
  )

  // Get order suggestions based on inventory levels
  fastify.get(
    '/suggestions/reorder',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = getOrganizationId(request)

      // Get all inventory items and filter for low stock in JavaScript
      const allInventoryItems = await fastify.prisma.inventoryItem.findMany({
        where: {
          organizationId,
        },
        include: {
          product: {
            include: {
              suppliers: {
                include: { supplier: true },
                // where: { isPreferred: true },
              },
              category: true,
            },
          },
          location: true,
        },
        orderBy: {
          product: {
            name: 'asc',
          },
        },
      })

      // Filter for low stock items
      const lowStockItems = allInventoryItems.filter(
        (item) => item.currentQuantity < item.minimumQuantity
      )

      // Group by supplier and calculate suggested quantities
      const suggestions = lowStockItems.reduce(
        (
          acc: Record<
            string,
            {
              supplier: any
              items: any[]
              product?: any
              currentQuantity?: number
              minimumQuantity?: number
              suggestedQuantity?: number
              unitCost?: number
              estimatedCost?: number
              location?: string
              orderingUnit?: string
              packSize?: number
              totalEstimatedCost: number
            }
          >,
          item
        ) => {
          const preferredSupplier = item.product.suppliers[0]
          if (!preferredSupplier) return acc

          const supplierId = preferredSupplier.supplierId
          if (!acc[supplierId]) {
            acc[supplierId] = {
              supplier: preferredSupplier.supplier,
              items: [],
              totalEstimatedCost: 0,
            }
          }

          // Calculate the quantity needed to reach minimum
          const quantityNeeded = item.minimumQuantity - item.currentQuantity

          // Determine ordering unit and calculate suggested quantity
          let suggestedQuantity: number
          let unitCost: number
          let orderingUnit = preferredSupplier.orderingUnit

          if (orderingUnit === 'CASE' && preferredSupplier.packSize) {
            // When ordering by case, calculate how many cases needed
            const casesNeeded = Math.ceil(
              quantityNeeded / preferredSupplier.packSize
            )
            const minimumCases =
              preferredSupplier.minimumOrderUnit === 'CASE'
                ? preferredSupplier.minimumOrder
                : Math.ceil(
                    preferredSupplier.minimumOrder / preferredSupplier.packSize
                  )

            // Take the maximum of cases needed or minimum order
            const casesToOrder = Math.max(casesNeeded, minimumCases)
            suggestedQuantity = casesToOrder // Store as cases
            unitCost =
              preferredSupplier.costPerCase ||
              preferredSupplier.costPerUnit * preferredSupplier.packSize
          } else {
            // When ordering by unit, round up to avoid decimals
            const minimumUnits =
              preferredSupplier.minimumOrderUnit === 'UNIT'
                ? preferredSupplier.minimumOrder
                : preferredSupplier.minimumOrder *
                  (preferredSupplier.packSize || 1)

            suggestedQuantity = Math.ceil(
              Math.max(quantityNeeded, minimumUnits)
            )
            unitCost = preferredSupplier.costPerUnit

            // If there's a pack size, round up to full packs
            if (preferredSupplier.packSize && preferredSupplier.packSize > 1) {
              suggestedQuantity =
                Math.ceil(suggestedQuantity / preferredSupplier.packSize) *
                preferredSupplier.packSize
            }
          }

          const estimatedCost = suggestedQuantity * unitCost

          acc[supplierId].items.push({
            product: item.product,
            currentQuantity: item.currentQuantity,
            minimumQuantity: item.minimumQuantity,
            suggestedQuantity,
            unitCost,
            estimatedCost,
            location: item.location,
            orderingUnit,
            packSize: preferredSupplier.packSize,
          })
          acc[supplierId].totalEstimatedCost += estimatedCost

          return acc
        },
        {}
      )

      return {
        success: true,
        data: Object.values(suggestions),
      }
    }
  )

  // Get order analytics
  fastify.get(
    '/analytics/summary',
    async (
      request: FastifyRequest<{
        Querystring: {
          startDate?: string
          endDate?: string
          supplierId?: string
        }
      }>,
      reply: FastifyReply
    ) => {
      const { startDate, endDate, supplierId } = request.query
      const organizationId = getOrganizationId(request)

      const where: any = { organizationId }

      if (supplierId) {
        where.supplierId = supplierId
      }

      if (startDate || endDate) {
        where.orderDate = {}
        if (startDate) where.orderDate.gte = new Date(startDate)
        if (endDate) where.orderDate.lte = new Date(endDate)
      }

      // Get order counts by status
      const orderCounts = await fastify.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { totalAmount: true },
      })

      // Get total spend by supplier
      const supplierSpend = await fastify.prisma.order.groupBy({
        by: ['supplierId'],
        where: { ...where, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: { id: true },
      })

      // Get supplier details
      const suppliers = await fastify.prisma.supplier.findMany({
        where: {
          organizationId,
          id: { in: supplierSpend.map((s) => s.supplierId) },
        },
      })

      const supplierAnalytics = supplierSpend
        .map((spend) => {
          const supplier = suppliers.find((s) => s.id === spend.supplierId)
          return {
            supplier,
            totalSpend: spend._sum.totalAmount || 0,
            orderCount: spend._count.id,
          }
        })
        .sort((a, b) => b.totalSpend - a.totalSpend)

      return {
        success: true,
        data: {
          ordersByStatus: orderCounts.map((count) => ({
            status: count.status,
            count: count._count.status,
            totalAmount: count._sum.totalAmount || 0,
          })),
          supplierAnalytics,
          totalOrders: orderCounts.reduce(
            (sum, count) => sum + count._count.status,
            0
          ),
          totalSpend: orderCounts.reduce(
            (sum, count) => sum + (count._sum.totalAmount || 0),
            0
          ),
        },
      }
    }
  )
}
