import { toast } from 'sonner'

export interface APIError {
  success: false
  error: string
  code: string
  context?: {
    userRole?: string
    requiredPermission?: string
    resource?: string
    action?: string
    timestamp?: string
  }
}

export interface PermissionError extends APIError {
  code: 'FORBIDDEN'
  context: {
    userRole: string
    requiredPermission: string
    resource: string
    action: string
    timestamp: string
  }
}

export interface AxiosPermissionError {
  response: {
    status: number
    data: PermissionError
  }
  config?: any
}

/**
 * Check if an error is a permission-related error
 */
export function isPermissionError(error: any): error is AxiosPermissionError {
  return (
    error?.response?.status === 403 &&
    error?.response?.data?.code === 'FORBIDDEN' &&
    error?.response?.data?.context?.requiredPermission
  )
}

/**
 * Check if an error is an authentication error
 */
export function isAuthenticationError(error: any): boolean {
  return error?.response?.status === 401
}

/**
 * Get a user-friendly error message from an API error
 */
export function getErrorMessage(error: any): string {
  // Handle permission errors with enhanced messaging
  if (isPermissionError(error)) {
    const { userRole, resource, action } = error.response.data.context
    const readableResource = resource.replace(/_/g, ' ')
    const readableAction = action.replace(/_/g, ' ')

    return `Access denied: You need permission to ${readableAction} ${readableResource}. Your current role '${userRole}' does not have sufficient privileges. Contact your administrator to request additional permissions.`
  }

  // Handle authentication errors
  if (isAuthenticationError(error)) {
    return 'Your session has expired. Please log in again.'
  }

  // Handle other API errors
  if (error?.response?.data?.error) {
    return error.response.data.error
  }

  // Handle network errors
  if (
    error?.code === 'NETWORK_ERROR' ||
    error?.message?.includes('Network Error')
  ) {
    return 'Network error. Please check your internet connection and try again.'
  }

  // Handle timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.'
  }

  // Generic fallback
  return error?.message || 'An unexpected error occurred. Please try again.'
}

/**
 * Show a toast notification for an error
 */
export function showErrorToast(error: any, customMessage?: string) {
  const message = customMessage || getErrorMessage(error)

  if (isPermissionError(error)) {
    toast.error(message, {
      description: `Required permission: ${error.response.data.context.requiredPermission}`,
      duration: 6000, // Longer duration for permission errors
    })
  } else if (isAuthenticationError(error)) {
    toast.error(message, {
      description: 'Redirecting to login...',
      duration: 3000,
    })
  } else {
    toast.error(message)
  }
}

/**
 * Enhanced error handling for async operations
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<[T | null, any]> {
  try {
    const result = await operation()
    return [result, null]
  } catch (error) {
    console.error('Async operation failed:', error)
    showErrorToast(error, errorMessage)
    return [null, error]
  }
}

/**
 * Role hierarchy for checking if user has sufficient privileges
 */
const ROLE_HIERARCHY = [
  'viewer',
  'staff',
  'supervisor',
  'buyer',
  'inventoryManager',
  'manager',
  'admin',
  'owner',
] as const

export type HappyBarRole = (typeof ROLE_HIERARCHY)[number]

/**
 * Check if a role meets the minimum required role level
 */
export function hasMinimumRole(
  userRole: HappyBarRole,
  requiredRole: HappyBarRole
): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole)
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)
  return userLevel >= requiredLevel
}

/**
 * Get a suggestion for what role would be needed for a permission
 */
export function getSuggestedRole(
  requiredPermission: string
): HappyBarRole | null {
  // Map common permissions to suggested roles
  const permissionRoleMap: Record<string, HappyBarRole> = {
    'admin.settings': 'admin',
    'admin.audit_logs': 'admin',
    'admin.users': 'admin',
    'users.write': 'admin',
    'users.delete': 'admin',
    'inventory.write': 'inventoryManager',
    'inventory.delete': 'manager',
    'inventory.approve_transfer': 'manager',
    'products.write': 'inventoryManager',
    'products.delete': 'manager',
    'analytics.inventory': 'manager',
    'analytics.purchasing': 'manager',
    'analytics.variance': 'manager',
    'orders.write': 'buyer',
    'orders.approve': 'manager',
    'suppliers.write': 'buyer',
  }

  return permissionRoleMap[requiredPermission] || null
}

/**
 * Create an enhanced error message with role suggestions
 */
export function createEnhancedErrorMessage(error: any): string {
  if (!isPermissionError(error)) {
    return getErrorMessage(error)
  }

  const { userRole, requiredPermission } = error.response.data.context
  const suggestedRole = getSuggestedRole(requiredPermission)

  let message = getErrorMessage(error)

  if (
    suggestedRole &&
    !hasMinimumRole(userRole as HappyBarRole, suggestedRole)
  ) {
    message += ` Consider requesting '${suggestedRole}' role or higher.`
  }

  return message
}
