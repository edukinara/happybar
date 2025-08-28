/**
 * Utility functions for handling permissions and roles in the frontend
 */

import type { HappyBarRole } from '@happy-bar/types'

/**
 * Get role display information for UI components
 */
export function getRoleDisplayInfo(role: HappyBarRole) {
  const roleInfo = {
    owner: {
      title: 'Owner',
      level: 'Executive',
      color: 'purple',
      description: 'Full system access',
    },
    admin: {
      title: 'Administrator',
      level: 'Executive',
      color: 'red',
      description: 'System administration',
    },
    manager: {
      title: 'Manager',
      level: 'Management',
      color: 'blue',
      description: 'Location and team management',
    },
    inventoryManager: {
      title: 'Inventory Manager',
      level: 'Management',
      color: 'green',
      description: 'Inventory operations',
    },
    inventory_manager: {
      title: 'Inventory Manager',
      level: 'Management',
      color: 'green',
      description: 'Inventory operations',
    }, // Support snake_case
    buyer: {
      title: 'Buyer',
      level: 'Specialist',
      color: 'orange',
      description: 'Purchasing and procurement',
    },
    supervisor: {
      title: 'Supervisor',
      level: 'Supervisor',
      color: 'yellow',
      description: 'Daily operations oversight',
    },
    staff: {
      title: 'Staff',
      level: 'Staff',
      color: 'gray',
      description: 'Standard user access',
    },
    viewer: {
      title: 'Viewer',
      level: 'Read-Only',
      color: 'slate',
      description: 'Read-only access',
    },
  }

  return (
    roleInfo[role] || {
      title: role,
      level: 'Unknown',
      color: 'gray',
      description: 'Unknown role',
    }
  )
}

/**
 * Check if a role has location-based access restrictions
 */
export function isLocationRestrictedRole(role: HappyBarRole): boolean {
  return [
    'inventoryManager',
    'inventory_manager',
    'supervisor',
    'staff',
    'viewer',
  ].includes(role)
}

/**
 * Check if a role has full access to all locations
 */
export function hasFullLocationAccess(role: HappyBarRole): boolean {
  return ['owner', 'admin', 'manager', 'buyer'].includes(role)
}

/**
 * Get the role hierarchy level (higher numbers = more privileges)
 */
export function getRoleLevel(role: HappyBarRole): number {
  const hierarchy = {
    viewer: 1,
    staff: 2,
    supervisor: 3,
    buyer: 4,
    inventoryManager: 5,
    inventory_manager: 5, // Support both formats
    manager: 6,
    admin: 7,
    owner: 8,
  }

  return hierarchy[role] || 0
}

/**
 * Check if one role can manage another role
 */
export function canManageRole(
  managerRole: HappyBarRole,
  targetRole: HappyBarRole
): boolean {
  return getRoleLevel(managerRole) > getRoleLevel(targetRole)
}

/**
 * Get permission string for a resource and action
 */
export function getPermissionString(resource: string, action: string): string {
  return `${resource}.${action}`
}

/**
 * Parse a permission string into resource and action
 */
export function parsePermissionString(
  permission: string
): { resource: string; action: string } | null {
  const parts = permission.split('.')
  if (parts.length !== 2) return null

  return {
    resource: parts[0]!,
    action: parts[1]!,
  }
}

/**
 * Navigation items with their required permissions
 */
export const NAVIGATION_PERMISSIONS = {
  '/dashboard': [], // Dashboard is always accessible to authenticated users
  '/dashboard/inventory': ['inventory.read'],
  '/dashboard/products': ['products.read'],
  '/dashboard/recipes': ['recipes.read'],
  '/dashboard/orders': ['orders.read'],
  '/dashboard/suppliers': ['suppliers.read'],
  '/dashboard/analytics': ['analytics.inventory', 'analytics.purchasing'],
  '/dashboard/forecasting': ['analytics.inventory', 'analytics.purchasing'],
  '/dashboard/settings': ['admin.settings', 'admin.locations', 'users.read'], // Any settings-related permission
} as const

/**
 * Check if user should see a navigation item
 */
