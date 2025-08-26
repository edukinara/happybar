import { LocationType } from '@happy-bar/types'
import type { FastifyPluginAsync } from 'fastify'
import { UsageTracker } from '../utils/usage-tracker'
import { authMiddleware, requirePermission, requireAnyPermission, AuthenticatedRequest } from '../middleware/auth-simple'
import { getAccessibleLocationIds } from '../utils/permissions'

interface LocationHierarchy {
  locationCode?: string
  zoneCode?: string
  aisleCode?: string
  shelfCode?: string
  binCode?: string
}

// Generate bin location code following format: LOCATION-ZONE-AISLE-SHELF-BIN
export function generateBinLocationCode(hierarchy: LocationHierarchy): string {
  const parts = []

  if (hierarchy.locationCode) parts.push(hierarchy.locationCode)
  if (hierarchy.zoneCode) parts.push(hierarchy.zoneCode)
  if (hierarchy.aisleCode) parts.push(hierarchy.aisleCode)
  if (hierarchy.shelfCode) parts.push(hierarchy.shelfCode)
  if (hierarchy.binCode) parts.push(hierarchy.binCode)

  return parts.join('-')
}

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
          zones: {
            include: {
              aisles: {
                include: {
                  shelves: {
                    include: {
                      bins: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      return { locations }
    } catch (error: any) {
      console.error('Failed to fetch locations:', error)
      fastify.log.error('Failed to fetch locations:', error)
      reply.code(500).send({ error: 'Failed to fetch locations' })
    }
  })

  // Create new location
  fastify.post('/', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { name, code, type, address, description } = request.body as {
      name: string
      code?: string
      type: LocationType
      address?: string
      description?: string
    }

    try {
      const location = await fastify.prisma.location.create({
        data: {
          organizationId: request.organization!.id,
          name,
          code,
          type,
          address,
          description,
        },
      })

      // Track location usage update
      try {
        const userId = (request as any).user?.id
        if (userId) {
          await UsageTracker.updateLocationUsage(userId, (request as any).organization!.id, fastify.prisma)
        }
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to track location usage after creation')
      }

      return location
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply.code(400).send({ error: 'Location name or code already exists' })
        return
      }
      fastify.log.error('Failed to create location:', error)
      reply.code(500).send({ error: 'Failed to create location' })
    }
  })

  // Update location
  // Update location
  fastify.put('/:locationId', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { locationId } = request.params as { locationId: string }
    const { name, code, type, address, description, isActive } =
      request.body as {
        name?: string
        code?: string
        type?: LocationType
        address?: string
        description?: string
        isActive?: boolean
      }

    try {
      const location = await fastify.prisma.location.update({
        where: {
          id: locationId,
          organizationId: request.organization!.id,
        },
        data: {
          name,
          code,
          type,
          address,
          description,
          isActive,
        },
      })

      return location
    } catch (error: any) {
      if (error.code === 'P2025') {
        reply.code(404).send({ error: 'Location not found' })
        return
      }
      fastify.log.error('Failed to update location:', error)
      reply.code(500).send({ error: 'Failed to update location' })
    }
  })

  // Delete location
  // Delete location
  fastify.delete('/:locationId', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { locationId } = request.params as { locationId: string }

    try {
      // Check if location has inventory items
      const inventoryCount = await fastify.prisma.inventoryItem.count({
        where: {
          locationId,
          organizationId: request.organization!.id,
        },
      })

      if (inventoryCount > 0) {
        reply.code(400).send({
          error: 'Cannot delete location with existing inventory items',
        })
        return
      }

      await fastify.prisma.location.delete({
        where: {
          id: locationId,
          organizationId: request.organization!.id,
        },
      })

      // Track location usage update after deletion
      try {
        const userId = (request as any).user?.id
        if (userId) {
          await UsageTracker.updateLocationUsage(userId, (request as any).organization!.id, fastify.prisma)
        }
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to track location usage after deletion')
      }

      reply.code(204).send()
    } catch (error: any) {
      if (error.code === 'P2025') {
        reply.code(404).send({ error: 'Location not found' })
        return
      }
      fastify.log.error('Failed to delete location:', error)
      reply.code(500).send({ error: 'Failed to delete location' })
    }
  })

  // Zone management
  // Create zone in location
  fastify.post('/:locationId/zones', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { locationId } = request.params as { locationId: string }
    const { name, code, description, temperature } = request.body as {
      name: string
      code: string
      description?: string
      temperature?: string
    }

    try {
      const zone = await fastify.prisma.zone.create({
        data: {
          organizationId: request.organization!.id,
          locationId,
          name,
          code,
          description,
          temperature,
        },
      })

      return zone
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply
          .code(400)
          .send({ error: 'Zone code already exists in this location' })
        return
      }
      fastify.log.error('Failed to create zone:', error)
      reply.code(500).send({ error: 'Failed to create zone' })
    }
  })

  // Aisle management
  // Create aisle in zone
  fastify.post('/zones/:zoneId/aisles', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { zoneId } = request.params as { zoneId: string }
    const { name, code } = request.body as {
      name: string
      code: string
    }

    try {
      const aisle = await fastify.prisma.aisle.create({
        data: {
          organizationId: request.organization!.id,
          zoneId,
          name,
          code,
        },
      })

      return aisle
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply
          .code(400)
          .send({ error: 'Aisle code already exists in this zone' })
        return
      }
      fastify.log.error('Failed to create aisle:', error)
      reply.code(500).send({ error: 'Failed to create aisle' })
    }
  })

  // Shelf management
  // Create shelf in aisle
  fastify.post('/aisles/:aisleId/shelves', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { aisleId } = request.params as { aisleId: string }
    const { name, code, level } = request.body as {
      name: string
      code: string
      level: number
    }

    try {
      const shelf = await fastify.prisma.shelf.create({
        data: {
          organizationId: request.organization!.id,
          aisleId,
          name,
          code,
          level,
        },
      })

      return shelf
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply
          .code(400)
          .send({ error: 'Shelf code already exists in this aisle' })
        return
      }
      fastify.log.error('Failed to create shelf:', error)
      reply.code(500).send({ error: 'Failed to create shelf' })
    }
  })

  // Bin management
  // Create bin in shelf
  fastify.post('/shelves/:shelfId/bins', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { shelfId } = request.params as { shelfId: string }
    const { name, code, barcode, maxCapacity } = request.body as {
      name: string
      code: string
      barcode?: string
      maxCapacity?: number
    }

    try {
      // Get shelf hierarchy to generate location code
      const shelf = await fastify.prisma.shelf.findUnique({
        where: { id: shelfId },
        include: {
          aisle: {
            include: {
              zone: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      })

      if (!shelf) {
        reply.code(404).send({ error: 'Shelf not found' })
        return
      }

      const bin = await fastify.prisma.bin.create({
        data: {
          organizationId: request.organization!.id,
          shelfId,
          name,
          code,
          barcode,
          maxCapacity,
        },
      })

      // Generate the full location code
      const locationCode = generateBinLocationCode({
        locationCode: shelf.aisle.zone.location.code || undefined,
        zoneCode: shelf.aisle.zone.code,
        aisleCode: shelf.aisle.code,
        shelfCode: shelf.code,
        binCode: code,
      })

      return { ...bin, locationCode }
    } catch (error: any) {
      if (error.code === 'P2002') {
        reply.code(400).send({ error: 'Bin code already exists on this shelf' })
        return
      }
      fastify.log.error('Failed to create bin:', error)
      reply.code(500).send({ error: 'Failed to create bin' })
    }
  })

  // Get inventory summary by location
  // Get inventory for location
  fastify.get('/:locationId/inventory', {
    preHandler: [authMiddleware, requirePermission('inventory', 'read')]
  }, async (request: any, reply) => {
    const { locationId } = request.params as { locationId: string }

    try {
      const inventory = await fastify.prisma.inventoryItem.findMany({
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
          zone: true,
          aisle: true,
          shelf: true,
          bin: true,
        },
        orderBy: [
          { zone: { code: 'asc' } },
          { aisle: { code: 'asc' } },
          { shelf: { level: 'asc' } },
          { bin: { code: 'asc' } },
        ],
      })

      // Add generated location codes
      const inventoryWithCodes = inventory.map((item: any) => ({
        ...item,
        locationCode:
          item.binLocationCode ||
          generateBinLocationCode({
            locationCode: item.location?.code,
            zoneCode: item.zone?.code,
            aisleCode: item.aisle?.code,
            shelfCode: item.shelf?.code,
            binCode: item.bin?.code,
          }),
      }))

      return { inventory: inventoryWithCodes }
    } catch (error: any) {
      fastify.log.error('Failed to fetch location inventory:', error)
      reply.code(500).send({ error: 'Failed to fetch location inventory' })
    }
  })

  // Quick setup for standard bar/restaurant locations
  // Quick setup for new locations
  fastify.post('/quick-setup', {
    preHandler: [authMiddleware, requirePermission('admin', 'locations')]
  }, async (request: any, reply) => {
    const { locationType } = request.body as {
      locationType: 'BAR' | 'KITCHEN' | 'STORAGE'
    }

    try {
      let locationName, zones

      switch (locationType) {
        case 'BAR':
          locationName = 'Main Bar'
          zones = [
            {
              name: 'Back Bar',
              code: 'BB',
              description: 'Spirits and liqueurs',
            },
            {
              name: 'Beer Cooler',
              code: 'BC',
              description: 'Draft beer and bottles',
              temperature: 'refrigerated',
            },
            { name: 'Wine Storage', code: 'WS', description: 'Wine inventory' },
            {
              name: 'Garnish Station',
              code: 'GS',
              description: 'Fresh garnishes',
              temperature: 'refrigerated',
            },
          ]
          break
        case 'KITCHEN':
          locationName = 'Main Kitchen'
          zones = [
            {
              name: 'Walk-in Cooler',
              code: 'WIC',
              description: 'Cold storage',
              temperature: 'refrigerated',
            },
            {
              name: 'Freezer',
              code: 'FRZ',
              description: 'Frozen storage',
              temperature: 'frozen',
            },
            {
              name: 'Dry Storage',
              code: 'DRY',
              description: 'Non-perishables',
              temperature: 'ambient',
            },
            {
              name: 'Prep Area',
              code: 'PREP',
              description: 'Food preparation area',
            },
          ]
          break
        case 'STORAGE':
          locationName = 'Main Storage'
          zones = [
            {
              name: 'Receiving',
              code: 'RCV',
              description: 'Incoming inventory',
            },
            {
              name: 'General Storage',
              code: 'GEN',
              description: 'General inventory',
            },
            { name: 'Overflow', code: 'OVR', description: 'Overflow storage' },
          ]
          break
      }

      // Create location
      const location = await fastify.prisma.location.create({
        data: {
          organizationId: request.organization!.id,
          name: locationName,
          code: locationType.substring(0, 3),
          type: locationType,
          description: `Auto-generated ${locationType.toLowerCase()} location`,
        },
      })

      // Create zones
      const createdZones = await Promise.all(
        zones.map((zone) =>
          fastify.prisma.zone.create({
            data: {
              organizationId: request.organization!.id,
              locationId: location.id,
              ...zone,
            },
          })
        )
      )

      // Track location usage update after quick setup
      try {
        const userId = (request as any).user?.id
        if (userId) {
          await UsageTracker.updateLocationUsage(userId, (request as any).organization!.id, fastify.prisma)
        }
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to track location usage after quick setup')
      }

      return {
        location,
        zones: createdZones,
        message: `Quick setup completed for ${locationType.toLowerCase()}`,
      }
    } catch (error: any) {
      fastify.log.error('Failed to create quick setup:', error)
      reply.code(500).send({ error: 'Failed to create quick setup' })
    }
  })
}
