import { PrismaClient } from '@happy-bar/database'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission, requireAnyPermission, AuthenticatedRequest } from '../middleware/auth-simple'

const prisma = new PrismaClient()

export default async function recipesRoutes(fastify: FastifyInstance) {
  // Get all recipes for organization
  fastify.get('/', {
    preHandler: [authMiddleware, requirePermission('recipes', 'read')]
  }, async (request: any, reply) => {
    const organization = request.organization!

    const { page = 1, limit = 20, search, isActive } = request.query as any

    const where: any = {
      organizationId: organization.id,
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const offset = (page - 1) * limit

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  costPerUnit: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: Number(limit),
      }),
      prisma.recipe.count({ where }),
    ])

    // Calculate total cost for each recipe
    const recipesWithCosts = recipes.map((recipe) => {
      const totalCost = recipe.items.reduce(
        (sum, item) => sum + item.quantity * (item.product.costPerUnit || 0),
        0
      )
      const costPerServing =
        recipe.yield > 0 ? totalCost / recipe.yield : totalCost

      return {
        ...recipe,
        totalCost,
        costPerServing,
      }
    })

    return reply.send({
      success: true,
      data: {
        recipes: recipesWithCosts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    })
  })

  // Get specific recipe
  fastify.get('/:id', async (request, reply) => {
    const organization = (request as any).organization
    if (!organization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { id } = request.params as { id: string }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                costPerUnit: true,
                container: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!recipe) {
      return reply.code(404).send({ error: 'Recipe not found' })
    }

    // Calculate costs
    const totalCost = recipe.items.reduce(
      (sum, item) => sum + item.quantity * (item.product.costPerUnit || 0),
      0
    )
    const costPerServing =
      recipe.yield > 0 ? totalCost / recipe.yield : totalCost

    return reply.send({
      success: true,
      data: {
        ...recipe,
        totalCost,
        costPerServing,
      },
    })
  })

  // Create new recipe
  fastify.post('', async (request, reply) => {
    const organization = (request as any).organization
    if (!organization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const validatedData = z
      .object({
        name: z.string().min(1, 'Recipe name is required'),
        yield: z.number().positive('Yield must be positive').default(1),
        isActive: z.boolean().default(true),
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().positive('Quantity must be positive'),
            })
          )
          .min(1, 'Recipe must have at least one ingredient'),
      })
      .parse(request.body)

    try {
      // Check if recipe name already exists
      const existingRecipe = await prisma.recipe.findFirst({
        where: {
          organizationId: organization.id,
          name: validatedData.name,
        },
      })

      if (existingRecipe) {
        return reply.code(400).send({ error: 'Recipe name already exists' })
      }

      // Verify all products exist and belong to organization
      const productIds = validatedData.items.map((item) => item.productId)
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          organizationId: organization.id,
        },
      })

      if (products.length !== productIds.length) {
        return reply.code(400).send({ error: 'Some products not found' })
      }

      // Create recipe with items in transaction
      const result = await prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            organizationId: organization.id,
            name: validatedData.name,
            yield: validatedData.yield,
            isActive: validatedData.isActive,
          },
        })

        const recipeItems = await Promise.all(
          validatedData.items.map((item) =>
            tx.recipeItem.create({
              data: {
                recipeId: recipe.id,
                productId: item.productId,
                quantity: item.quantity,
              },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    costPerUnit: true,
                  },
                },
              },
            })
          )
        )

        return { ...recipe, items: recipeItems }
      })

      return reply.send({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('Recipe creation error:', error)
      return reply.code(500).send({ error: 'Failed to create recipe' })
    }
  })

  // Update recipe
  fastify.put('/:id', async (request, reply) => {
    const organization = (request as any).organization
    if (!organization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { id } = request.params as { id: string }

    const validatedData = z
      .object({
        name: z.string().min(1, 'Recipe name is required').optional(),
        yield: z.number().positive('Yield must be positive').optional(),
        isActive: z.boolean().optional(),
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().positive('Quantity must be positive'),
            })
          )
          .optional(),
      })
      .parse(request.body)

    try {
      // Check if recipe exists
      const existingRecipe = await prisma.recipe.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
      })

      if (!existingRecipe) {
        return reply.code(404).send({ error: 'Recipe not found' })
      }

      // Check name uniqueness if updating name
      if (validatedData.name && validatedData.name !== existingRecipe.name) {
        const nameExists = await prisma.recipe.findFirst({
          where: {
            organizationId: organization.id,
            name: validatedData.name,
            NOT: { id },
          },
        })

        if (nameExists) {
          return reply.code(400).send({ error: 'Recipe name already exists' })
        }
      }

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update recipe basic info
        const recipe = await tx.recipe.update({
          where: { id },
          data: {
            ...(validatedData.name && { name: validatedData.name }),
            ...(validatedData.yield !== undefined && {
              yield: validatedData.yield,
            }),
            ...(validatedData.isActive !== undefined && {
              isActive: validatedData.isActive,
            }),
          },
        })

        // Update items if provided
        if (validatedData.items) {
          // Delete existing items
          await tx.recipeItem.deleteMany({
            where: { recipeId: id },
          })

          // Verify products exist
          const productIds = validatedData.items.map((item) => item.productId)
          const products = await tx.product.findMany({
            where: {
              id: { in: productIds },
              organizationId: organization.id,
            },
          })

          if (products.length !== productIds.length) {
            throw new Error('Some products not found')
          }

          // Create new items
          const recipeItems = await Promise.all(
            validatedData.items.map((item) =>
              tx.recipeItem.create({
                data: {
                  recipeId: id,
                  productId: item.productId,
                  quantity: item.quantity,
                },
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      unit: true,
                      costPerUnit: true,
                    },
                  },
                },
              })
            )
          )

          return { ...recipe, items: recipeItems }
        }

        // If not updating items, fetch existing ones
        const items = await tx.recipeItem.findMany({
          where: { recipeId: id },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                costPerUnit: true,
              },
            },
          },
        })

        return { ...recipe, items }
      })

      return reply.send({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('Recipe update error:', error)
      return reply.code(500).send({ error: 'Failed to update recipe' })
    }
  })

  // Delete recipe
  fastify.delete('/:id', async (request, reply) => {
    const organization = (request as any).organization
    if (!organization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { id } = request.params as { id: string }

    try {
      const recipe = await prisma.recipe.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
      })

      if (!recipe) {
        return reply.code(404).send({ error: 'Recipe not found' })
      }

      await prisma.recipe.delete({
        where: { id },
      })

      return reply.send({
        success: true,
        message: 'Recipe deleted successfully',
      })
    } catch (error) {
      console.error('Recipe deletion error:', error)
      return reply.code(500).send({ error: 'Failed to delete recipe' })
    }
  })

  // Get recipe cost breakdown
  fastify.get('/:id/cost-breakdown', async (request, reply) => {
    const organization = (request as any).organization
    if (!organization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { id } = request.params as { id: string }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                costPerUnit: true,
                container: true,
              },
            },
          },
        },
      },
    })

    if (!recipe) {
      return reply.code(404).send({ error: 'Recipe not found' })
    }

    const breakdown = recipe.items.map((item) => {
      const itemCost = item.quantity * (item.product.costPerUnit || 0)
      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        costPerUnit: item.product.costPerUnit || 0,
        totalCost: itemCost,
        container: item.product.container,
      }
    })

    const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0)
    const costPerServing =
      recipe.yield > 0 ? totalCost / recipe.yield : totalCost

    return reply.send({
      success: true,
      data: {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          yield: recipe.yield,
        },
        breakdown,
        summary: {
          totalCost,
          costPerServing,
          ingredientCount: breakdown.length,
        },
      },
    })
  })
}
