import { createAccessControl } from "better-auth/plugins/access";

/**
 * Happy Bar specific permission statements
 * Using 'as const' for proper TypeScript inference
 * 
 * Each key represents a resource (feature area) and the array contains
 * the allowed actions on that resource.
 */
const happyBarStatements = {
  // Inventory Management
  inventory: [
    "read",           // View inventory data
    "write",          // Create/update inventory items  
    "delete",         // Remove inventory items
    "count",          // Perform physical counts
    "adjust",         // Make adjustments
    "transfer",       // Initiate transfers
    "approve_transfer", // Approve transfers
    "par_levels"      // Manage par levels
  ],
  
  // Product Management  
  products: [
    "read",           // View products
    "write",          // Create/update products
    "delete",         // Remove products
    "categories",     // Manage categories
    "suppliers",      // Manage product-supplier relationships
    "pricing",        // View/edit pricing
    "import"          // Import products from external sources
  ],
  
  // Order Management
  orders: [
    "read",           // View orders
    "write",          // Create/update orders
    "delete",         // Cancel orders
    "send",           // Send orders to suppliers
    "receive",        // Mark orders as received
    "approve",        // Approve orders (workflow)
    "suggestions"     // Access reorder suggestions
  ],
  
  // Supplier Management
  suppliers: [
    "read",           // View suppliers
    "write",          // Create/update suppliers
    "delete",         // Remove suppliers
    "catalog",        // Manage supplier catalogs
    "pricing",        // View/edit supplier pricing
    "negotiate"       // Access to supplier negotiations/contracts
  ],
  
  // Recipe Management
  recipes: [
    "read",           // View recipes
    "write",          // Create/update recipes
    "delete",         // Remove recipes
    "costing",        // Access recipe costing
    "pos_mapping"     // Manage POS mappings
  ],
  
  // Analytics & Reporting
  analytics: [
    "inventory",      // Inventory reports
    "purchasing",     // Purchase reports
    "costing",        // Cost analysis
    "variance",       // Variance analysis
    "export",         // Export data
    "financial"       // Financial reporting
  ],
  
  // User Management
  users: [
    "read",           // View users
    "write",          // Create/update users
    "delete",         // Remove users
    "roles",          // Assign roles
    "permissions",    // Manage permissions
    "invite"          // Invite new users
  ],
  
  // Administration
  admin: [
    "settings",       // Organization settings
    "integrations",   // Manage integrations (POS, webhooks)
    "locations",      // Manage locations
    "audit_logs",     // Access audit logs
    "alerts",         // Configure alert rules
    "billing"         // Access billing/subscription management
  ],
  
  // Location-based permissions (for multi-location support)
  locations: [
    "all",            // Access all locations
    "assigned_only",  // Only assigned locations
  ],

  // Organization Management (for Better Auth organization plugin)
  organization: [
    "read",           // View organization details
    "write",          // Update organization
    "delete",         // Delete organization
    "invite",         // Invite members
    "remove_member",  // Remove members
    "manage_roles"    // Manage member roles
  ]
} as const;

// Create the access controller with our permission statements
export const ac = createAccessControl(happyBarStatements);

// Export the statements type for use in other files
export type HappyBarStatements = typeof happyBarStatements;

// Helper type for getting all possible permissions
export type Permission = {
  [K in keyof HappyBarStatements]: `${K}.${HappyBarStatements[K][number]}`
}[keyof HappyBarStatements];

// Helper function to create permission strings
export const createPermission = <T extends keyof HappyBarStatements>(
  resource: T, 
  action: HappyBarStatements[T][number]
): `${T}.${HappyBarStatements[T][number]}` => {
  return `${resource}.${action}` as const;
};

// Common permission groups for easier management
export const PERMISSION_GROUPS = {
  FULL_INVENTORY: [
    createPermission('inventory', 'read'),
    createPermission('inventory', 'write'),
    createPermission('inventory', 'delete'),
    createPermission('inventory', 'count'),
    createPermission('inventory', 'adjust'),
    createPermission('inventory', 'transfer'),
    createPermission('inventory', 'approve_transfer'),
    createPermission('inventory', 'par_levels')
  ],
  
  FULL_PRODUCTS: [
    createPermission('products', 'read'),
    createPermission('products', 'write'),
    createPermission('products', 'delete'),
    createPermission('products', 'categories'),
    createPermission('products', 'suppliers'),
    createPermission('products', 'pricing'),
    createPermission('products', 'import')
  ],
  
  FULL_ORDERS: [
    createPermission('orders', 'read'),
    createPermission('orders', 'write'),
    createPermission('orders', 'delete'),
    createPermission('orders', 'send'),
    createPermission('orders', 'receive'),
    createPermission('orders', 'approve'),
    createPermission('orders', 'suggestions')
  ],
  
  BASIC_ANALYTICS: [
    createPermission('analytics', 'inventory'),
    createPermission('analytics', 'purchasing'),
    createPermission('analytics', 'costing')
  ],
  
  ADVANCED_ANALYTICS: [
    createPermission('analytics', 'inventory'),
    createPermission('analytics', 'purchasing'),
    createPermission('analytics', 'costing'),
    createPermission('analytics', 'variance'),
    createPermission('analytics', 'export'),
    createPermission('analytics', 'financial')
  ]
} as const;