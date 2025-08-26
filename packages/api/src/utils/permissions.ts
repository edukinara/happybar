import { PrismaClient } from '@happy-bar/database'
import type { HappyBarRole } from '@happy-bar/types'

/**
 * Permission checking utilities for Happy Bar RBAC system
 */

// Role hierarchy levels for comparison
export const ROLE_HIERARCHY = {
  viewer: 1,
  staff: 2,
  supervisor: 3,
  buyer: 4,
  inventoryManager: 5,
  manager: 6,
  admin: 7,
  owner: 8
} as const

// Role permission matrix for quick lookups
export const ROLE_PERMISSIONS = {
  owner: {
    inventory: ['read', 'write', 'delete', 'count', 'adjust', 'transfer', 'approve_transfer', 'par_levels'],
    products: ['read', 'write', 'delete', 'categories', 'suppliers', 'pricing', 'import'],
    orders: ['read', 'write', 'delete', 'send', 'receive', 'approve', 'suggestions'],
    suppliers: ['read', 'write', 'delete', 'catalog', 'pricing', 'negotiate'],
    recipes: ['read', 'write', 'delete', 'costing', 'pos_mapping'],
    analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export', 'financial'],
    users: ['read', 'write', 'delete', 'roles', 'permissions', 'invite'],
    admin: ['settings', 'integrations', 'locations', 'audit_logs', 'alerts', 'billing'],
    locations: ['all']
  },
  admin: {
    inventory: ['read', 'write', 'delete', 'count', 'adjust', 'transfer', 'approve_transfer', 'par_levels'],
    products: ['read', 'write', 'delete', 'categories', 'suppliers', 'pricing', 'import'],
    orders: ['read', 'write', 'delete', 'send', 'receive', 'approve', 'suggestions'],
    suppliers: ['read', 'write', 'delete', 'catalog', 'pricing', 'negotiate'],
    recipes: ['read', 'write', 'delete', 'costing', 'pos_mapping'],
    analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export', 'financial'],
    users: ['read', 'write', 'delete', 'roles', 'permissions', 'invite'],
    admin: ['settings', 'integrations', 'locations', 'audit_logs', 'alerts'],
    locations: ['all']
  },
  manager: {
    inventory: ['read', 'write', 'count', 'adjust', 'transfer', 'approve_transfer', 'par_levels'],
    products: ['read', 'write', 'categories', 'suppliers', 'pricing'],
    orders: ['read', 'write', 'send', 'receive', 'approve', 'suggestions'],
    suppliers: ['read', 'write', 'catalog', 'pricing'],
    recipes: ['read', 'write', 'costing', 'pos_mapping'],
    analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export'],
    users: ['read', 'write', 'invite'],
    admin: ['locations', 'alerts'],
    locations: ['all']
  },
  inventoryManager: {
    inventory: ['read', 'write', 'count', 'adjust', 'transfer', 'par_levels'],
    products: ['read', 'write', 'categories', 'suppliers', 'pricing'],
    orders: ['read', 'write', 'suggestions'],
    suppliers: ['read', 'catalog'],
    recipes: ['read', 'costing'],
    analytics: ['inventory', 'variance', 'export'],
    users: ['read'],
    admin: ['alerts'],
    locations: ['assigned_only']
  },
  buyer: {
    inventory: ['read', 'count'],
    products: ['read', 'suppliers', 'pricing'],
    orders: ['read', 'write', 'delete', 'send', 'receive', 'suggestions'],
    suppliers: ['read', 'write', 'catalog', 'pricing', 'negotiate'],
    recipes: ['read', 'costing'],
    analytics: ['purchasing', 'costing', 'export'],
    users: ['read'],
    locations: ['all']
  },
  supervisor: {
    inventory: ['read', 'count', 'adjust', 'transfer'],
    products: ['read'],
    orders: ['read', 'write'],
    suppliers: ['read'],
    recipes: ['read'],
    analytics: ['inventory'],
    users: ['read', 'write'],
    locations: ['assigned_only']
  },
  staff: {
    inventory: ['read', 'count', 'transfer'],
    products: ['read'],
    orders: ['read'],
    suppliers: ['read'],
    recipes: ['read'],
    analytics: ['inventory'],
    users: ['read'],
    locations: ['assigned_only']
  },
  viewer: {
    inventory: ['read'],
    products: ['read'],
    orders: ['read'],
    suppliers: ['read'],
    recipes: ['read'],
    analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export'],
    users: ['read'],
    locations: ['assigned_only']
  }
} as const

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: HappyBarRole,
  resource: string,
  action: string
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false
  
  const resourcePerms = rolePerms[resource as keyof typeof rolePerms]
  if (!resourcePerms) return false
  
  return (resourcePerms as readonly string[]).includes(action)
}

