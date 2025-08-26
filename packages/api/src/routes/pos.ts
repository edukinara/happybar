import { createPOSClient } from '@happy-bar/pos'
import {
  AppError,
  ErrorCode,
  POSType,
  ToastCredentials,
} from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { POSSyncService } from '../services/pos-sync'
import { toastPartnerService } from '../services/toast-partner'
import {
  formatLocationCode,
  generateUniqueLocationCode,
} from '../utils/location-code'

// Helper function to clean up POS products and mappings from deselected groups
async function cleanupDeselectedGroups(
  integrationId: string,
  selectedGroupGuids: string[],
  prisma: unknown,
  organizationId: string
) {
  // Get all POS products for this integration that are NOT in the selected groups
  const productsToDelete = await (prisma as any).pOSProduct.findMany({
    where: {
      integrationId,
      organizationId,
      // Only delete products that have a category (group) and it's not in selected groups
      AND: [
        { category: { not: null } },
        { category: { notIn: selectedGroupGuids.map((guid) => `%${guid}%`) } },
      ],
    },
    include: {
      mappings: true,
    },
  })

  if (productsToDelete.length > 0) {
    // Delete product mappings first
    await (prisma as any).productMapping.deleteMany({
      where: {
        posProductId: { in: productsToDelete.map((p: { id: string }) => p.id) },
        organizationId,
      },
    })

    // Delete POS products
    await (prisma as any).pOSProduct.deleteMany({
      where: {
        id: { in: productsToDelete.map((p: { id: string }) => p.id) },
        organizationId,
      },
    })
  }
}

// Validation schemas
const toastCredentialsSchema = z
  .object({
    name: z.string().min(1),
    type: z.literal('TOAST'),
    integrationMode: z.enum(['standard', 'partner']),
    // Standard API Access fields
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    // partnerLocationId: For Partner mode = 6-digit location code, For Standard mode = Restaurant GUID
    partnerLocationId: z.string().min(1),
  })
  .refine(
    (data) => {
      if (data.integrationMode === 'standard') {
        // Standard API Access requires clientId, clientSecret, and restaurantGuid
        return !!(data.clientId && data.clientSecret && data.partnerLocationId)
      } else {
        // Partner integration requires 6-digit location code
        return !!(
          data.partnerLocationId && /^\d{6}$/.test(data.partnerLocationId)
        )
      }
    },
    {
      message: 'Invalid credentials for selected integration mode',
    }
  )

const syncRequestSchema = z.object({
  integrationId: z.string(),
  syncSales: z.boolean().default(false),
  selectedGroupGuids: z.array(z.string()).optional(),
  salesDateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
})

// Helper to get organization ID or throw error
function getOrganizationId(request: any): string {
  if (!request.organization?.id) {
    throw new AppError('Authentication required', ErrorCode.UNAUTHORIZED, 401)
  }
  return request.organization.id
}

