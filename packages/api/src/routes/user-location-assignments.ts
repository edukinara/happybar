import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth-simple'
import { AppError, ErrorCode } from '@happy-bar/types'

const assignLocationSchema = z.object({
  userId: z.string(),
  locationId: z.string(),
  canRead: z.boolean().default(true),
  canWrite: z.boolean().default(false),
  canManage: z.boolean().default(false)
})

const updateAssignmentSchema = z.object({
  canRead: z.boolean().optional(),
  canWrite: z.boolean().optional(),
  canManage: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export const userLocationAssignmentRoutes: FastifyPluginAsync = async function (fastify) {
  // Get all user location assignments for the organization
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('users', 'read')]
    },
    async (request, reply) => {
      const organizationId = request.organization!.id

      const assignments = await fastify.prisma.userLocationAssignment.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { user: { name: 'asc' } },
          { location: { name: 'asc' } }
        ]
      })

      return {
        success: true,
        data: assignments
      }
    }
  )

  // Get location assignments for a specific user
  fastify.get(
    '/user/:userId',
    {
      preHandler: [authMiddleware, requirePermission('users', 'read')]
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const organizationId = request.organization!.id

      // Verify user is in the organization
      const member = await fastify.prisma.member.findFirst({
        where: { userId, organizationId }
      })

      if (!member) {
        throw new AppError('User not found in organization', ErrorCode.NOT_FOUND, 404)
      }

      const assignments = await fastify.prisma.userLocationAssignment.findMany({
        where: { 
          userId,
          organizationId,
          isActive: true
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              isActive: true
            }
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { location: { name: 'asc' } }
      })

      // Also get all available locations for comparison
      const allLocations = await fastify.prisma.location.findMany({
        where: { organizationId, isActive: true },
        select: {
          id: true,
          name: true,
          type: true
        },
        orderBy: { name: 'asc' }
      })

      return {
        success: true,
        data: {
          assignments,
          availableLocations: allLocations,
          user: {
            id: member.userId,
            role: member.role
          }
        }
      }
    }
  )

  // Assign user to location
  fastify.post(
    '/',
    {
      preHandler: [authMiddleware, requirePermission('users', 'write')]
    },
    async (request, reply) => {
      const data = assignLocationSchema.parse(request.body)
      const organizationId = request.organization!.id
      const assignedById = request.authUser!.id

      // Verify user is in the organization
      const member = await fastify.prisma.member.findFirst({
        where: { userId: data.userId, organizationId }
      })

      if (!member) {
        throw new AppError('User not found in organization', ErrorCode.NOT_FOUND, 404)
      }

      // Verify location exists in the organization
      const location = await fastify.prisma.location.findFirst({
        where: { id: data.locationId, organizationId }
      })

      if (!location) {
        throw new AppError('Location not found', ErrorCode.NOT_FOUND, 404)
      }

      // Check if assignment already exists
      const existingAssignment = await fastify.prisma.userLocationAssignment.findFirst({
        where: {
          userId: data.userId,
          locationId: data.locationId,
          organizationId
        }
      })

      if (existingAssignment) {
        // Update existing assignment if it was inactive
        const assignment = await fastify.prisma.userLocationAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            canRead: data.canRead,
            canWrite: data.canWrite,
            canManage: data.canManage,
            isActive: true,
            assignedById,
            assignedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        })

        return {
          success: true,
          data: assignment,
          message: 'Location assignment updated'
        }
      } else {
        // Create new assignment
        const assignment = await fastify.prisma.userLocationAssignment.create({
          data: {
            organizationId,
            userId: data.userId,
            locationId: data.locationId,
            canRead: data.canRead,
            canWrite: data.canWrite,
            canManage: data.canManage,
            assignedById
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        })

        return {
          success: true,
          data: assignment,
          message: 'Location assignment created'
        }
      }
    }
  )

  // Update location assignment
  fastify.put(
    '/:assignmentId',
    {
      preHandler: [authMiddleware, requirePermission('users', 'write')]
    },
    async (request, reply) => {
      const { assignmentId } = request.params as { assignmentId: string }
      const data = updateAssignmentSchema.parse(request.body)
      const organizationId = request.organization!.id

      // Verify assignment exists and belongs to organization
      const existingAssignment = await fastify.prisma.userLocationAssignment.findFirst({
        where: { id: assignmentId, organizationId }
      })

      if (!existingAssignment) {
        throw new AppError('Assignment not found', ErrorCode.NOT_FOUND, 404)
      }

      const assignment = await fastify.prisma.userLocationAssignment.update({
        where: { id: assignmentId },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      })

      return {
        success: true,
        data: assignment,
        message: 'Assignment updated successfully'
      }
    }
  )

  // Remove location assignment (soft delete)
  fastify.delete(
    '/:assignmentId',
    {
      preHandler: [authMiddleware, requirePermission('users', 'write')]
    },
    async (request, reply) => {
      const { assignmentId } = request.params as { assignmentId: string }
      const organizationId = request.organization!.id

      // Verify assignment exists and belongs to organization
      const existingAssignment = await fastify.prisma.userLocationAssignment.findFirst({
        where: { id: assignmentId, organizationId }
      })

      if (!existingAssignment) {
        throw new AppError('Assignment not found', ErrorCode.NOT_FOUND, 404)
      }

      await fastify.prisma.userLocationAssignment.update({
        where: { id: assignmentId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })

      return {
        success: true,
        message: 'Location assignment removed'
      }
    }
  )

  // Bulk assign user to multiple locations
  fastify.post(
    '/bulk',
    {
      preHandler: [authMiddleware, requirePermission('users', 'write')]
    },
    async (request, reply) => {
      const bulkSchema = z.object({
        userId: z.string(),
        locationIds: z.array(z.string()),
        permissions: z.object({
          canRead: z.boolean().default(true),
          canWrite: z.boolean().default(false),
          canManage: z.boolean().default(false)
        })
      })

      const data = bulkSchema.parse(request.body)
      const organizationId = request.organization!.id
      const assignedById = request.authUser!.id

      // Verify user is in the organization
      const member = await fastify.prisma.member.findFirst({
        where: { userId: data.userId, organizationId }
      })

      if (!member) {
        throw new AppError('User not found in organization', ErrorCode.NOT_FOUND, 404)
      }

      // Verify all locations exist in the organization
      const locations = await fastify.prisma.location.findMany({
        where: { 
          id: { in: data.locationIds },
          organizationId 
        }
      })

      if (locations.length !== data.locationIds.length) {
        throw new AppError('Some locations not found', ErrorCode.NOT_FOUND, 404)
      }

      // Remove existing assignments for this user
      await fastify.prisma.userLocationAssignment.updateMany({
        where: {
          userId: data.userId,
          organizationId
        },
        data: {
          isActive: false
        }
      })

      // Create new assignments
      const assignmentsData = data.locationIds.map(locationId => ({
        organizationId,
        userId: data.userId,
        locationId,
        canRead: data.permissions.canRead,
        canWrite: data.permissions.canWrite,
        canManage: data.permissions.canManage,
        assignedById
      }))

      await fastify.prisma.userLocationAssignment.createMany({
        data: assignmentsData
      })

      return {
        success: true,
        message: `User assigned to ${data.locationIds.length} locations`
      }
    }
  )
}