import { Prisma } from '@happy-bar/database'
import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import {
  authMiddleware,
  requireAnyPermission,
  requirePermission,
} from '../middleware/auth-simple'

// Helper to get organization ID or throw error
function getOrganizationId(request: FastifyRequest): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

interface CreateSupplierRequest {
  name: string
  accountNumber?: string
  address?: string
  terms?: string
  orderCutoffTime?: string
  orderCutoffDays?: number[]
  deliveryDays?: number[]
  deliveryTimeStart?: string
  deliveryTimeEnd?: string
  minimumOrderValue?: number
  deliveryFee?: number
  contacts?: {
    name: string
    title?: string
    email?: string
    phone?: string
    isPrimary?: boolean
  }[]
}

interface UpdateSupplierRequest {
  name?: string
  accountNumber?: string
  address?: string
  terms?: string
  isActive?: boolean
  orderCutoffTime?: string
  orderCutoffDays?: number[]
  deliveryDays?: number[]
  deliveryTimeStart?: string
  deliveryTimeEnd?: string
  minimumOrderValue?: number
  deliveryFee?: number
  contacts?: {
    id?: string
    name: string
    title?: string
    email?: string
    phone?: string
    isPrimary?: boolean
  }[]
}

export const suppliersRoutes: FastifyPluginAsync = async function (
  fastify: FastifyInstance
) {
  // Get all product-supplier relationships
  fastify.get(
    '/products',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'read')],
    },
    async (request, reply) => {
      const { productId } = request.query as { productId?: string }
      const organizationId = getOrganizationId(request)

      try {
        const where: Prisma.ProductSupplierWhereInput = {
          supplier: {
            organizationId,
          },
        }

        if (productId) {
          where.productId = productId
        }

        const productSuppliers = await fastify.prisma.productSupplier.findMany({
          where: {
            supplier: {
              organizationId,
            },
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        })

        return reply.send({
          success: true,
          data: productSuppliers,
        })
      } catch (error: any) {
        console.error('Failed to fetch product suppliers:', error)
        throw new AppError(
          'Failed to fetch product suppliers',
          ErrorCode.INTERNAL_ERROR,
          500
        )
      }
    }
  )
  // Get all suppliers
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'read')],
    },
    async (request, reply) => {
      const { active, search } = request.query as {
        active?: string
        search?: string
      }
      const organizationId = getOrganizationId(request)

      // Build where clause
      const where: Prisma.SupplierWhereInput | undefined = { organizationId }

      if (active === 'true') {
        where.isActive = true
      } else if (active === 'false') {
        where.isActive = false
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          {
            contacts: {
              some: { name: { contains: search, mode: 'insensitive' } },
            },
          },
          {
            contacts: {
              some: { email: { contains: search, mode: 'insensitive' } },
            },
          },
        ]
      }

      const suppliers = await fastify.prisma.supplier.findMany({
        where,
        include: {
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
          products: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              contacts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return { success: true, data: suppliers }
    }
  )

  // Get single supplier by ID
  fastify.get(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as any
      const organizationId = getOrganizationId(request)

      const supplier = await fastify.prisma.supplier.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
          products: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          orders: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              orders: true,
              products: true,
              contacts: true,
            },
          },
        },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      return { success: true, data: supplier }
    }
  )

  // Create new supplier
  fastify.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'write')],
    },
    async (request, reply) => {
      const {
        name,
        accountNumber,
        address,
        terms,
        orderCutoffTime,
        orderCutoffDays,
        deliveryDays,
        deliveryTimeStart,
        deliveryTimeEnd,
        minimumOrderValue,
        deliveryFee,
        contacts,
      } = request.body as CreateSupplierRequest
      const organizationId = getOrganizationId(request)

      if (!name) {
        reply.code(400)
        return { success: false, error: 'Supplier name is required' }
      }

      // Check if supplier name already exists
      const existingSupplier = await fastify.prisma.supplier.findFirst({
        where: {
          organizationId,
          name: { equals: name, mode: 'insensitive' },
        },
      })

      if (existingSupplier) {
        reply.code(400)
        return {
          success: false,
          error: 'A supplier with this name already exists',
        }
      }

      const supplier = await fastify.prisma.supplier.create({
        data: {
          organizationId,
          name,
          accountNumber,
          address,
          terms,
          orderCutoffTime,
          orderCutoffDays: orderCutoffDays || [],
          deliveryDays: deliveryDays || [],
          deliveryTimeStart,
          deliveryTimeEnd,
          minimumOrderValue,
          deliveryFee,
          contacts: contacts
            ? {
                create: contacts.map((contact) => ({
                  name: contact.name,
                  title: contact.title,
                  email: contact.email,
                  phone: contact.phone,
                  isPrimary: contact.isPrimary || false,
                })),
              }
            : undefined,
        },
        include: {
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
          _count: {
            select: {
              orders: true,
              products: true,
              contacts: true,
            },
          },
        },
      })

      return { success: true, data: supplier }
    }
  )

  // Update supplier
  fastify.put(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'write')],
    },
    async (request, reply) => {
      const { id } = request.params as any
      const {
        name,
        accountNumber,
        address,
        terms,
        isActive,
        orderCutoffTime,
        orderCutoffDays,
        deliveryDays,
        deliveryTimeStart,
        deliveryTimeEnd,
        minimumOrderValue,
        deliveryFee,
        contacts,
      } = request.body as UpdateSupplierRequest
      const organizationId = getOrganizationId(request)

      // Verify supplier exists and belongs to organization
      const existingSupplier = await fastify.prisma.supplier.findFirst({
        where: { id, organizationId },
      })

      if (!existingSupplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      // Check for name conflicts if name is being updated
      if (name && name !== existingSupplier.name) {
        const nameConflict = await fastify.prisma.supplier.findFirst({
          where: {
            organizationId,
            name: { equals: name, mode: 'insensitive' },
            id: { not: id },
          },
        })

        if (nameConflict) {
          reply.code(400)
          return {
            success: false,
            error: 'A supplier with this name already exists',
          }
        }
      }

      // Handle contacts update if provided
      if (contacts) {
        // Delete existing contacts that are not in the update
        const existingContacts = await fastify.prisma.supplierContact.findMany({
          where: { supplierId: id },
        })

        const contactIdsToKeep = contacts.filter((c) => c.id).map((c) => c.id!)

        const contactsToDelete = existingContacts
          .filter((ec) => !contactIdsToKeep.includes(ec.id))
          .map((ec) => ec.id)

        if (contactsToDelete.length > 0) {
          await fastify.prisma.supplierContact.deleteMany({
            where: {
              id: { in: contactsToDelete },
              supplierId: id,
            },
          })
        }

        // Update or create contacts
        for (const contact of contacts) {
          if (contact.id) {
            // Update existing contact
            await fastify.prisma.supplierContact.update({
              where: { id: contact.id },
              data: {
                name: contact.name,
                title: contact.title,
                email: contact.email,
                phone: contact.phone,
                isPrimary: contact.isPrimary || false,
              },
            })
          } else {
            // Create new contact
            await fastify.prisma.supplierContact.create({
              data: {
                supplierId: id,
                name: contact.name,
                title: contact.title,
                email: contact.email,
                phone: contact.phone,
                isPrimary: contact.isPrimary || false,
              },
            })
          }
        }
      }

      const supplier = await fastify.prisma.supplier.update({
        where: { id },
        data: {
          name,
          accountNumber,
          address,
          terms,
          isActive,
          orderCutoffTime,
          orderCutoffDays,
          deliveryDays,
          deliveryTimeStart,
          deliveryTimeEnd,
          minimumOrderValue,
          deliveryFee,
        },
        include: {
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
          _count: {
            select: {
              orders: true,
              products: true,
              contacts: true,
            },
          },
        },
      })

      return { success: true, data: supplier }
    }
  )

  // Delete supplier (only if no orders exist)
  fastify.delete(
    '/:id',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'delete')],
    },
    async (request, reply) => {
      const { id } = request.params as any
      const organizationId = getOrganizationId(request)

      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id, organizationId },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      if (supplier._count.orders > 0) {
        reply.code(400)
        return {
          success: false,
          error:
            'Cannot delete supplier with existing orders. Deactivate instead.',
        }
      }

      await fastify.prisma.supplier.delete({
        where: { id },
      })

      return { success: true, message: 'Supplier deleted successfully' }
    }
  )

  // Get supplier product catalog
  fastify.get(
    '/:id/products',
    {
      preHandler: [authMiddleware, requirePermission('suppliers', 'catalog')],
    },
    async (request, reply) => {
      const { id } = request.params as any
      const organizationId = getOrganizationId(request)

      // Verify supplier exists
      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id, organizationId },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      const products = await fastify.prisma.productSupplier.findMany({
        where: { supplierId: id },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          product: { name: 'asc' },
        },
      })

      return { success: true, data: products }
    }
  )

  // Add product to supplier catalog
  fastify.post(
    '/:id/products',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['suppliers.catalog', 'suppliers.write']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as any
      const {
        productId,
        supplierSku,
        orderingUnit,
        costPerUnit,
        costPerCase,
        minimumOrder,
        minimumOrderUnit,
        packSize,
        leadTimeDays,
        isPreferred,
      } = request.body as any
      const organizationId = getOrganizationId(request)

      // Verify supplier exists
      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id, organizationId },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      // Verify product exists and belongs to organization
      const product = await fastify.prisma.product.findFirst({
        where: { id: productId, organizationId },
      })

      if (!product) {
        reply.code(400)
        return { success: false, error: 'Product not found' }
      }

      // Check if relationship already exists
      const existingRelation = await fastify.prisma.productSupplier.findFirst({
        where: { productId, supplierId: id },
      })

      if (existingRelation) {
        reply.code(400)
        return {
          success: false,
          error: 'Product already associated with this supplier',
        }
      }

      const productSupplier = await fastify.prisma.productSupplier.create({
        data: {
          productId,
          supplierId: id,
          supplierSku,
          orderingUnit: orderingUnit || 'UNIT',
          costPerUnit,
          costPerCase: costPerCase || null,
          minimumOrder: minimumOrder || 1,
          minimumOrderUnit: minimumOrderUnit || null,
          packSize: packSize || product.caseSize || null,
          leadTimeDays: leadTimeDays || 3,
          isPreferred: isPreferred || false,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      return { success: true, data: productSupplier }
    }
  )

  // Update supplier product relationship
  fastify.put(
    '/:supplierId/products/:productId',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['suppliers.catalog', 'suppliers.pricing']),
      ],
    },
    async (request, reply) => {
      const { supplierId, productId } = request.params as any
      const {
        supplierSku,
        orderingUnit,
        costPerUnit,
        costPerCase,
        minimumOrder,
        minimumOrderUnit,
        packSize,
        leadTimeDays,
        isPreferred,
      } = request.body as any
      const organizationId = getOrganizationId(request)

      // Verify supplier belongs to organization
      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id: supplierId, organizationId },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      const productSupplier = await fastify.prisma.productSupplier.update({
        where: {
          productId_supplierId: {
            productId,
            supplierId,
          },
        },
        data: {
          ...(supplierSku !== undefined && { supplierSku }),
          ...(orderingUnit !== undefined && { orderingUnit }),
          ...(costPerUnit !== undefined && { costPerUnit }),
          ...(costPerCase !== undefined && {
            costPerCase: costPerCase || null,
          }),
          ...(minimumOrder !== undefined && { minimumOrder }),
          ...(minimumOrderUnit !== undefined && { minimumOrderUnit }),
          ...(packSize !== undefined && { packSize: packSize || null }),
          ...(leadTimeDays !== undefined && { leadTimeDays }),
          ...(isPreferred !== undefined && { isPreferred }),
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      return { success: true, data: productSupplier }
    }
  )

  // Remove product from supplier catalog
  fastify.delete(
    '/:supplierId/products/:productId',
    {
      preHandler: [
        authMiddleware,
        requireAnyPermission(['suppliers.catalog', 'suppliers.delete']),
      ],
    },
    async (request, reply) => {
      const { supplierId, productId } = request.params as any
      const organizationId = getOrganizationId(request)

      // Verify supplier belongs to organization
      const supplier = await fastify.prisma.supplier.findFirst({
        where: { id: supplierId, organizationId },
      })

      if (!supplier) {
        reply.code(404)
        return { success: false, error: 'Supplier not found' }
      }

      await fastify.prisma.productSupplier.delete({
        where: {
          productId_supplierId: {
            productId,
            supplierId,
          },
        },
      })

      return { success: true, message: 'Product removed from supplier catalog' }
    }
  )
}
