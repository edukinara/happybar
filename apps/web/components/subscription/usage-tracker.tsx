'use client'

import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import { useCallback, useEffect } from 'react'

/**
 * Simplified usage tracker that leverages Autumn session data
 * Only tracks usage to server - reads current state from session
 */

interface UseUsageTrackerProps {
  featureId: 'products' | 'locations' | 'pos_integrations' | 'team_members'
  autoRefresh?: boolean
}

export function useUsageTracker({
  featureId,
  autoRefresh: _ = true,
}: UseUsageTrackerProps) {
  const {
    getFeatureUsage,
    getFeatureBalance,
    isFeatureUnlimited,
    trackUsage: trackFeatureUsage,
    loading,
  } = useAutumnFeatures()

  const currentUsage = getFeatureUsage(featureId)
  const currentBalance = getFeatureBalance(featureId)
  const isUnlimited = isFeatureUnlimited(featureId)

  // Track an increment (e.g., creating a new product)
  const trackIncrement = useCallback(
    async (value: number = 1) => {
      try {
        await trackFeatureUsage(featureId, value, true)
        // Session will be updated automatically by Better Auth
      } catch (error) {
        console.warn(`Failed to track ${featureId} increment:`, error)
        throw error
      }
    },
    [featureId, trackFeatureUsage]
  )

  // Track a decrement (e.g., deleting a product)
  const trackDecrement = useCallback(
    async (value: number = 1) => {
      try {
        await trackFeatureUsage(featureId, -value, true)
        // Session will be updated automatically by Better Auth
      } catch (error) {
        console.warn(`Failed to track ${featureId} decrement:`, error)
        throw error
      }
    },
    [featureId, trackFeatureUsage]
  )

  // Set absolute usage count (e.g., for bulk operations)
  const setUsage = useCallback(
    async (absoluteValue: number) => {
      try {
        await trackFeatureUsage(featureId, absoluteValue, false) // track=false means set absolute
        // Session will be updated automatically by Better Auth
      } catch (error) {
        console.warn(`Failed to set ${featureId} usage:`, error)
        throw error
      }
    },
    [featureId, trackFeatureUsage]
  )

  // Check if user can perform an action (has sufficient balance)
  const canPerformAction = useCallback(
    (requiredBalance: number = 1): boolean => {
      if (isUnlimited) return true
      return currentBalance >= requiredBalance
    },
    [currentBalance, isUnlimited]
  )

  // Get usage percentage (0-100, or null if unlimited)
  const usagePercentage = useCallback((): number | null => {
    if (isUnlimited) return null

    // We need to get the included usage to calculate percentage
    // For now, we'll calculate based on usage vs balance
    const totalAllowed = currentUsage + currentBalance
    if (totalAllowed === 0) return 0

    return (currentUsage / totalAllowed) * 100
  }, [currentUsage, currentBalance, isUnlimited])

  return {
    // Current state (from session)
    currentUsage,
    currentBalance,
    isUnlimited,
    loading,

    // Actions
    trackIncrement,
    trackDecrement,
    setUsage,

    // Utilities
    canPerformAction,
    usagePercentage: usagePercentage(),

    // Feature status
    isNearLimit: !isUnlimited && currentBalance <= 2,
    isAtLimit: !isUnlimited && currentBalance <= 0,
  }
}

// Convenience hooks for specific features
export function useProductUsageTracker() {
  return useUsageTracker({ featureId: 'products' })
}

export function useLocationUsageTracker() {
  return useUsageTracker({ featureId: 'locations' })
}

export function usePOSIntegrationUsageTracker() {
  return useUsageTracker({ featureId: 'pos_integrations' })
}

export function useTeamMemberUsageTracker() {
  return useUsageTracker({ featureId: 'team_members' })
}

// Component for displaying usage status
export function UsageStatus({
  featureId,
  showProgress = true,
}: {
  featureId: 'products' | 'locations' | 'pos_integrations' | 'team_members'
  showProgress?: boolean
}) {
  const {
    currentUsage,
    currentBalance,
    isUnlimited,
    usagePercentage,
    isNearLimit,
    isAtLimit,
    loading,
  } = useUsageTracker({ featureId })

  if (loading) {
    return <span className='text-sm text-muted-foreground'>Loading...</span>
  }

  const displayName = {
    products: 'Products',
    locations: 'Locations',
    pos_integrations: 'POS Integrations',
    team_members: 'Team Members',
  }[featureId]

  if (isUnlimited) {
    return (
      <div className='text-sm'>
        <span className='font-medium'>{displayName}:</span>{' '}
        <span className='text-green-600'>{currentUsage} (Unlimited)</span>
      </div>
    )
  }

  const statusColor = isAtLimit
    ? 'text-red-600'
    : isNearLimit
      ? 'text-yellow-600'
      : 'text-green-600'
  const total = currentUsage + currentBalance

  return (
    <div className='text-sm'>
      <span className='font-medium'>{displayName}:</span>{' '}
      <span className={statusColor}>
        {currentUsage} / {total}
      </span>
      {showProgress && usagePercentage !== null && (
        <div className='mt-1'>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full ${
                isAtLimit
                  ? 'bg-red-500'
                  : isNearLimit
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component to track usage on mount (for page views, etc.)
export function UsageTracker({
  featureId,
  action = 'increment',
  value = 1,
  children,
}: {
  featureId: 'products' | 'locations' | 'pos_integrations' | 'team_members'
  action?: 'increment' | 'decrement' | 'set'
  value?: number
  children?: React.ReactNode
}) {
  const { trackIncrement, trackDecrement, setUsage } = useUsageTracker({
    featureId,
  })

  useEffect(() => {
    const trackAction = async () => {
      try {
        switch (action) {
          case 'increment':
            await trackIncrement(value)
            break
          case 'decrement':
            await trackDecrement(value)
            break
          case 'set':
            await setUsage(value)
            break
        }
      } catch (_error) {
        // Error already logged in the tracker
      }
    }

    trackAction()
  }, [featureId, action, value, trackIncrement, trackDecrement, setUsage])

  return <>{children}</>
}
