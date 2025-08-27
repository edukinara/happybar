import { AppError, ErrorCode } from '@happy-bar/types'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { InventoryDepletionService } from '../services/inventory-depletion'

// Schema for POS sale item
const saleItemSchema = z.object({
  posProductId: z.string(),
  externalProductId: z.string(),
  quantity: z.number().positive(),
  price: z.number().optional(),
  name: z.string().optional(),
})

// Schema for POS sale webhook
const posSaleSchema = z.object({
  integrationId: z.string().cuid(),
  externalOrderId: z.string(),
  timestamp: z.string().datetime(),
  items: z.array(saleItemSchema).min(1),
  totalAmount: z.number().optional(),
  source: z.enum(['toast', 'manual']).default('toast'),
})

const posWebhooks: FastifyPluginAsync = async (fastify) => {
  const inventoryService = new InventoryDepletionService(fastify.prisma)

  // Process POS sale and deduct inventory
  fastify.post('/pos-webhooks/sale', async (request, reply) => {
    try {
      const data = posSaleSchema.parse(request.body)

      // Find the integration to get organization context
      const integration = await fastify.prisma.pOSIntegration.findUnique({
        where: { id: data.integrationId },
        select: { id: true, organizationId: true, name: true, type: true },
      })

      if (!integration) {
        throw new AppError(ErrorCode.NOT_FOUND, 'POS integration not found')
      }

      const organizationId = integration.organizationId

      // Process each sale item
      const results = []
      const errors = []

      for (const item of data.items) {
        try {
          const result = await inventoryService.depleteInventoryForSaleItem(
            organizationId,
            data.integrationId,
            item.externalProductId,
            item.quantity,
            data.externalOrderId,
            data.timestamp,
            {
              source: 'pos_webhook', // Let settings determine policy
            }
          )
          results.push(result)
        } catch (error) {
          console.error(
            `Error processing sale item ${item.externalProductId}:`,
            error
          )
          errors.push({
            posProductId: item.posProductId,
            externalProductId: item.externalProductId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      reply.send({
        success: true,
        processed: results.length,
        errors: errors.length,
        results,
        errorDetails: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      console.error('POS webhook error:', error)

      if (error instanceof AppError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code,
        })
      } else {
        reply.status(500).send({
          success: false,
          error: 'Internal server error processing POS sale',
        })
      }
    }
  })
}

export default posWebhooks
