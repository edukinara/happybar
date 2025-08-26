import { redis } from './redis-client'

interface PendingLocationAssignment {
  email: string
  organizationId: string
  locationIds: string[]
  permissions: {
    canRead: boolean
    canWrite: boolean
    canManage: boolean
  }
  createdAt: string
  expiresAt: string
}

const PENDING_ASSIGNMENT_PREFIX = 'pending_assignment:'
const ASSIGNMENT_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export class PendingAssignmentManager {
  static async storePendingAssignment(assignment: Omit<PendingLocationAssignment, 'createdAt' | 'expiresAt'>) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ASSIGNMENT_TTL * 1000)
    
    const fullAssignment: PendingLocationAssignment = {
      ...assignment,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
    
    const key = `${PENDING_ASSIGNMENT_PREFIX}${assignment.email}:${assignment.organizationId}`
    
    await redis.set(key, JSON.stringify(fullAssignment), {
      ex: ASSIGNMENT_TTL,
    })
    
    console.log(`Stored pending assignment for ${assignment.email}:`, fullAssignment)
    return fullAssignment
  }
  
  static async getPendingAssignment(email: string, organizationId: string): Promise<PendingLocationAssignment | null> {
    const key = `${PENDING_ASSIGNMENT_PREFIX}${email}:${organizationId}`
    const stored = await redis.get(key)
    
    console.log(`🔍 Retrieved from Redis for key ${key}:`, { stored, type: typeof stored })
    
    if (!stored) {
      return null
    }
    
    try {
      // If stored is already an object, return it directly
      if (typeof stored === 'object' && stored !== null) {
        console.log('✅ Stored value is already an object, returning directly')
        return stored as PendingLocationAssignment
      }
      
      // If it's a string, parse it
      if (typeof stored === 'string') {
        console.log('🔄 Parsing stored string value')
        return JSON.parse(stored)
      }
      
      console.warn('⚠️ Unexpected stored value type:', typeof stored)
      return null
    } catch (error) {
      console.error('Failed to parse pending assignment:', error)
      console.error('Raw stored value:', stored)
      return null
    }
  }
  
  static async deletePendingAssignment(email: string, organizationId: string): Promise<void> {
    const key = `${PENDING_ASSIGNMENT_PREFIX}${email}:${organizationId}`
    await redis.del(key)
    console.log(`Deleted pending assignment for ${email}`)
  }
  
  static async applyPendingAssignment(userId: string, email: string, organizationId: string, prisma?: any): Promise<boolean> {
    const assignment = await this.getPendingAssignment(email, organizationId)
    
    if (!assignment) {
      console.log(`No pending assignment found for ${email}`)
      return false
    }
    
    try {
      // Use provided prisma instance or import it
      const { PrismaClient } = await import('@happy-bar/database')
      const db = prisma || new PrismaClient()
      
      // Create location assignments directly using Prisma
      for (const locationId of assignment.locationIds) {
        await db.userLocationAssignment.create({
          data: {
            organizationId,
            userId,
            locationId,
            canRead: assignment.permissions.canRead,
            canWrite: assignment.permissions.canWrite,
            canManage: assignment.permissions.canManage,
            assignedById: userId, // Assign to themselves for now - could be improved to track who invited them
            isActive: true,
          }
        })
      }
      
      // Clean up the pending assignment
      await this.deletePendingAssignment(email, organizationId)
      
      console.log(`Applied pending assignment for ${email}: ${assignment.locationIds.length} locations`)
      return true
    } catch (error) {
      console.error('Failed to apply pending assignment:', error)
      return false
    }
  }
}