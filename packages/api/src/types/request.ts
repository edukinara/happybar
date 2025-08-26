import type { HappyBarRole } from '@happy-bar/types'
import type { PrismaClient } from '@happy-bar/database'

/**
 * Module augmentation to extend Fastify's interfaces
 * These properties are added by our authentication middleware and decorators
 */
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
  
  interface FastifyRequest {
    // User information from Better Auth session
    authUser?: {
      id: string
      email: string
      name: string
      emailVerified: boolean
    }
    
    // Organization information from database
    organization?: {
      id: string
      name: string
      slug: string | null
    }
    
    // Organization membership information
    member?: {
      id: string
      userId: string
      organizationId: string
      role: HappyBarRole
    }
    
    // Session information
    session?: {
      id: string
      userId: string
      activeOrganizationId: string
    }
    
    // Permission checking methods (added by middleware)
    hasPermission?: (resource: string, action: string) => boolean
    hasAnyPermission?: (permissions: string[]) => boolean
    hasAllPermissions?: (permissions: string[]) => boolean
    canManageRole?: (targetRole: HappyBarRole) => boolean
    
    // Approval context (added by approval middleware)
    approvalContext?: {
      type: 'order' | 'transfer' | 'adjustment' | 'bulk_operation'
      amount?: number
      items?: any[]
      targetLocationId?: string
      reason?: string
    }
  }
}