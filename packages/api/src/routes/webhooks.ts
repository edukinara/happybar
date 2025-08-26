import { FastifyPluginAsync } from 'fastify'

export const webhookRoutes: FastifyPluginAsync = async function (fastify) {
  // Handle POS webhooks
  fastify.post('/pos/:provider', async (request, reply) => {
    // TODO: Handle POS system webhooks
    const { provider } = request.params as { provider: string }
    request.log.info({ provider }, 'Received webhook from POS provider')
    
    reply.code(200)
    return { success: true }
  })
}