'use client'

import { useAuth } from '@/lib/auth/auth-context'
import type { HappyBarRole } from '@happy-bar/types'
import {
  type ForwardRefExoticComponent,
  type RefAttributes,
  useMemo,
} from 'react'

/**
 * Role permission matrix - matches backend RBAC system
 */
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

/**
 * Role hierarchy for comparison
 */
const ROLE_HIERARCHY = {
  viewer: 1,
  staff: 2,
  supervisor: 3,
  buyer: 4,
  inventoryManager: 5,
  manager: 6,
  admin: 7,
  owner: 8,
} as const

/**
 * Check if a role has a specific permission
 */
function roleHasPermission(
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
function hasMinimumRoleLevel(
  userRole: HappyBarRole,
  minimumRole: HappyBarRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Permission checking hook
 */
export function usePermissions() {
  const { user } = useAuth()

  const permissions = useMemo(() => {
    if (!user?.role) {
      return {
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        hasMinimumRole: () => false,
        canManageRole: () => false,
        role: null,
        isOwner: false,
        isAdmin: false,
        isManager: false,
        isInventoryManager: false,
      }
    }

    const role = user.role

    return {
      /**
       * Check if user has a specific permission
       */
      hasPermission: (resource: string, action: string): boolean => {
        return roleHasPermission(role, resource, action)
      },

      /**
       * Check if user has any of the specified permissions
       */
      hasAnyPermission: (permissions: string[]): boolean => {
        return permissions.some((permission) => {
          const [resource, action] = permission.split('.')
          return roleHasPermission(role, resource!, action!)
        })
      },

      /**
       * Check if user has all of the specified permissions
       */
      hasAllPermissions: (permissions: string[]): boolean => {
        return permissions.every((permission) => {
          const [resource, action] = permission.split('.')
          return roleHasPermission(role, resource!, action!)
        })
      },

      /**
       * Check if user has at least the specified role level
       */
      hasMinimumRole: (minimumRole: HappyBarRole): boolean => {
        return hasMinimumRoleLevel(role, minimumRole)
      },

      /**
       * Check if user can manage another role
       */
      canManageRole: (targetRole: HappyBarRole): boolean => {
        return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[targetRole]
      },

      role,
      isOwner: role === 'owner',
      isAdmin: role === 'admin' || role === 'owner',
      isManager: ['manager', 'admin', 'owner'].includes(role),
      isInventoryManager: [
        'inventoryManager',
        'manager',
        'admin',
        'owner',
      ].includes(role),
    }
  }, [user?.role])

  return permissions
}

/**
 * Shorthand hooks for common permission checks
 */
export function useCanRead(resource: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(resource, 'read')
}

export function useCanWrite(resource: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(resource, 'write')
}

export function useCanDelete(resource: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(resource, 'delete')
}

export function useCanManage(resource: string) {
  const { hasAnyPermission } = usePermissions()
  return hasAnyPermission([
    `${resource}.write`,
    `${resource}.delete`,
    `admin.${resource}`,
  ])
}

/**
 * Financial data access check
 */
export function useCanAccessFinancials() {
  const { isManager } = usePermissions()
  return isManager
}

/**
 * Settings access check
 */
export function useCanAccessSettings() {
  const { hasPermission } = usePermissions()
  return hasPermission('admin', 'settings')
}

/**
 * User management access check
 */
export function useCanManageUsers() {
  const { hasPermission } = usePermissions()
  return hasPermission('users', 'write')
}

/**
 * Navigation visibility hook
 * Provides boolean flags for whether user can access each navigation item
 */
export function useNavigationVisibility() {
  const { user } = useAuth()

  return {
    canAccessDashboard: true, // Dashboard is always accessible
    canAccessInventory: user?.role
      ? roleHasPermission(user.role, 'inventory', 'read')
      : false,
    canAccessProducts: user?.role
      ? roleHasPermission(user.role, 'products', 'read')
      : false,
    canAccessOrders: user?.role
      ? roleHasPermission(user.role, 'orders', 'read')
      : false,
    canAccessSuppliers: user?.role
      ? roleHasPermission(user.role, 'suppliers', 'read')
      : false,
    canAccessRecipes: user?.role
      ? roleHasPermission(user.role, 'recipes', 'read')
      : false,
    canAccessAnalytics: user?.role
      ? roleHasPermission(user.role, 'analytics', 'inventory') ||
        roleHasPermission(user.role, 'analytics', 'purchasing')
      : false,
    canAccessForecasting: user?.role
      ? roleHasPermission(user.role, 'analytics', 'inventory') ||
        roleHasPermission(user.role, 'analytics', 'purchasing')
      : false,
    canAccessSettings: user?.role
      ? roleHasPermission(user.role, 'admin', 'settings') ||
        roleHasPermission(user.role, 'admin', 'locations')
      : false,
  }
}

import { canAccessNavigation } from '../utils/permissions'
/**
 * Get filtered navigation items based on user permissions
 */
export function useFilteredNavigation(
  navigationItems: Array<{
    name: string
    href: string
    icon: ForwardRefExoticComponent<
      Record<string, unknown> & RefAttributes<SVGSVGElement>
    >
    badge?: boolean
    hasAccess?: boolean
  }>
) {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user?.role) {
      // If no user role, show only dashboard
      return navigationItems.filter((item) => item.href === '/dashboard')
    }

    // Import navigation permission checking

    return navigationItems.filter((item) =>
      canAccessNavigation(item.href, user.role)
    )
  }, [user?.role, navigationItems])
}
