import { PrismaClient } from '@happy-bar/database'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'
import { UnitConverter } from '../utils/unit-conversion'

const prisma = new PrismaClient()

export default async function recipesRoutes(fastify: FastifyInstance) {
  // Get all recipes for organization
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'read')],
    },
    async (request: any, reply) => {
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
    }
  )

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
              unit: z.string().optional(), // Unit for conversion
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
        select: {
          id: true,
          unit: true,
          unitSize: true,
        },
      })

      if (products.length !== productIds.length) {
        return reply.code(400).send({ error: 'Some products not found' })
      }

      // Create a map for easy product lookup
      const productMap = new Map(products.map((p) => [p.id, p]))

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
          validatedData.items.map((item) => {
            const product = productMap.get(item.productId)!

            // If a unit is provided and it's different from the product's unit, convert
            let finalQuantity = item.quantity
            if (item.unit && item.unit !== product.unit) {
              const conversion = UnitConverter.convert(
                item.quantity,
                item.unit,
                product.unit,
                product.unitSize
              )
              // Store as fraction of product unit
              finalQuantity = conversion.convertedAmount / product.unitSize
            } else if (!item.unit) {
              // If no unit specified, assume it's already in the correct fraction
              finalQuantity = item.quantity
            } else {
              // If unit matches product unit, convert to fraction
              finalQuantity = item.quantity / product.unitSize
            }

            return tx.recipeItem.create({
              data: {
                recipeId: recipe.id,
                productId: item.productId,
                quantity: finalQuantity,
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
          })
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
              unit: z.string().optional(), // Unit for conversion
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
            select: {
              id: true,
              unit: true,
              unitSize: true,
            },
          })

          if (products.length !== productIds.length) {
            throw new Error('Some products not found')
          }

          // Create a map for easy product lookup
          const productMap = new Map(products.map((p) => [p.id, p]))

          // Create new items with unit conversion
          const recipeItems = await Promise.all(
            validatedData.items.map((item) => {
              const product = productMap.get(item.productId)!

              // If a unit is provided and it's different from the product's unit, convert
              let finalQuantity = item.quantity
              if (item.unit && item.unit !== product.unit) {
                const conversion = UnitConverter.convert(
                  item.quantity,
                  item.unit,
                  product.unit,
                  product.unitSize
                )
                // Store as fraction of product unit
                finalQuantity = conversion.convertedAmount / product.unitSize
              } else if (!item.unit) {
                // If no unit specified, assume it's already in the correct fraction
                finalQuantity = item.quantity
              } else {
                // If unit matches product unit, convert to fraction
                finalQuantity = item.quantity / product.unitSize
              }

              return tx.recipeItem.create({
                data: {
                  recipeId: id,
                  productId: item.productId,
                  quantity: finalQuantity,
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
            })
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

  // Get recipe POS mapping suggestions
  fastify.get(
    '/mapping-suggestions/:integrationId',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'pos_mapping')],
    },
    async (request: any, reply) => {
      const organization = request.organization!
      const { integrationId } = request.params as { integrationId: string }

      const suggestions = await generateRecipeMappingSuggestions(
        prisma,
        organization.id,
        integrationId
      )

      return reply.send({ success: true, data: { suggestions } })
    }
  )

  // Create recipe POS mapping
  fastify.post(
    '/pos-mappings',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'pos_mapping')],
    },
    async (request: any, reply) => {
      const organization = request.organization!

      const validatedData = z
        .object({
          recipeId: z.string(),
          posProductId: z.string(),
          isActive: z.boolean().default(true),
        })
        .parse(request.body)

      // Verify recipe and POS product exist and belong to organization
      const [recipe, posProduct] = await Promise.all([
        prisma.recipe.findFirst({
          where: {
            id: validatedData.recipeId,
            organizationId: organization.id,
          },
        }),
        prisma.pOSProduct.findFirst({
          where: {
            id: validatedData.posProductId,
            organizationId: organization.id,
          },
        }),
      ])

      if (!recipe) {
        return reply.code(404).send({ error: 'Recipe not found' })
      }

      if (!posProduct) {
        return reply.code(404).send({ error: 'POS product not found' })
      }

      // Check if mapping already exists
      const existingMapping = await prisma.recipePOSMapping.findFirst({
        where: {
          organizationId: organization.id,
          recipeId: validatedData.recipeId,
          posProductId: validatedData.posProductId,
        },
      })

      if (existingMapping) {
        return reply.code(409).send({ error: 'Mapping already exists' })
      }

      const mapping = await prisma.recipePOSMapping.create({
        data: {
          recipeId: validatedData.recipeId,
          posProductId: validatedData.posProductId,
          isActive: validatedData.isActive,
          organizationId: organization.id,
        },
        include: {
          recipe: true,
          posProduct: {
            include: {
              integration: true,
            },
          },
        },
      })

      return reply.send({ success: true, data: { mapping } })
    }
  )

  // Get recipe POS mappings
  fastify.get(
    '/pos-mappings',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'read')],
    },
    async (request: any, reply) => {
      const organization = request.organization!

      const query = request.query as {
        integrationId?: string
        recipeId?: string
        posProductId?: string
        isActive?: string
      }

      const where: any = {
        organizationId: organization.id,
      }

      if (query.integrationId) {
        where.posProduct = {
          integrationId: query.integrationId,
        }
      }

      if (query.recipeId) {
        where.recipeId = query.recipeId
      }

      if (query.posProductId) {
        where.posProductId = query.posProductId
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive === 'true'
      }

      const mappings = await prisma.recipePOSMapping.findMany({
        where,
        include: {
          recipe: true,
          posProduct: {
            include: {
              integration: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send({ success: true, data: { mappings } })
    }
  )

  // Update recipe POS mapping
  fastify.put(
    '/pos-mappings/:id',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'pos_mapping')],
    },
    async (request: any, reply) => {
      const organization = request.organization!
      const { id } = request.params as { id: string }

      const validatedData = z
        .object({
          recipeId: z.string(),
          posProductId: z.string(),
          isActive: z.boolean().default(true),
        })
        .parse(request.body)

      // Check if mapping exists and belongs to organization
      const existingMapping = await prisma.recipePOSMapping.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
      })

      if (!existingMapping) {
        return reply.code(404).send({ error: 'Mapping not found' })
      }

      // Verify recipe and POS product exist and belong to organization
      const [recipe, posProduct] = await Promise.all([
        prisma.recipe.findFirst({
          where: {
            id: validatedData.recipeId,
            organizationId: organization.id,
          },
        }),
        prisma.pOSProduct.findFirst({
          where: {
            id: validatedData.posProductId,
            organizationId: organization.id,
          },
        }),
      ])

      if (!recipe) {
        return reply.code(404).send({ error: 'Recipe not found' })
      }

      if (!posProduct) {
        return reply.code(404).send({ error: 'POS product not found' })
      }

      // Check if mapping to this recipe-pos product combination already exists (different mapping ID)
      const conflictingMapping = await prisma.recipePOSMapping.findFirst({
        where: {
          organizationId: organization.id,
          recipeId: validatedData.recipeId,
          posProductId: validatedData.posProductId,
          id: { not: id },
        },
      })

      if (conflictingMapping) {
        return reply.code(409).send({
          error:
            'Another mapping already exists for this recipe-POS product combination',
        })
      }

      const updatedMapping = await prisma.recipePOSMapping.update({
        where: { id },
        data: {
          recipeId: validatedData.recipeId,
          posProductId: validatedData.posProductId,
          isActive: validatedData.isActive,
        },
        include: {
          recipe: true,
          posProduct: {
            include: {
              integration: true,
            },
          },
        },
      })

      return reply.send({ success: true, data: { mapping: updatedMapping } })
    }
  )

  // Delete recipe POS mapping
  fastify.delete(
    '/pos-mappings/:id',
    {
      preHandler: [authMiddleware, requirePermission('recipes', 'pos_mapping')],
    },
    async (request: any, reply) => {
      const organization = request.organization!
      const { id } = request.params as { id: string }

      const mapping = await prisma.recipePOSMapping.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
      })

      if (!mapping) {
        return reply.code(404).send({ error: 'Mapping not found' })
      }

      await prisma.recipePOSMapping.delete({
        where: { id },
      })

      return reply.send({ success: true })
    }
  )
}

