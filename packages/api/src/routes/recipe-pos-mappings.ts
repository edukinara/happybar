import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const createMappingSchema = z.object({
  recipeId: z.string().cuid(),
  posProductId: z.string().cuid(),
  isActive: z.boolean().default(true),
})

const updateMappingSchema = z.object({
  isActive: z.boolean().optional(),
  recipeId: z.string().optional(),
  posProductId: z.string().optional(),
})

const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  recipeId: z.string().cuid().optional(),
  posProductId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
})

const recipePOSMappingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all recipe-POS mappings
  fastify.get('/', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    const params = searchParamsSchema.parse(request.query)
    const { page, limit, search, recipeId, posProductId, isActive } = params

    const where: {
      organizationId: string
      recipeId?: string
      posProductId?: string
      isActive?: boolean
      OR?: Array<any>
    } = {
      organizationId,
    }

    if (recipeId) where.recipeId = recipeId
    if (posProductId) where.posProductId = posProductId
    if (isActive !== undefined) where.isActive = isActive

    // Handle search across recipe and POS product names
    if (search) {
      where.OR = [
        {
          recipe: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          posProduct: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ]
    }

    const [mappings, total] = await Promise.all([
      fastify.prisma.recipePOSMapping.findMany({
        where,
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
            },
          },
          posProduct: {
            select: {
              id: true,
              name: true,
              externalId: true,
              category: true,
              price: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      fastify.prisma.recipePOSMapping.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    reply.send({
      success: true,
      data: {
        mappings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    })
  })

  // Create a new recipe-POS mapping
  fastify.post('/', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    let data
    try {
      data = createMappingSchema.parse(request.body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Invalid request data',
          details: 'errors' in error ? error.errors : [],
        })
        return
      }
      throw error
    }

    // Check if recipe exists and belongs to organization
    const recipe = await fastify.prisma.recipe.findFirst({
      where: {
        id: data.recipeId,
        organizationId,
      },
    })

    if (!recipe) {
      reply.status(404).send({
        success: false,
        error: 'Recipe not found',
      })
      return
    }

    // Check if POS product exists and belongs to organization
    const posProduct = await fastify.prisma.pOSProduct.findFirst({
      where: {
        id: data.posProductId,
        organizationId,
      },
    })

    if (!posProduct) {
      reply.status(404).send({
        success: false,
        error: 'POS product not found',
      })
      return
    }

    // Check if mapping already exists
    const existingMapping = await fastify.prisma.recipePOSMapping.findFirst({
      where: {
        recipeId: data.recipeId,
        posProductId: data.posProductId,
        organizationId,
      },
    })

    if (existingMapping) {
      reply.status(409).send({
        success: false,
        error: 'Mapping already exists between this recipe and POS product',
      })
      return
    }

    const mapping = await fastify.prisma.recipePOSMapping.create({
      data: {
        ...data,
        organizationId,
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
          },
        },
        posProduct: {
          select: {
            id: true,
            name: true,
            externalId: true,
            category: true,
            price: true,
          },
        },
      },
    })

    reply.status(201).send({
      success: true,
      data: mapping,
    })
  })

  // Update a recipe-POS mapping
  fastify.put('/:id', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    const id = z
      .string()
      .cuid()
      .parse((request.params as any).id)
    const data = updateMappingSchema.parse(request.body)

    // Check if mapping exists and belongs to organization
    const existingMapping = await fastify.prisma.recipePOSMapping.findFirst({
      where: {
        id,
        organizationId,
      },
    })

    if (!existingMapping) {
      reply.status(404).send({
        success: false,
        error: 'Mapping not found',
      })
      return
    }

    const mapping = await fastify.prisma.recipePOSMapping.update({
      where: { id },
      data,
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
          },
        },
        posProduct: {
          select: {
            id: true,
            name: true,
            externalId: true,
            category: true,
            price: true,
          },
        },
      },
    })

    reply.send({
      success: true,
      data: mapping,
    })
  })

  // Delete a recipe-POS mapping
  fastify.delete('/:id', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    const id = z
      .string()
      .cuid()
      .parse((request.params as any).id)

    // Check if mapping exists and belongs to organization
    const existingMapping = await fastify.prisma.recipePOSMapping.findFirst({
      where: {
        id,
        organizationId,
      },
    })

    if (!existingMapping) {
      reply.status(404).send({
        success: false,
        error: 'Mapping not found',
      })
      return
    }

    await fastify.prisma.recipePOSMapping.delete({
      where: { id },
    })

    reply.send({
      success: true,
      data: { message: 'Mapping deleted successfully' },
    })
  })

  // Get available recipes for mapping (not already mapped to a POS product)
  fastify.get('/available-recipes', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    const recipes = await fastify.prisma.recipe.findMany({
      where: {
        organizationId,
        isActive: true,
        // Only recipes that don't have any active mappings
        recipePOSMappings: {
          none: {
            isActive: true,
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                costPerUnit: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate costs for each recipe
    const recipesWithCosts = recipes.map((recipe) => {
      const totalCost = recipe.items.reduce(
        (sum, item) => sum + item.quantity * (item.product.costPerUnit || 0),
        0
      )
      const costPerServing =
        recipe.yield > 0 ? totalCost / recipe.yield : totalCost

      return {
        id: recipe.id,
        name: recipe.name,
        yield: recipe.yield,
        totalCost,
        costPerServing,
      }
    })

    reply.send({
      success: true,
      data: recipesWithCosts,
    })
  })

  // Get available POS products for mapping (not already mapped to a recipe)
  fastify.get('/available-pos-products', async (request, reply) => {
    if (!request.organization?.id) {
      throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
    }
    const organizationId = request.organization.id

    const posProducts = await fastify.prisma.pOSProduct.findMany({
      where: {
        organizationId,
        isActive: true,
        // Only POS products that don't have any active mappings
        recipePOSMappings: {
          none: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        category: true,
        price: true,
        servingUnit: true,
        servingSize: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    reply.send({
      success: true,
      data: posProducts,
    })
  })
}

export default recipePOSMappingsRoutes