/**
 * Check if user has at least the minimum role level
 */
export function hasMinimumRoleLevel(userRole: HappyBarRole, minimumRole: HappyBarRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Check if manager role can manage target role
 */
export function canManageRole(managerRole: HappyBarRole, targetRole: HappyBarRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: HappyBarRole): string[] {
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return []
  
  const permissions: string[] = []
  
  Object.entries(rolePerms).forEach(([resource, actions]) => {
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        permissions.push(`${resource}.${action}`)
      })
    }
  })
  
  return permissions
}

/**
 * Check location access based on role and user assignments
 */
export async function checkLocationAccess(
  role: HappyBarRole,
  locationId: string,
  organizationId: string,
  userId: string,
  prisma: PrismaClient,
  requiredPermission: 'read' | 'write' | 'manage' = 'read'
): Promise<boolean> {
  try {
    // First verify the location exists in the organization
    const location = await prisma.location.findFirst({
      where: { id: locationId, organizationId }
    })
    
    if (!location) {
      return false
    }

    // Owner, Admin, Manager, and Buyer can access all locations with full permissions
    if (['owner', 'admin', 'manager', 'buyer'].includes(role)) {
      return true
    }

    // For other roles, check user-location assignments
    const assignment = await prisma.userLocationAssignment.findFirst({
      where: { 
        userId,
        locationId,
        organizationId,
        isActive: true
      }
    })

    if (!assignment) {
      return false
    }

    // Check the required permission level
    switch (requiredPermission) {
      case 'manage':
        return assignment.canManage
      case 'write':
        return assignment.canWrite || assignment.canManage
      case 'read':
        return assignment.canRead || assignment.canWrite || assignment.canManage
      default:
        return false
    }
  } catch (error) {
    console.error('Location access check error:', error)
    return false
  }
}

/**
 * Filter data based on location access
 */
export async function getAccessibleLocationIds(
  role: HappyBarRole,
  organizationId: string,
  userId: string,
  prisma: PrismaClient,
  requiredPermission: 'read' | 'write' | 'manage' = 'read'
): Promise<string[]> {
  try {
    // Owner, Admin, Manager, and Buyer can access all locations
    if (['owner', 'admin', 'manager', 'buyer'].includes(role)) {
      const locations = await prisma.location.findMany({
        where: { organizationId, isActive: true },
        select: { id: true }
      })
      return locations.map(l => l.id)
    }

    // For other roles, get assigned locations based on permission level
    const whereClause: any = {
      userId,
      organizationId,
      isActive: true,
      location: {
        isActive: true
      }
    }

    // Add permission-specific filtering
    switch (requiredPermission) {
      case 'manage':
        whereClause.canManage = true
        break
      case 'write':
        whereClause.OR = [
          { canWrite: true },
          { canManage: true }
        ]
        break
      case 'read':
        whereClause.OR = [
          { canRead: true },
          { canWrite: true },
          { canManage: true }
        ]
        break
    }

    const assignments = await prisma.userLocationAssignment.findMany({
      where: whereClause,
      select: { locationId: true }
    })

    return assignments.map(a => a.locationId)
  } catch (error) {
    console.error('Get accessible locations error:', error)
    return []
  }
}

/**
 * Check if user can approve based on role and amount
 */
