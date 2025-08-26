import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'


export async function accountLinkingRoutes(fastify: FastifyInstance) {
  // Custom content-type parser for DELETE requests that handles empty JSON bodies
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      if (req.method === 'DELETE' && (!body || (typeof body === 'string' && body.trim() === ''))) {
        // For DELETE requests with empty bodies, just return empty object
        done(null, {})
      } else {
        // For non-empty bodies, parse normally
        const json = JSON.parse(body as string)
        done(null, json)
      }
    } catch (err: any) {
      err.statusCode = 400
      done(err, undefined)
    }
  })
  // Get linked accounts for current user
  fastify.get('/linked-accounts', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user as { id: string; email: string; name: string }

    try {
      // Get linked accounts from the database, excluding credential accounts
      const linkedAccounts = await fastify.prisma.account.findMany({
        where: {
          userId: user.id,
          providerId: {
            not: 'credential', // Exclude email/password accounts
          },
        },
        select: {
          id: true,
          accountId: true, // This contains the unique ID from the provider
          providerId: true, // This contains the provider name (e.g., "google")
          createdAt: true,
        },
      })

      // Transform to match the expected interface, filtering out any other non-social providers
      const socialProviders = ['google', 'github', 'facebook', 'twitter'] // Add more as needed
      const transformedAccounts = linkedAccounts
        .filter(account => socialProviders.includes(account.providerId))
        .map(account => ({
          id: account.id,
          provider: account.providerId, // providerId contains the provider name
          providerId: account.accountId, // accountId contains the unique provider ID
          createdAt: account.createdAt,
        }))

      return transformedAccounts
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error)
      reply.code(500).send({
        error: 'Failed to fetch linked accounts',
        code: 'FETCH_LINKED_ACCOUNTS_ERROR',
      })
    }
  })

  // Unlink a social account
  fastify.delete('/linked-accounts/:accountId', {
    preHandler: [requireAuth],
    attachValidation: true,
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      }
    }
  }, async (request, reply) => {
    const user = request.user as { id: string; email: string; name: string }
    const { accountId } = request.params as { accountId: string }

    try {
      // Validate account exists and belongs to user
      const account = await fastify.prisma.account.findFirst({
        where: {
          id: accountId,
          userId: user.id,
        },
      })

      if (!account) {
        return reply.code(404).send({
          error: 'Account not found or does not belong to user',
          code: 'ACCOUNT_NOT_FOUND',
        })
      }

      // Check if user has at least one other way to sign in
      const userAccounts = await fastify.prisma.account.findMany({
        where: {
          userId: user.id,
        },
      })

      // Check if user has a password set (stored in the Account table for credential accounts)
      const passwordAccount = await fastify.prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'credential',
        },
        select: {
          password: true,
        },
      })

      // Ensure user can still sign in after unlinking
      if (userAccounts.length === 1 && !passwordAccount?.password) {
        return reply.code(400).send({
          error: 'Cannot unlink last sign-in method. Please set a password first.',
          code: 'LAST_SIGNIN_METHOD',
        })
      }

      // Delete the account
      await fastify.prisma.account.delete({
        where: {
          id: accountId,
        },
      })

      return { success: true, message: 'Account unlinked successfully' }
    } catch (error) {
      console.error('Failed to unlink account:', error)
      reply.code(500).send({
        error: 'Failed to unlink account',
        code: 'UNLINK_ACCOUNT_ERROR',
      })
    }
  })

  // Link account status endpoint
  fastify.get('/link-status/:provider', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user as { id: string; email: string; name: string }
    const { provider } = request.params as { provider: string }

    try {
      const linkedAccount = await fastify.prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: provider, // providerId contains the provider name
        },
      })

      return {
        isLinked: !!linkedAccount,
        account: linkedAccount ? {
          id: linkedAccount.id,
          provider: linkedAccount.providerId, // providerId contains provider name
          createdAt: linkedAccount.createdAt,
        } : null,
      }
    } catch (error) {
      console.error('Failed to check link status:', error)
      reply.code(500).send({
        error: 'Failed to check link status',
        code: 'LINK_STATUS_ERROR',
      })
    }
  })
}