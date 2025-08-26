import type { FastifyInstance } from 'fastify'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'
import { PendingAssignmentManager } from '../utils/pending-assignments'

export default async function pendingAssignmentsRoutes(fastify: FastifyInstance) {
  // Store pending location assignment for an invitation
  fastify.post('/pending-assignments', {
    preHandler: [authMiddleware, requirePermission('users', 'invite')]
  }, async (request, reply) => {
    try {
      const { email, locationIds, permissions } = request.body as {
        email: string
        locationIds: string[]
        permissions: {
          canRead: boolean
          canWrite: boolean
          canManage: boolean
        }
      }

      // Get the organization ID from the authenticated request
      const organizationId = (request as any).organization?.id || (request as any).session?.activeOrganizationId

      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'No active organization'
        })
      }

      if (!email || !locationIds || locationIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Email and location IDs are required'
        })
      }

      const assignment = await PendingAssignmentManager.storePendingAssignment({
        email,
        organizationId,
        locationIds,
        permissions,
      })

      return reply.send({
        success: true,
        data: assignment
      })
    } catch (error) {
      console.error('Failed to store pending assignment:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to store pending assignment'
      })
    }
  })

  // Get pending assignment (for debugging/admin purposes)
  fastify.get('/pending-assignments/:email', {
    preHandler: [authMiddleware, requirePermission('users', 'read')]
  }, async (request, reply) => {
    try {
      const { email } = request.params as { email: string }
      // Get the organization ID from the authenticated request
      const organizationId = (request as any).organization?.id || (request as any).session?.activeOrganizationId

      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'No active organization'
        })
      }

      const assignment = await PendingAssignmentManager.getPendingAssignment(email, organizationId)

      return reply.send({
        success: true,
        data: assignment
      })
    } catch (error) {
      console.error('Failed to get pending assignment:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to get pending assignment'
      })
    }
  })


  // Apply pending assignments (called after invitation acceptance)
  fastify.post('/apply-pending-assignments', async (request, reply) => {
    try {
      const { userId, email, organizationId } = request.body as {
        userId: string
        email: string
        organizationId: string
      }

      console.log('🔄 Applying pending assignments for:', { userId, email, organizationId })

      // Apply pending location assignments
      const applied = await PendingAssignmentManager.applyPendingAssignment(
        userId,
        email,
        organizationId,
        fastify.prisma
      )

      // After applying assignments, try to set active organization for this session
      try {
        const { auth } = await import('../auth')
        
        // Get current session 
        const sessionData = await auth.api.getSession({
          headers: (request as any).headers
        })
        
        if (sessionData?.session) {
          console.log('🔄 Setting active organization via Better Auth organization plugin')
          console.log('Current session before update:', {
            token: sessionData.session.token ? 'present' : 'missing',
            userId: sessionData.session.userId,
            activeOrganizationId: sessionData.session.activeOrganizationId
          })
          
          // Use Better Auth's organization plugin to set active organization
          const setActiveOrgResult = await auth.api.setActiveOrganization({
            headers: (request as any).headers,
            body: {
              organizationId: organizationId
            }
          })
          
          if (setActiveOrgResult.error) {
            console.error('❌ Failed to set active organization via Better Auth:', setActiveOrgResult.error)
            throw new Error(`Better Auth setActiveOrganization failed: ${setActiveOrgResult.error.message}`)
          }
          
          console.log(`✅ Set active organization via Better Auth: ${organizationId}`)
          console.log('Set active organization result:', setActiveOrgResult)
          
          // Verify the update worked by getting the session again
          const verifySession = await auth.api.getSession({
            headers: (request as any).headers
          })
          console.log('Session after update:', verifySession?.session?.activeOrganizationId)
        } else {
          console.log('⚠️ No session found from Better Auth')
        }
      } catch (sessionUpdateError) {
        console.warn('Failed to set active organization:', sessionUpdateError)
        console.warn('Error details:', (sessionUpdateError as Error)?.message || 'Unknown error')
      }

      console.log('✅ Pending assignments applied successfully')

      return reply.send({
        success: true,
        applied,
        message: applied ? 'Pending assignments applied successfully' : 'No pending assignments found'
      })
    } catch (error) {
      console.error('Failed to apply pending assignments:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to apply pending assignments'
      })
    }
  })
}