export function canApproveOrder(
  role: HappyBarRole,
  orderAmount: number,
  approvalLimits?: Record<string, number>
): boolean {
  // Owner and Admin can approve any amount
  if (['owner', 'admin'].includes(role)) {
    return true
  }

  // Manager has high approval limit
  if (role === 'manager') {
    const managerLimit = approvalLimits?.manager ?? 10000 // Default $10,000 limit
    return orderAmount <= managerLimit
  }

  // Inventory Manager has medium approval limit
  if (role === 'inventoryManager') {
    const inventoryManagerLimit = approvalLimits?.inventoryManager ?? 5000 // Default $5,000 limit
    return orderAmount <= inventoryManagerLimit
  }

  // Buyer has medium approval limit
  if (role === 'buyer') {
    const buyerLimit = approvalLimits?.buyer ?? 5000 // Default $5,000 limit
    return orderAmount <= buyerLimit
  }

  // Supervisor has low approval limit
  if (role === 'supervisor') {
    const supervisorLimit = approvalLimits?.supervisor ?? 1000 // Default $1,000 limit
    return orderAmount <= supervisorLimit
  }

  // Staff and Viewer cannot approve orders
  return false
}

/**
 * Get next approver role for escalation
 */
export function getNextApproverRole(currentRole: HappyBarRole): HappyBarRole | null {
  const escalationMap: Record<HappyBarRole, HappyBarRole | null> = {
    staff: 'supervisor',
    supervisor: 'manager',
    buyer: 'manager',
    inventoryManager: 'manager',
    manager: 'admin',
    admin: 'owner',
    owner: null, // Owner is the highest level
    viewer: null // Viewer cannot initiate approvals
  }

  return escalationMap[currentRole]
}

/**
 * Check if user can perform bulk operations
 */
export function canPerformBulkOperations(role: HappyBarRole): boolean {
  // Only higher-level roles can perform bulk operations
  return hasMinimumRoleLevel(role, 'supervisor')
}

/**
 * Check if user can access financial data
 */
export function canAccessFinancialData(role: HappyBarRole): boolean {
  return ['owner', 'admin', 'manager'].includes(role)
}

/**
 * Check if user can export sensitive data
 */
export function canExportSensitiveData(role: HappyBarRole): boolean {
  return ['owner', 'admin', 'manager', 'inventoryManager', 'buyer'].includes(role)
}

/**
 * Check if user can manage integrations
 */
export function canManageIntegrations(role: HappyBarRole): boolean {
  return ['owner', 'admin'].includes(role)
}

/**
 * Get role display information
 */
export function getRoleDisplayInfo(role: HappyBarRole) {
  const roleInfo = {
    owner: { title: 'Owner', level: 'Executive', color: 'purple' },
    admin: { title: 'Administrator', level: 'Executive', color: 'red' },
    manager: { title: 'Manager', level: 'Management', color: 'blue' },
    inventoryManager: { title: 'Inventory Manager', level: 'Management', color: 'green' },
    buyer: { title: 'Buyer', level: 'Specialist', color: 'orange' },
    supervisor: { title: 'Supervisor', level: 'Supervisor', color: 'yellow' },
    staff: { title: 'Staff', level: 'Staff', color: 'gray' },
    viewer: { title: 'Viewer', level: 'Read-Only', color: 'slate' }
  }

  return roleInfo[role] || { title: role, level: 'Unknown', color: 'gray' }
}

/**
 * Validate role assignment
 * Ensures that only appropriate roles can assign/change other roles
 */
export function canAssignRole(
  assignerRole: HappyBarRole,
  targetRole: HappyBarRole,
  isNewUser: boolean = false
): boolean {
  // Owner can assign any role
  if (assignerRole === 'owner') {
    return true
  }

  // Admin can assign all roles except owner
  if (assignerRole === 'admin') {
    return targetRole !== 'owner'
  }

  // Manager can assign lower-level roles
  if (assignerRole === 'manager') {
    return hasMinimumRoleLevel(assignerRole, targetRole) && targetRole !== 'admin' && targetRole !== 'owner'
  }

  // Other roles cannot assign roles
  return false
}