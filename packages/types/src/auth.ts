/**
 * Shared authentication types for Happy Bar application
 * These types can be imported across packages for consistency
 */

// Role definitions matching our RBAC system
export type HappyBarRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'inventoryManager'
  | 'buyer'
  | 'supervisor'
  | 'staff'
  | 'viewer'

// Permission resource types
export type PermissionResource =
  | 'inventory'
  | 'products'
  | 'orders'
  | 'suppliers'
  | 'recipes'
  | 'analytics'
  | 'users'
  | 'admin'
  | 'locations'

// Permission actions for each resource
export interface PermissionActions {
  inventory: [
    'read',
    'write',
    'delete',
    'count',
    'adjust',
    'transfer',
    'approve_transfer',
    'par_levels',
  ]
  products: [
    'read',
    'write',
    'delete',
    'categories',
    'suppliers',
    'pricing',
    'import',
  ]
  orders: [
    'read',
    'write',
    'delete',
    'send',
    'receive',
    'approve',
    'suggestions',
  ]
  suppliers: ['read', 'write', 'delete', 'catalog', 'pricing', 'negotiate']
  recipes: ['read', 'write', 'delete', 'costing', 'pos_mapping']
  analytics: [
    'inventory',
    'purchasing',
    'costing',
    'variance',
    'export',
    'financial',
  ]
  users: ['read', 'write', 'delete', 'roles', 'permissions', 'invite']
  admin: [
    'settings',
    'integrations',
    'locations',
    'audit_logs',
    'alerts',
    'billing',
  ]
  locations: ['all', 'assigned_only', 'specific_zones']
}

// Helper type for creating permission strings
export type PermissionString<T extends PermissionResource> =
  T extends keyof PermissionActions
    ? `${T}.${PermissionActions[T][number]}`
    : never

// All possible permission strings
export type Permission = PermissionString<PermissionResource>
export type Perm = {
  locationId: string
  locationName: string
  canRead: boolean
  canWrite: boolean
  canManage: boolean
}

// Role hierarchy levels
export interface RoleHierarchy {
  viewer: 1
  staff: 2
  supervisor: 3
  buyer: 4
  inventoryManager: 5
  manager: 6
  admin: 7
  owner: 8
}

// Role metadata for UI display
export interface RoleMetadata {
  title: string
  description: string
  level:
    | 'Executive'
    | 'Management'
    | 'Specialist'
    | 'Supervisor'
    | 'Staff'
    | 'Read-Only'
}

// User with role information
export interface UserWithRole {
  id: string
  email: string
  name: string
  image?: string
  role: HappyBarRole
  organizationId: string | null
  permissions?: Perm[]
}

export interface Me {
  user: BasicUser
  activeOrganizationId: string
  member: BasicMember
  locationAssignments: LocationAssignment[]
}

export interface LocationAssignment {
  id: string
  locationId: string
  locationName: string
  canRead: boolean
  canWrite: boolean
  canManage: boolean
}
export interface BasicUser {
  id: string
  email: string
  name: string
  image?: string
}

export interface BasicMember {
  role: string
  organizationId: string
  organization: BasicOrg
}

export interface BasicOrg {
  id: string
  name: string
  slug: string
  logo: string | null
  metadata: Metadata
  createdAt: string
  updatedAt: string
}

export interface Metadata {
  plan: string
  settings: Record<string, unknown>
  createdBy: string
}

// Organization member with extended information
export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: HappyBarRole
  createdAt: Date
  user: {
    id: string
    email: string
    name: string
    image?: string
  }
}

// Location assignment for users
export interface UserLocationAssignment {
  userId: string
  locationId: string
  organizationId: string
  location: {
    id: string
    name: string
    code?: string
  }
}

// Permission check context
export interface PermissionContext {
  userId: string
  organizationId: string
  role: HappyBarRole
  locationIds?: string[]
}

// Common permission check functions type
export interface PermissionChecker {
  hasPermission: (resource: PermissionResource, action: string) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccessLocation: (locationId: string) => boolean
  canManageRole: (targetRole: HappyBarRole) => boolean
}

// Authentication state
export interface AuthState {
  user: UserWithRole | null
  session: {
    id: string
    activeOrganizationId: string
  } | null
  organization: {
    id: string
    name: string
    slug: string
  } | null
  isLoading: boolean
  permissions: PermissionChecker | null
}

// Invitation data
export interface OrganizationInvitation {
  id: string
  organizationId: string
  email: string
  role: HappyBarRole
  invitedBy: string
  expiresAt: Date
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
}

// Role change audit log
export interface RoleChangeLog {
  id: string
  userId: string
  organizationId: string
  previousRole: HappyBarRole
  newRole: HappyBarRole
  changedBy: string
  reason?: string
  createdAt: Date
}