// Helper function to generate recipe mapping suggestions
async function generateRecipeMappingSuggestions(
  prisma: PrismaClient,
  organizationId: string,
  integrationId: string
) {
  // Get unmapped POS products (exclude those already mapped to recipes)
  const posProducts = await prisma.pOSProduct.findMany({
    where: {
      organizationId,
      integrationId,
      isActive: true,
      recipePOSMappings: {
        none: {},
      },
      // Also exclude products that already have product mappings
      mappings: {
        none: {},
      },
    },
  })

  // Get all active recipes for this organization
  const allRecipes = await prisma.recipe.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    include: {
      recipePOSMappings: {
        include: {
          posProduct: {
            select: {
              integrationId: true,
            },
          },
        },
      },
    },
  })

  // Filter out recipes that are already mapped to this specific integration
  const recipes = allRecipes.filter(
    (recipe) =>
      !recipe.recipePOSMappings.some(
        (mapping) => mapping.posProduct.integrationId === integrationId
      )
  )

  const suggestions = []

  for (const posProduct of posProducts) {
    for (const recipe of recipes) {
      const confidence = calculateRecipeMappingConfidence(recipe, posProduct)

      if (confidence > 0.2) {
        // Lower threshold to see more suggestions
        suggestions.push({
          recipeId: recipe.id,
          posProductId: posProduct.id,
          recipeName: recipe.name,
          posProductName: posProduct.name,
          confidence,
          reasons: getRecipeMappingReasons(recipe, posProduct),
        })
      }
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Helper function to calculate recipe mapping confidence
function calculateRecipeMappingConfidence(
  recipe: any,
  posProduct: any
): number {
  let confidence = 0
  const recipeName = recipe.name.toLowerCase()
  const posName = posProduct.name.toLowerCase()

  // Exact name match
  if (recipeName === posName) {
    confidence += 0.9
  }
  // Partial name match
  else if (recipeName.includes(posName) || posName.includes(recipeName)) {
    confidence += 0.6
  }
  // Word-by-word comparison for better matching
  else {
    const recipeWords = recipeName.split(/\s+/)
    const posWords = posName.split(/\s+/)
    let matchingWords = 0

    for (const posWord of posWords) {
      if (
        posWord.length >= 3 &&
        recipeWords.some(
          (recipeWord: string) =>
            recipeWord.includes(posWord) || posWord.includes(recipeWord)
        )
      ) {
        matchingWords++
      }
    }

    if (matchingWords > 0) {
      const wordConfidence =
        (matchingWords / Math.max(posWords.length, recipeWords.length)) * 0.5
      confidence += wordConfidence
    }
  }

  // Look for common recipe/cocktail keywords
  const recipeKeywords = [
    'cocktail',
    'drink',
    'mixed',
    'specialty',
    'signature',
    'margarita',
    'martini',
    'beer',
    'wine',
    'shot',
    'liqueur',
  ]

  const hasRecipeKeywords = recipeKeywords.some(
    (keyword) => recipeName.includes(keyword) || posName.includes(keyword)
  )

  if (hasRecipeKeywords) {
    confidence += 0.2
  }

  // Category match (if POS product has drink/beverage category)
  if (posProduct.category) {
    const drinkCategories = [
      'drink',
      'cocktail',
      'beverage',
      'mixed',
      'alcohol',
      'bar',
      'beer',
      'wine',
      'spirit',
      'liquor',
    ]
    if (
      drinkCategories.some((cat) =>
        posProduct.category.toLowerCase().includes(cat)
      )
    ) {
      confidence += 0.3
    }
  }

  // Base score for any recipe to any POS product to show some suggestions
  if (confidence === 0) {
    confidence = 0.1
  }

  const finalConfidence = Math.min(confidence, 1.0)

  return finalConfidence
}

// Helper function to get recipe mapping reasons
function getRecipeMappingReasons(recipe: any, posProduct: any): string[] {
  const reasons = []

  if (recipe.name.toLowerCase() === posProduct.name.toLowerCase()) {
    reasons.push('Exact name match')
  } else if (
    recipe.name.toLowerCase().includes(posProduct.name.toLowerCase()) ||
    posProduct.name.toLowerCase().includes(recipe.name.toLowerCase())
  ) {
    reasons.push('Partial name match')
  }

  const recipeKeywords = [
    'cocktail',
    'drink',
    'mixed',
    'specialty',
    'signature',
  ]
  const recipeName = recipe.name.toLowerCase()
  const posName = posProduct.name.toLowerCase()

  if (
    recipeKeywords.some(
      (keyword) => recipeName.includes(keyword) || posName.includes(keyword)
    )
  ) {
    reasons.push('Contains recipe keywords')
  }

  if (posProduct.category) {
    const drinkCategories = [
      'drink',
      'cocktail',
      'beverage',
      'mixed',
      'alcohol',
      'bar',
    ]
    if (
      drinkCategories.some((cat) =>
        posProduct.category.toLowerCase().includes(cat)
      )
    ) {
      reasons.push('Drink/beverage category')
    }
  }

  return reasons
}
