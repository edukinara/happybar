import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'

// Define our custom permissions/resources
const statement = {
  ...defaultStatements, // Include Better Auth's default organization permissions
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
  locations: ['all', 'assigned_only'],
} as const

// Create access controller
const ac = createAccessControl(statement)

// Re-export ac for use in other files
export { ac }

/**
 * Happy Bar Role Definitions
 *
 * Each role is defined with specific permissions that align with
 * typical restaurant/bar operational hierarchy and responsibilities.
 */

// OWNER - Business owner with complete system control
export const owner = ac.newRole({
  ...ownerAc.statements, // Include Better Auth's default owner permissions
  // Full access to all features
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
})

// ADMIN - Organization administrator (IT/Operations Director)
export const admin = ac.newRole({
  ...adminAc.statements, // Include Better Auth's default admin permissions
  // Full operational access except billing
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
})

// MANAGER - General Manager/Assistant Manager
export const manager = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Full operational management with user oversight
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
  users: ['read', 'write', 'invite'], // Can manage staff but not other managers
  admin: ['locations', 'alerts'],
  locations: ['all'],
})

// INVENTORY_MANAGER - Inventory Specialist/Warehouse Manager
export const inventoryManager = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Specialized inventory control with limited order management
  inventory: ['read', 'write', 'count', 'adjust', 'transfer', 'par_levels'],
  products: ['read', 'write', 'categories', 'suppliers', 'pricing'],
  orders: ['read', 'write', 'suggestions'], // Can create orders but may need approval
  suppliers: ['read', 'catalog'],
  recipes: ['read', 'costing'],
  analytics: ['inventory', 'variance', 'export'],
  users: ['read'],
  admin: ['alerts'],
  locations: ['assigned_only'],
})

// BUYER - Purchasing Agent/Procurement Specialist
export const buyer = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Specialized purchasing with supplier relationship management
  inventory: ['read', 'count'],
  products: ['read', 'suppliers', 'pricing'],
  orders: ['read', 'write', 'delete', 'send', 'receive', 'suggestions'],
  suppliers: ['read', 'write', 'catalog', 'pricing', 'negotiate'],
  recipes: ['read', 'costing'],
  analytics: ['purchasing', 'costing', 'export'],
  users: ['read'],
  locations: ['all'], // Buyers may need to see all locations for ordering
})

// SUPERVISOR - Shift Supervisor/Team Lead
export const supervisor = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Day-to-day operational oversight with limited administrative access
  inventory: ['read', 'count', 'adjust', 'transfer'],
  products: ['read'],
  orders: ['read', 'write'], // Can create draft orders
  suppliers: ['read'],
  recipes: ['read'],
  analytics: ['inventory'],
  users: ['read', 'write'], // Can manage basic staff
  locations: ['assigned_only'],
})

// STAFF - General Staff/Line Employees
export const staff = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Basic operational access for daily tasks
  inventory: ['read', 'count', 'transfer'],
  products: ['read'],
  orders: ['read'],
  suppliers: ['read'],
  recipes: ['read'],
  analytics: ['inventory'], // Only their own activity reports
  users: ['read'],
  locations: ['assigned_only'],
})

// MEMBER - General Staff/Line Employees
export const member = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Basic operational access for daily tasks
  inventory: ['read', 'count', 'transfer'],
  products: ['read'],
  orders: ['read'],
  suppliers: ['read'],
  recipes: ['read'],
  analytics: ['inventory'], // Only their own activity reports
  users: ['read'],
  locations: ['assigned_only'],
})

// VIEWER - Read-only Access (Accountants, Analysts, External Consultants)
export const viewer = ac.newRole({
  ...memberAc.statements, // Include Better Auth's default member permissions as base
  // Read-only access for reporting and analysis
  inventory: ['read'],
  products: ['read'],
  orders: ['read'],
  suppliers: ['read'],
  recipes: ['read'],
  analytics: ['inventory', 'purchasing', 'costing', 'variance', 'export'],
  users: ['read'],
  locations: ['assigned_only'],
})

// Export all roles for easy reference
export const roles = {
  owner,
  admin,
  member,
  manager,
  inventoryManager, // camelCase for Better Auth
  inventory_manager: inventoryManager, // snake_case for backward compatibility
  buyer,
  supervisor,
  staff,
  viewer,
} as const

// Role hierarchy for determining access levels (higher number = more access)
export const ROLE_HIERARCHY = {
  viewer: 1,
  staff: 2,
  member: 2, // Same level as staff
  supervisor: 3,
  buyer: 4,
  inventoryManager: 5,
  manager: 6,
  admin: 7,
  owner: 8,
} as const

// Helper function to check if a role can manage another role
export const canManageRole = (
  managerRole: keyof typeof ROLE_HIERARCHY,
  targetRole: keyof typeof ROLE_HIERARCHY
): boolean => {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole]
}

// Role descriptions for UI display
export const ROLE_DESCRIPTIONS = {
  owner: {
    title: 'Owner',
    description:
      'Business owner with complete system control and billing access',
    level: 'Executive',
  },
  admin: {
    title: 'Administrator',
    description:
      'IT administrator or operations director with full operational access',
    level: 'Executive',
  },
  member: {
    title: 'Member',
    description: 'Basic organization member with limited access',
    level: 'Staff',
  },
  manager: {
    title: 'Manager',
    description:
      'General manager or assistant manager with operational oversight',
    level: 'Management',
  },
  inventoryManager: {
    title: 'Inventory Manager',
    description:
      'Inventory specialist with full inventory control and limited ordering',
    level: 'Management',
  },
  buyer: {
    title: 'Buyer',
    description: 'Purchasing agent with supplier relationship management',
    level: 'Specialist',
  },
  supervisor: {
    title: 'Supervisor',
    description:
      'Shift supervisor or team lead with day-to-day operational oversight',
    level: 'Supervisor',
  },
  staff: {
    title: 'Staff',
    description: 'General staff with basic operational access for daily tasks',
    level: 'Staff',
  },
  viewer: {
    title: 'Viewer',
    description:
      'Read-only access for reporting and analysis (accountants, consultants)',
    level: 'Read-Only',
  },
} as const

// Default role assignments for new users (can be customized per organization)
export const DEFAULT_ROLE = 'staff'

// Role-based feature access for quick checks
export const ROLE_FEATURES = {
  owner: {
    canAccessBilling: true,
    canManageIntegrations: true,
    canDeleteOrganization: true,
    canTransferOwnership: true,
  },
  admin: {
    canAccessBilling: false,
    canManageIntegrations: true,
    canDeleteOrganization: false,
    canTransferOwnership: false,
  },
  manager: {
    canApproveHighValueOrders: true,
    canManageStaff: true,
    canAccessFinancialReports: true,
  },
  inventoryManager: {
    canPerformInventoryAdjustments: true,
    canManageParLevels: true,
    canInitiateTransfers: true,
  },
  buyer: {
    canNegotiateWithSuppliers: true,
    canManageSupplierCatalogs: true,
    canCreatePurchaseOrders: true,
  },
} as const