export const posRoutes: FastifyPluginAsync = async function (fastify) {
  // Initialize sync service
  const syncService = new POSSyncService(fastify.prisma)
  // Authentication is now handled by global Better Auth organization middleware

  // Generate a unique location code for Toast Partner Integration
  fastify.post('/generate-location-code', async (request, reply) => {
    try {
      const code = await generateUniqueLocationCode(fastify.prisma)

      return {
        success: true,
        data: {
          locationCode: code,
          formattedCode: formatLocationCode(code),
        },
      }
    } catch (error: any) {
      throw new AppError(
        'Failed to generate location code',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get POS integrations
  fastify.get('/integrations', async (request, reply) => {
    const integrations = await fastify.prisma.pOSIntegration.findMany({
      where: { organizationId: getOrganizationId(request) },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        lastSyncAt: true,
        syncStatus: true,
        syncErrors: true,
        selectedGroupGuids: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: integrations,
    }
  })

  // Update selected groups for a POS integration
  fastify.put(
    '/integrations/:integrationId/selected-groups',
    async (request, reply) => {
      const { integrationId } = request.params as { integrationId: string }
      const { selectedGroupGuids } = request.body as {
        selectedGroupGuids: string[]
      }

      try {
        // Update the integration with selected groups
        const integration = await fastify.prisma.pOSIntegration.update({
          where: {
            id: integrationId,
            organizationId: getOrganizationId(request),
          },
          data: {
            selectedGroupGuids: selectedGroupGuids,
          },
        })

        // Clean up any POS products and mappings from deselected groups
        if (selectedGroupGuids.length > 0) {
          await cleanupDeselectedGroups(
            integrationId,
            selectedGroupGuids,
            fastify.prisma,
            getOrganizationId(request)
          )
        }

        return {
          success: true,
          data: integration,
        }
      } catch (error: unknown) {
        if ((error as { code?: string }).code === 'P2025') {
          throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
        }
        throw error
      }
    }
  )

  // Get menu groups for a POS integration
  fastify.get(
    '/integrations/:integrationId/menu-groups',
    async (request, reply) => {
      const { integrationId } = request.params as { integrationId: string }

      try {
        // Get integration details
        const integration = await fastify.prisma.pOSIntegration.findFirst({
          where: {
            id: integrationId,
            organizationId: getOrganizationId(request),
          },
        })

        if (!integration) {
          throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
        }

        // Create POS client
        const client = createPOSClient(integration.credentials as any)

        // Get location IDs based on integration mode
        const credentials = integration.credentials as any
        let locationIds: string[] = []

        if (credentials.integrationMode === 'standard') {
          if (credentials.partnerLocationId) {
            locationIds = [credentials.partnerLocationId]
          }
        } else {
          throw new Error(
            'Menu groups are only available for Standard API Access mode'
          )
        }

        if (!locationIds || locationIds.length === 0) {
          throw new Error('No locations configured for this integration')
        }

        // Check if the client supports menu groups
        if (!client.getMenuGroups) {
          throw new Error(
            'Menu groups are not supported by this POS integration'
          )
        }

        // Get menu groups from the first location
        const locationId = locationIds[0]
        if (!locationId) {
          throw new Error('No valid location ID found')
        }

        const menuGroups = await client.getMenuGroups(locationId)

        return {
          success: true,
          data: menuGroups,
        }
      } catch (error: any) {
        console.error('Failed to fetch menu groups:', error)
        throw new AppError(
          error.message || 'Failed to fetch menu groups',
          ErrorCode.INTEGRATION_ERROR,
          500
        )
      }
    }
  )

  // Create new POS integration
  fastify.post('/integrations', async (request, reply) => {
    const data = request.body as z.infer<typeof toastCredentialsSchema>

    try {
      // Validate the integration data
      const validatedData = toastCredentialsSchema.parse(data)

      // Check if integration name already exists for this organization
      const existingIntegration = await fastify.prisma.pOSIntegration.findFirst(
        {
          where: {
            organizationId: getOrganizationId(request),
            name: validatedData.name,
          },
        }
      )

      if (existingIntegration) {
        throw new AppError(
          'Integration with this name already exists',
          ErrorCode.VALIDATION_ERROR,
          400
        )
      }

      // Create Toast credentials object
      const credentials: ToastCredentials = {
        type: POSType.TOAST,
        integrationMode: validatedData.integrationMode,
        // Both integration modes use the same partnerLocationId field
        partnerLocationId: validatedData.partnerLocationId,
        ...(validatedData.integrationMode === 'standard'
          ? {
              clientId: validatedData.clientId,
              clientSecret: validatedData.clientSecret,
            }
          : {}),
      }

      // Test the connection before saving
      const client = createPOSClient(credentials)
      const testResult = await client.testConnection()

      if (!testResult.success) {
        throw new AppError(
          `Failed to connect to Toast: ${testResult.error}`,
          ErrorCode.INTEGRATION_ERROR,
          400
        )
      }

      // Save the integration (credentials should be encrypted in production)
      const integration = await fastify.prisma.pOSIntegration.create({
        data: {
          organizationId: getOrganizationId(request),
          name: validatedData.name,
          type: 'TOAST',
          credentials: credentials as any, // This should be encrypted
          syncStatus: 'NEVER_SYNCED',
        },
      })

      reply.code(201)
      return {
        success: true,
        data: {
          id: integration.id,
          name: integration.name,
          type: integration.type,
          isActive: integration.isActive,
          syncStatus: integration.syncStatus,
          createdAt: integration.createdAt,
        },
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error
      }
      if (error instanceof z.ZodError) {
        throw new AppError(
          'Invalid integration data',
          ErrorCode.VALIDATION_ERROR,
          400
        )
      }
      throw new AppError(
        'Failed to create integration',
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Update POS integration
  fastify.put('/integrations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = request.body as Partial<z.infer<typeof toastCredentialsSchema>>

    const integration = await fastify.prisma.pOSIntegration.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!integration) {
      throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
    }

    const updatedIntegration = await fastify.prisma.pOSIntegration.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.name ? true : integration.isActive,
        // Update credentials if provided (should encrypt in production)
        ...(Object.keys(data).length > 1 && { credentials: data as any }),
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      data: {
        id: updatedIntegration.id,
        name: updatedIntegration.name,
        type: updatedIntegration.type,
        isActive: updatedIntegration.isActive,
        syncStatus: updatedIntegration.syncStatus,
        lastSyncAt: updatedIntegration.lastSyncAt,
        updatedAt: updatedIntegration.updatedAt,
      },
    }
  })

  // Delete POS integration
  fastify.delete('/integrations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const integration = await fastify.prisma.pOSIntegration.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!integration) {
      throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
    }

    await fastify.prisma.pOSIntegration.delete({
      where: { id },
    })

    return {
      success: true,
      message: 'Integration deleted successfully',
    }
  })

  // Test POS integration connection
  fastify.post('/integrations/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string }

    const integration = await fastify.prisma.pOSIntegration.findFirst({
      where: {
        id,
        organizationId: getOrganizationId(request),
      },
    })

    if (!integration) {
      throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
    }

    try {
      const credentials = integration.credentials as any as ToastCredentials

      // For partner integration, validate through our partner service
      if (credentials.integrationMode === 'partner') {
        if (!credentials.partnerLocationId) {
          return {
            success: false,
            error: 'Location code is required for partner integration',
          }
        }

        const validation = await toastPartnerService.validateLocationCode(
          credentials.partnerLocationId
        )

        return {
          success: validation.valid,
          data: {
            connectionTest: validation.valid
              ? `Found ${validation.restaurantCount} connected restaurant(s) for code ${formatLocationCode(credentials.partnerLocationId)}`
              : `No restaurants found for code ${formatLocationCode(credentials.partnerLocationId)}. Please make sure you've entered this code as the Location ID in Toast Partner Integrations.`,
            restaurantCount: validation.restaurantCount,
          },
        }
      } else {
        // Standard API Access - test directly
        const client = createPOSClient(credentials)
        const testResult = await client.testConnection()
        return {
          success: true,
          data: {
            connectionTest: testResult.success,
          },
        }
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  })

  // Sync with POS
  fastify.post('/sync', async (request, reply) => {
    const data = request.body as z.infer<typeof syncRequestSchema>
    const validatedData = syncRequestSchema.parse(data)

    const integration = await fastify.prisma.pOSIntegration.findFirst({
      where: {
        id: validatedData.integrationId,
        organizationId: getOrganizationId(request),
      },
    })

    if (!integration) {
      throw new AppError('Integration not found', ErrorCode.NOT_FOUND, 404)
    }

    try {
      // Update sync status to SYNCING
      await fastify.prisma.pOSIntegration.update({
        where: { id: integration.id },
        data: { syncStatus: 'SYNCING' },
      })

      const credentials = integration.credentials as any as ToastCredentials

      // Get restaurant/location IDs based on integration mode
      let locationIds: string[] = []

      if (credentials.integrationMode === 'partner') {
        // Partner mode: partnerLocationId is a 6-digit code
        // We need to get the actual restaurant GUIDs from the partner service
        if (credentials.partnerLocationId) {
          const restaurants =
            await toastPartnerService.getRestaurantsByLocationCode(
              credentials.partnerLocationId
            )
          locationIds = restaurants.map((r) => r.restaurantGuid)
        }
      } else if (credentials.integrationMode === 'standard') {
        // Standard API Access: partnerLocationId is the restaurant GUID itself
        if (credentials.partnerLocationId) {
          locationIds = [credentials.partnerLocationId]
        }
      }

      if (locationIds.length === 0) {
        throw new Error('No locations configured for sync')
      }

      // Perform sync
      const syncOptions =
        validatedData.syncSales && validatedData.salesDateRange
          ? {
              start: new Date(validatedData.salesDateRange.start),
              end: new Date(validatedData.salesDateRange.end),
            }
          : undefined

      const syncResult = await syncService.performSync(
        getOrganizationId(request),
        integration.id,
        validatedData.syncSales,
        syncOptions,
        locationIds,
        validatedData.selectedGroupGuids
      )

      // Update sync status and timestamp
      const syncStatus = syncResult.success
        ? syncResult.errors && syncResult.errors.length > 0
          ? 'PARTIAL_SUCCESS'
          : 'SUCCESS'
        : 'FAILED'

      await fastify.prisma.pOSIntegration.update({
        where: { id: integration.id },
        data: {
          syncStatus,
          lastSyncAt: new Date(),
          syncErrors: syncResult.errors || [],
        },
      })

      return {
        success: true,
        data: syncResult,
      }
    } catch (error: any) {
      // Update sync status to FAILED
      await fastify.prisma.pOSIntegration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          syncErrors: [error.message],
        },
      })

      throw new AppError(
        `Sync failed: ${error.message}`,
        ErrorCode.INTEGRATION_ERROR,
        500
      )
    }
  })

  // Get theoretical usage analysis
  fastify.get('/theoretical-usage', async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string
      endDate?: string
    }

    if (!startDate || !endDate) {
      throw new AppError(
        'startDate and endDate are required',
        ErrorCode.VALIDATION_ERROR,
        400
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    const analysis = await syncService.calculateTheoreticalUsage(
      getOrganizationId(request),
      start,
      end
    )

    return {
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        analysis,
      },
    }
  })
}
