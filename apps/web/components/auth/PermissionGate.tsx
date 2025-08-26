'use client'

import { usePermissions } from '@/lib/hooks/use-permissions'
import type { HappyBarRole } from '@happy-bar/types'
import type { ReactNode } from 'react'

interface PermissionGateProps {
  children: ReactNode
  fallback?: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  resource?: string
  action?: string
  role?: HappyBarRole
  minimumRole?: HappyBarRole
  invertLogic?: boolean
}

/**
 * Permission-based component wrapper
 * Renders children only if user has required permissions
 */
export function PermissionGate({
  children,
  fallback = null,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  role,
  minimumRole,
  invertLogic = false,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMinimumRole,
    role: userRole,
  } = usePermissions()

  let hasAccess = false

  // Check single permission string (e.g., "inventory.read")
  if (permission) {
    const [res, act] = permission.split('.')
    hasAccess = hasPermission(res!, act!)
  }
  // Check multiple permissions
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }
  // Check resource.action
  else if (resource && action) {
    hasAccess = hasPermission(resource, action)
  }
  // Check exact role match
  else if (role) {
    hasAccess = userRole === role
  }
  // Check minimum role level
  else if (minimumRole) {
    hasAccess = hasMinimumRole(minimumRole)
  }
  // Default to no access if no criteria specified
  else {
    hasAccess = false
  }

  // Invert logic if specified (useful for "hide if has permission" scenarios)
  if (invertLogic) {
    hasAccess = !hasAccess
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Shorthand components for common permission checks
 */

interface ResourcePermissionProps {
  children: ReactNode
  fallback?: ReactNode
  resource: string
}

export function CanRead({
  children,
  fallback,
  resource,
}: ResourcePermissionProps) {
  return (
    <PermissionGate resource={resource} action='read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function CanWrite({
  children,
  fallback,
  resource,
}: ResourcePermissionProps) {
  return (
    <PermissionGate resource={resource} action='write' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function CanDelete({
  children,
  fallback,
  resource,
}: ResourcePermissionProps) {
  return (
    <PermissionGate resource={resource} action='delete' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

interface RoleGateProps {
  children: ReactNode
  fallback?: ReactNode
  role?: HappyBarRole
  minimumRole?: HappyBarRole
}

export function AdminOnly({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate minimumRole='admin' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function ManagerOnly({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate minimumRole='manager' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function SupervisorPlus({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate minimumRole='supervisor' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Financial data access gate
 */
export function FinancialDataOnly({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate minimumRole='manager' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Settings access gate
 */
export function SettingsOnly({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='admin.settings' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Analytics access gate
 */
export function AnalyticsAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate
      permissions={[
        'analytics.inventory',
        'analytics.purchasing',
        'analytics.variance',
      ]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Navigation-specific permission gates for UI components
 */
export function InventoryAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='inventory.read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function ProductsAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='products.read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function OrdersAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='orders.read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function SuppliersAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='suppliers.read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function RecipesAccess({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='recipes.read' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * User management gates
 */
export function CanInviteUsers({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='users.invite' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function CanManageLocations({
  children,
  fallback,
}: Omit<RoleGateProps, 'role' | 'minimumRole'>) {
  return (
    <PermissionGate permission='admin.locations' fallback={fallback}>
      {children}
    </PermissionGate>
  )
}
