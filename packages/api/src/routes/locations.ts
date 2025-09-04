import { LocationType } from '@happy-bar/types'
import type { FastifyPluginAsync } from 'fastify'
import { UsageTracker } from '../utils/usage-tracker'
import { authMiddleware, requirePermission, requireAnyPermission, AuthenticatedRequest } from '../middleware/auth-simple'
import { getAccessibleLocationIds } from '../utils/permissions'

export const locationsRoutes: FastifyPluginAsync = async function (fastify) {
  // Authentication is now handled by global Better Auth tenant middleware

  // Get all locations for organization
  fastify.get('/', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.locations', 'locations.all', 'locations.assigned_only'])]
  }, async (request: any, reply) => {
    try {

      // Get accessible locations based on user role
      const accessibleLocationIds = await getAccessibleLocationIds(
        request.member!.role,
        request.organization!.id,
        request.user!.id,
        fastify.prisma
      )

      // Build location filter
      const locationFilter = ['owner', 'admin', 'manager', 'buyer'].includes(request.member!.role)
        ? {}
        : { id: { in: accessibleLocationIds } }

      const locations = await fastify.prisma.location.findMany({
        where: { 
          organizationId: request.organization!.id,
          ...locationFilter
        },
        include: {
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      return {
        success: true,
        data: { locations }
      }
    } catch (error: any) {
      console.error('Failed to fetch locations:', error)
      fastify.log.error('Failed to fetch locations:', error)
      reply.code(500).send({ success: false, error: 'Failed to fetch locations' })
    }
  })

  // Create new location
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { name, code, type, address, description } = request.body as {
      name: string
      code?: string
      type?: LocationType
      address?: string
      description?: string
    }

    try {
      const location = await fastify.prisma.location.create({
        data: {
          organizationId: request.organization!.id,
          name: name.trim(),
          code: code?.trim(),
          type: type || LocationType.STORAGE,
          address: address?.trim(),
          description: description?.trim(),
        },
      })

      // Track usage
      await UsageTracker.updateLocationUsage(
        request.organization.autumnCustomerId,
        request.organization.id,
        fastify.prisma
      )

      return {
        success: true,
        data: location
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply.code(400).send({ success: false, error: 'Location name or code already exists' })
        return
      }
      fastify.log.error('Failed to create location:', error)
      reply.code(500).send({ success: false, error: 'Failed to create location' })
    }
  })

  // Update location
  fastify.put('/:id', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string }
    const { name, code, type, address, description } = request.body as {
      name?: string
      code?: string
      type?: LocationType
      address?: string
      description?: string
    }

    try {
      const updateData: any = {}
      if (name !== undefined) updateData.name = name.trim()
      if (code !== undefined) updateData.code = code?.trim() || null
      if (type !== undefined) updateData.type = type
      if (address !== undefined) updateData.address = address?.trim() || null
      if (description !== undefined) updateData.description = description?.trim() || null

      const location = await fastify.prisma.location.update({
        where: {
          id,
          organizationId: request.organization!.id,
        },
        data: updateData,
      })

      return {
        success: true,
        data: location
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply.code(400).send({ success: false, error: 'Location name or code already exists' })
        return
      }
      if (error.code === 'P2025') {
        reply.code(404).send({ success: false, error: 'Location not found' })
        return
      }
      fastify.log.error('Failed to update location:', error)
      reply.code(500).send({ success: false, error: 'Failed to update location' })
    }
  })

  // Delete location
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string }

    try {
      await fastify.prisma.location.delete({
        where: {
          id,
          organizationId: request.organization!.id,
        },
      })

      return { message: 'Location deleted successfully' }
    } catch (error: any) {
      if (error.code === 'P2025') {
        reply.code(404).send({ success: false, error: 'Location not found' })
        return
      }
      if (error.code === 'P2003') {
        reply.code(400).send({ 
          error: 'Cannot delete location with existing inventory items' 
        })
        return
      }
      fastify.log.error('Failed to delete location:', error)
      reply.code(500).send({ success: false, error: 'Failed to delete location' })
    }
  })

  // Get inventory items for a location
  fastify.get('/:locationId/inventory', {
    preHandler: [authMiddleware, requireAnyPermission(['admin.locations', 'locations.all', 'locations.assigned_only'])]
  }, async (request: any, reply) => {
    const { locationId } = request.params as { locationId: string }

    try {
      const inventoryItems = await fastify.prisma.inventoryItem.findMany({
        where: {
          locationId,
          organizationId: request.organization!.id,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          location: true,
        },
        orderBy: [
          { product: { name: 'asc' } },
        ],
      })

      return {
        success: true,
        data: { inventoryItems }
      }
    } catch (error: any) {
      fastify.log.error('Failed to fetch location inventory:', error)
      reply.code(500).send({ success: false, error: 'Failed to fetch location inventory' })
    }
  })

  // Quick setup for basic location types
  fastify.post('/quick-setup', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { type: locationType } = request.body as { type: LocationType }

    if (!Object.values(LocationType).includes(locationType)) {
      reply.code(400).send({ error: 'Invalid location type' })
      return
    }

    try {
      let locationName

      switch (locationType) {
        case 'BAR':
          locationName = 'Main Bar'
          break
        case 'KITCHEN':
          locationName = 'Main Kitchen'
          break
        case 'STORAGE':
          locationName = 'Main Storage'
          break
        default:
          locationName = 'New Location'
      }

      const location = await fastify.prisma.location.create({
        data: {
          organizationId: request.organization!.id,
          name: locationName,
          type: locationType,
        },
      })

      // Track usage
      await UsageTracker.updateLocationUsage(
        request.organization.autumnCustomerId,
        request.organization.id,
        fastify.prisma
      )

      return {
        success: true,
        data: {
          location,
          message: `Quick setup completed for ${locationType.toLowerCase()}`
        }
      }
    } catch (error: any) {
      fastify.log.error('Failed to create quick setup location:', error)
      reply.code(500).send({ success: false, error: 'Failed to create location' })
    }
  })
}

export default locationsRoutes