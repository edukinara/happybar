'use client'

import { subscriptionApi } from '@/lib/api/subscription'
import { useAuth } from '@/lib/auth/auth-context'
import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for checking feature access that works for all users
 * Uses the /check endpoint which handles organization owner's subscription
 */
export function useFeatureCheck(
  featureId: string,
  requiredBalance: number = 1
) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setHasAccess(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    subscriptionApi
      .checkFeature({ featureId, requiredBalance })
      .then((result) => {
        if (!cancelled) {
          setHasAccess(result?.access?.allowed || false)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Feature check failed:', err)
          setHasAccess(false)
          setError(err?.message || 'Failed to check feature access')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [user, featureId, requiredBalance])

  const trackUsage = useCallback(
    async (value: number = 1, track: boolean = true) => {
      try {
        await subscriptionApi.trackUsage({
          featureId,
          value,
          track,
        })
      } catch (err) {
        console.error('Failed to track usage:', err)
      }
    },
    [featureId]
  )

  return {
    hasAccess,
    loading,
    error,
    trackUsage,
  }
}

/**
 * Convenience hooks for specific features
 */
export function useProductsFeatureCheck(requiredBalance: number = 1) {
  return useFeatureCheck('products', requiredBalance)
}

export function useLocationsFeatureCheck(requiredBalance: number = 1) {
  return useFeatureCheck('locations', requiredBalance)
}

export function usePOSIntegrationsFeatureCheck(requiredBalance: number = 1) {
  return useFeatureCheck('pos_integrations', requiredBalance)
}

export function useTeamMembersFeatureCheck(requiredBalance: number = 1) {
  return useFeatureCheck('team_members', requiredBalance)
}