export function canAccessNavigation(
  path: string,
  userRole: HappyBarRole
): boolean {
  const requiredPermissions =
    NAVIGATION_PERMISSIONS[path as keyof typeof NAVIGATION_PERMISSIONS]

  // If no permissions required, everyone can access
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true
  }

  // Import role permissions from hook file (we'll need to move this to shared location)
  const ROLE_PERMISSIONS = {
    owner: {
      inventory: [
        'read',
        'write',
        'delete',
        'count',
        'adjust',
        'transfer',
        'approve_transfer',
        'par_levels',
      ],
      products: [
        'read',
        'write',
        'delete',
        'categories',
        'suppliers',
        'pricing',
        'import',
      ],
      orders: [
        'read',
        'write',
        'delete',
        'send',
        'receive',
        'approve',
        'suggestions',
      ],
      suppliers: ['read', 'write', 'delete', 'catalog', 'pricing', 'negotiate'],
      recipes: ['read', 'write', 'delete', 'costing', 'pos_mapping'],
      analytics: [
        'inventory',
        'purchasing',
        'costing',
        'variance',
        'export',
        'financial',
      ],
      users: ['read', 'write', 'delete', 'roles', 'permissions', 'invite'],
      admin: [
        'settings',
        'integrations',
        'locations',
        'audit_logs',
        'alerts',
        'billing',
      ],
      locations: ['all'],
    },
    admin: {
      inventory: [
        'read',
        'write',
        'delete',
        'count',
        'adjust',
        'transfer',
        'approve_transfer',
        'par_levels',
      ],
      products: [
        'read',
        'write',
        'delete',
        'categories',
        'suppliers',
        'pricing',
        'import',
      ],
      orders: [
        'read',
        'write',
        'delete',
        'send',
        'receive',
        'approve',
        'suggestions',
      ],
      suppliers: ['read', 'write', 'delete', 'catalog', 'pricing', 'negotiate'],
      recipes: ['read', 'write', 'delete', 'costing', 'pos_mapping'],
      analytics: [
        'inventory',
        'purchasing',
        'costing',
        'variance',
        'export',
        'financial',
      ],
      users: ['read', 'write', 'delete', 'roles', 'permissions', 'invite'],
      admin: ['settings', 'integrations', 'locations', 'audit_logs', 'alerts'],
      locations: ['all'],
    },
    manager: {
      inventory: [
        'read',
        'write',
        'count',
        'adjust',
        'transfer',
        'approve_transfer',
        'par_levels',
      ],
      products: ['read', 'write', 'categories', 'suppliers', 'pricing'],
      orders: ['read', 'write', 'send', 'receive', 'approve', 'suggestions'],
      suppliers: ['read', 'write', 'catalog', 'pricing'],
      recipes: ['read', 'write', 'costing', 'pos_mapping'],
      analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export'],
      users: ['read', 'write', 'invite'],
      admin: ['locations', 'alerts'],
      locations: ['all'],
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
      locations: ['assigned_only'],
    },
    inventory_manager: {
      inventory: ['read', 'write', 'count', 'adjust', 'transfer', 'par_levels'],
      products: ['read', 'write', 'categories', 'suppliers', 'pricing'],
      orders: ['read', 'write', 'suggestions'],
      suppliers: ['read', 'catalog'],
      recipes: ['read', 'costing'],
      analytics: ['inventory', 'variance', 'export'],
      users: ['read'],
      admin: ['alerts'],
      locations: ['assigned_only'],
    },
    buyer: {
      inventory: ['read', 'count'],
      products: ['read', 'suppliers', 'pricing'],
      orders: ['read', 'write', 'delete', 'send', 'receive', 'suggestions'],
      suppliers: ['read', 'write', 'catalog', 'pricing', 'negotiate'],
      recipes: ['read', 'costing'],
      analytics: ['purchasing', 'costing', 'export'],
      users: ['read'],
      locations: ['all'],
    },
    supervisor: {
      inventory: ['read', 'count', 'adjust', 'transfer'],
      products: ['read'],
      orders: ['read', 'write'],
      suppliers: ['read'],
      recipes: ['read'],
      analytics: ['inventory'],
      users: ['read', 'write'],
      locations: ['assigned_only'],
    },
    staff: {
      inventory: ['read', 'count', 'transfer'],
      products: ['read'],
      orders: ['read'],
      suppliers: ['read'],
      recipes: ['read'],
      analytics: ['inventory'],
      users: ['read'],
      locations: ['assigned_only'],
    },
    viewer: {
      inventory: ['read'],
      products: ['read'],
      orders: ['read'],
      suppliers: ['read'],
      recipes: ['read'],
      analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export'],
      users: ['read'],
      locations: ['assigned_only'],
    },
  } as const

  // Check if user has at least one of the required permissions
  return requiredPermissions.some((permission) => {
    const [resource, action] = permission.split('.')
    const rolePerms = ROLE_PERMISSIONS[userRole]
    if (!rolePerms) return false

    const resourcePerms = rolePerms[resource as keyof typeof rolePerms]
    if (!resourcePerms) return false

    return (resourcePerms as readonly string[]).includes(action!)
  })
}
