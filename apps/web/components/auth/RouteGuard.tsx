'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { usePermissions } from '@/lib/hooks/use-permissions'
import type { HappyBarRole } from '@happy-bar/types'
import { AlertTriangle, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface RouteGuardProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  resource?: string
  action?: string
  role?: HappyBarRole
  minimumRole?: HappyBarRole
  redirectTo?: string
  showFallback?: boolean
  fallbackTitle?: string
  fallbackDescription?: string
}

/**
 * Fallback component shown when user doesn't have permission
 */
function PermissionDeniedFallback({
  title = 'Access Restricted',
  description = 'You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.',
}) {
  const router = useRouter()
  const { user, logout } = useAuth()

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
            <Lock className='w-6 h-6 text-red-600 dark:text-red-400' />
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            {title}
          </CardTitle>
          <CardDescription className='text-gray-600 dark:text-gray-400'>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800'>
            <div className='flex items-start space-x-2'>
              <AlertTriangle className='w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
              <div className='text-sm'>
                <p className='font-medium text-amber-800 dark:text-amber-200'>
                  Current Role: {user?.role || 'Unknown'}
                </p>
                <p className='text-amber-700 dark:text-amber-300'>
                  Contact your administrator to request additional permissions.
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <Button
              onClick={() => router.push('/dashboard')}
              className='w-full'
              variant='default'
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => logout()}
              className='w-full'
              variant='outline'
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Loading component
 */
function AuthLoadingFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
        <p className='text-gray-600 dark:text-gray-400'>
          Checking permissions...
        </p>
      </div>
    </div>
  )
}

/**
 * Route Guard component
 * Protects entire pages/routes based on permissions
 */
export function RouteGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  role,
  minimumRole,
  redirectTo,
  showFallback = true,
  fallbackTitle,
  fallbackDescription,
}: RouteGuardProps) {
  const { user, loading } = useAuth()
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMinimumRole,
    role: userRole,
  } = usePermissions()
  const router = useRouter()

  // Show loading while auth is being determined
  if (loading) {
    return <AuthLoadingFallback />
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return <AuthLoadingFallback />
  }

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
  // Default to allowing access if no criteria specified
  else {
    hasAccess = true
  }

  // Handle access denied
  if (!hasAccess) {
    if (redirectTo) {
      router.push(redirectTo)
      return <AuthLoadingFallback />
    }

    if (showFallback) {
      return (
        <PermissionDeniedFallback
          title={fallbackTitle}
          description={fallbackDescription}
        />
      )
    }

    // Return null if no fallback should be shown
    return null
  }

  // Render children if access is granted
  return <>{children}</>
}

/**
 * Shorthand route guards for common scenarios
 */

interface CommonRouteGuardProps {
  children: ReactNode
  redirectTo?: string
  showFallback?: boolean
}

export function AdminRoute({
  children,
  redirectTo,
  showFallback = true,
}: CommonRouteGuardProps) {
  return (
    <RouteGuard
      minimumRole='admin'
      redirectTo={redirectTo}
      showFallback={showFallback}
      fallbackTitle='Admin Access Required'
      fallbackDescription='This page requires administrator privileges.'
    >
      {children}
    </RouteGuard>
  )
}

export function ManagerRoute({
  children,
  redirectTo,
  showFallback = true,
}: CommonRouteGuardProps) {
  return (
    <RouteGuard
      minimumRole='manager'
      redirectTo={redirectTo}
      showFallback={showFallback}
      fallbackTitle='Manager Access Required'
      fallbackDescription='This page requires manager level access or higher.'
    >
      {children}
    </RouteGuard>
  )
}

export function InventoryManagerRoute({
  children,
  redirectTo,
  showFallback = true,
}: CommonRouteGuardProps) {
  return (
    <RouteGuard
      minimumRole='inventoryManager'
      redirectTo={redirectTo}
      showFallback={showFallback}
      fallbackTitle='Inventory Manager Access Required'
      fallbackDescription='This page requires inventory management privileges.'
    >
      {children}
    </RouteGuard>
  )
}

export function SettingsRoute({
  children,
  redirectTo,
  showFallback = true,
}: CommonRouteGuardProps) {
  return (
    <RouteGuard
      permission='admin.settings'
      redirectTo={redirectTo}
      showFallback={showFallback}
      fallbackTitle='Settings Access Restricted'
      fallbackDescription='You need administrative privileges to access system settings.'
    >
      {children}
    </RouteGuard>
  )
}

export function FinancialRoute({
  children,
  redirectTo,
  showFallback = true,
}: CommonRouteGuardProps) {
  return (
    <RouteGuard
      minimumRole='manager'
      redirectTo={redirectTo}
      showFallback={showFallback}
      fallbackTitle='Financial Data Access Restricted'
      fallbackDescription='Financial information is restricted to management level users.'
    >
      {children}
    </RouteGuard>
  )
}
