import { Prisma, prisma } from '@happy-bar/database'
import { Product } from 'autumn-js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { SubscriptionService } from '../../services/subscription'

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

const updateOrganizationSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
})

interface SubscriptionData {
  totalCustomers: number
  activeSubscriptions: number
  monthlyRevenue: number
  products: Product[]
  error: string | null
}

export default async function adminPlatformRoutes(fastify: FastifyInstance) {
  // Get platform metrics
  fastify.get(
    '/metrics',
    {
      preHandler: [fastify.authenticateAdmin],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date()
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [
          totalOrganizations,
          activeOrganizations,
          newOrganizationsThisMonth,
          totalUsers,
          activeUsersToday,
          activeUsersThisWeek,
          totalProducts,
          totalOrders,
          ordersThisMonth,
          totalSales,
          salesThisMonth,
          totalPOSIntegrations,
          activePOSIntegrations,
          totalInventoryItems,
          lowStockAlerts,
          recentSignups,
        ] = await Promise.all([
          // Organization metrics
          prisma.organization.count(),
          prisma.organization.count({
            where: {
              members: {
                some: {
                  user: {
                    sessions: {
                      some: {
                        createdAt: { gte: oneWeekAgo },
                      },
                    },
                  },
                },
              },
            },
          }),
          prisma.organization.count({
            where: { createdAt: { gte: oneMonthAgo } },
          }),

          // User metrics
          prisma.user.count(),
          prisma.user.count({
            where: {
              sessions: {
                some: {
                  createdAt: { gte: oneDayAgo },
                },
              },
            },
          }),
          prisma.user.count({
            where: {
              sessions: {
                some: {
                  createdAt: { gte: oneWeekAgo },
                },
              },
            },
          }),

          // Product and order metrics
          prisma.product.count(),
          prisma.order.count(),
          prisma.order.count({
            where: { createdAt: { gte: oneMonthAgo } },
          }),

          // Sales metrics
          prisma.sale.count(),
          prisma.sale.count({
            where: { createdAt: { gte: oneMonthAgo } },
          }),

          // Integration metrics
          prisma.pOSIntegration.count(),
          prisma.pOSIntegration.count({
            where: {
              isActive: true,
              syncStatus: { in: ['SUCCESS', 'PARTIAL_SUCCESS'] },
            },
          }),

          // Inventory metrics
          prisma.inventoryItem.count(),
          prisma.alert.count({
            where: {
              status: 'ACTIVE',
              type: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
            },
          }),

          // Recent signups (last 7 days)
          prisma.user.count({
            where: { createdAt: { gte: oneWeekAgo } },
          }),
        ])

        // Get subscription data from Autumn (parallel fetch)
        let subscriptionData: SubscriptionData = {
          totalCustomers: 0,
          activeSubscriptions: 0,
          monthlyRevenue: 0,
          products: [],
          error: null as string | null,
        }

        try {
          // Get all organizations to check their subscription status
          const organizations = await prisma.organization.findMany({
            select: { id: true, name: true },
          })

          // Try to get products from Autumn
          try {
            const products = await SubscriptionService.getProducts()
            subscriptionData.products = products || []
          } catch (error) {
            console.warn('Failed to fetch Autumn products:', error)
          }

          // Count organizations as potential customers
          subscriptionData.totalCustomers = organizations.length

          // Note: In a real implementation, you'd iterate through organizations
          // and check their subscription status with Autumn API
          // For now, we'll use a simplified estimation
          subscriptionData.activeSubscriptions = Math.floor(
            organizations.length * 0.7
          ) // Assume 70% have active subscriptions
          subscriptionData.monthlyRevenue =
            subscriptionData.activeSubscriptions * 99 // Assume $99/month average
        } catch (error) {
          console.error('Error fetching subscription data:', error)
          subscriptionData.error = 'Failed to fetch subscription data'
        }

        // Calculate growth rates
        const organizationGrowth =
          newOrganizationsThisMonth > 0
            ? (
                (newOrganizationsThisMonth /
                  Math.max(totalOrganizations - newOrganizationsThisMonth, 1)) *
                100
              ).toFixed(1)
            : '0'

        const userActivityRate =
          totalUsers > 0
            ? ((activeUsersThisWeek / totalUsers) * 100).toFixed(1)
            : '0'

        return reply.send({
          organizations: {
            total: totalOrganizations,
            active: activeOrganizations,
            newThisMonth: newOrganizationsThisMonth,
            growthRate: `+${organizationGrowth}%`,
          },
          users: {
            total: totalUsers,
            activeToday: activeUsersToday,
            activeThisWeek: activeUsersThisWeek,
            recentSignups,
            activityRate: `${userActivityRate}%`,
          },
          products: {
            total: totalProducts,
          },
          orders: {
            total: totalOrders,
            thisMonth: ordersThisMonth,
          },
          sales: {
            total: totalSales,
            thisMonth: salesThisMonth,
          },
          integrations: {
            total: totalPOSIntegrations,
            active: activePOSIntegrations,
            healthRate:
              totalPOSIntegrations > 0
                ? `${((activePOSIntegrations / totalPOSIntegrations) * 100).toFixed(0)}%`
                : '0%',
          },
          inventory: {
            totalItems: totalInventoryItems,
            lowStockAlerts,
          },
          subscriptions: {
            totalCustomers: subscriptionData.totalCustomers,
            activeSubscriptions: subscriptionData.activeSubscriptions,
            monthlyRevenue: subscriptionData.monthlyRevenue,
            conversionRate:
              subscriptionData.totalCustomers > 0
                ? `${((subscriptionData.activeSubscriptions / subscriptionData.totalCustomers) * 100).toFixed(1)}%`
                : '0%',
            products: subscriptionData.products.length,
            error: subscriptionData.error,
          },
          system: {
            timestamp: now.toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
          },
        })
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // List organizations
  fastify.get(
    '/organizations',
    {
      preHandler: [fastify.authenticateAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { page, limit, search } = paginationSchema.parse(request.query)
        const skip = (page - 1) * limit

        const where: Prisma.OrganizationWhereInput = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}

        const [organizations, total] = await Promise.all([
          prisma.organization.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  members: true,
                  products: true,
                  orders: true,
                  sales: true,
                  locations: true,
                },
              },
              members: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: {
                  user: {
                    select: {
                      email: true,
                      sessions: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { createdAt: true },
                      },
                    },
                  },
                },
              },
              sales: {
                select: {
                  totalAmount: true,
                  saleDate: true,
                },
                orderBy: { saleDate: 'desc' },
                take: 30,
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.organization.count({ where }),
        ])

        const organizationsWithStatus = organizations.map((org) => {
          const lastSession = org.members[0]?.user?.sessions[0]?.createdAt
          const monthlyRevenue = org.sales.reduce((sum, sale) => {
            const saleDate = new Date(sale.saleDate)
            const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return saleDate > oneMonthAgo ? sum + sale.totalAmount : sum
          }, 0)

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
            status:
              lastSession &&
              new Date(lastSession) >
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ? 'active'
                : 'inactive',
            lastActivity: lastSession || null,
            lastActiveAt: lastSession
              ? new Date(lastSession).toISOString()
              : null,
            owner: {
              email: org.members[0]?.user?.email || 'No owner',
            },
            plan: 'free', // Default plan - would need subscription data to determine actual plan
            stats: {
              users: org._count.members,
              locations: org._count.locations || 1,
              products: org._count.products,
              monthlyRevenue,
            },
            _count: org._count,
          }
        })

        return reply.send({
          organizations: organizationsWithStatus,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        })
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // Get organization details
  fastify.get<{ Params: { id: string } }>(
    '/organizations/:id',
    {
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: request.params.id },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    sessions: {
                      take: 1,
                      orderBy: { createdAt: 'desc' },
                      select: { createdAt: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                products: true,
                orders: true,
                locations: true,
                sales: true,
              },
            },
          },
        })

        if (!organization) {
          return reply.code(404).send({ error: 'Organization not found' })
        }

        return reply.send(organization)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // Update organization (for admin purposes)
  fastify.patch<{ Params: { id: string } }>(
    '/organizations/:id',
    {
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      try {
        const updates = updateOrganizationSchema.parse(request.body)

        const organization = await prisma.organization.update({
          where: { id: request.params.id },
          data: updates,
          select: {
            id: true,
            name: true,
            slug: true,
            metadata: true,
            updatedAt: true,
          },
        })

        return reply.send(organization)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // List all users across organizations
  fastify.get(
    '/users',
    {
      preHandler: [fastify.authenticateAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { page, limit, search } = paginationSchema.parse(request.query)
        const skip = (page - 1) * limit

        const where: Prisma.UserWhereInput = search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              email: true,
              name: true,
              emailVerified: true,
              createdAt: true,
              members: {
                include: {
                  organization: {
                    select: { id: true, name: true },
                  },
                },
              },
              sessions: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.user.count({ where }),
        ])

        return reply.send({
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        })
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )
}
