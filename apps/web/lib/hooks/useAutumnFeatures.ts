'use client'

import { subscriptionApi } from '@/lib/api/subscription'
import { useAuth } from '@/lib/auth/auth-context'
import { useSession } from '@/lib/auth/client'
import type { AutumnCustomerData, AutumnFeatures } from '@happy-bar/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

// Hook to access Autumn features from Better Auth session
export function useAutumnFeatures() {
  const { data: session, isPending } = useSession()
  const { user } = useAuth()
  const [customerData, setCustomerData] = useState<AutumnCustomerData | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  // Only fetch customer data for owners/admins who have billing access
  useEffect(() => {
    // Check if user has billing access (owner or admin role)
    const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)
    
    if (session && !isPending && hasBillingAccess) {
      setLoading(true)
      subscriptionApi
        .getCustomer()
        .then(setCustomerData)
        .catch((error) => {
          // Only log error if it's not a 403 (expected for non-billing users)
          if (!error?.response || error.response.status !== 403) {
            console.error('Failed to fetch customer data:', error)
          }
          setCustomerData(null)
        })
        .finally(() => setLoading(false))
    } else if (!session || !hasBillingAccess) {
      // Clear customer data if no session or no billing access
      setCustomerData(null)
    }
  }, [session, isPending, user?.role])

  const features: AutumnFeatures | null = customerData?.features || null

  const hasFeatureAccess = useCallback(
    (featureId: keyof AutumnFeatures, requiredBalance: number = 1): boolean => {
      // For non-billing users, we should use the check endpoint
      // This will check against the organization owner's subscription
      if (!features) {
        // TODO: We could make an async call to /check endpoint here
        // For now, return false if no features loaded
        return false
      }

      const feature = features[featureId]
      if (!feature) return false

      // If unlimited, always has access
      if (feature.unlimited) return true

      // Check if balance meets requirement
      return feature.balance >= requiredBalance
    },
    [features]
  )

  const getFeatureBalance = useCallback(
    (featureId: keyof AutumnFeatures): number => {
      if (!features) return 0
      const feature = features[featureId]
      return feature?.balance || 0
    },
    [features]
  )

  const getFeatureUsage = useCallback(
    (featureId: keyof AutumnFeatures): number => {
      if (!features) return 0
      const feature = features[featureId]
      return feature?.usage || 0
    },
    [features]
  )

  const isFeatureUnlimited = useCallback(
    (featureId: keyof AutumnFeatures): boolean => {
      if (!features) return false
      const feature = features[featureId]
      return feature?.unlimited || false
    },
    [features]
  )

  // Track usage for a feature (still needs to go to server)
  const trackUsage = useCallback(
    async (featureId: string, value: number = 1, track: boolean = true) => {
      try {
        await subscriptionApi.trackUsage({
          featureId,
          value,
          track,
        })
      } catch (error) {
        console.error('Failed to track usage:', error)
      }
    },
    []
  )

  // open Stripe Customer Billing Portal
  const openBillingPortal = async () => {
    if (!session?.user) {
      throw new Error('Authentication required')
    }

    // Check if user has billing access
    const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)
    if (!hasBillingAccess) {
      throw new Error('Billing access restricted to organization owners and administrators')
    }

    try {
      const url = await subscriptionApi.getBillingPortal({
        returnUrl: `${window.location.origin}/dashboard/account`,
      })
      window.open(url, '_blank')
    } catch (err) {
      console.error('Failed to open billing portal:', err)
      throw err
    }
  }

  const createCheckout = async (productId: string, successUrl?: string) => {
    if (!session?.user) {
      throw new Error('Authentication required')
    }

    // Check if user has billing access
    const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)
    if (!hasBillingAccess) {
      throw new Error('Checkout access restricted to organization owners and administrators')
    }

    try {
      const checkout = await subscriptionApi.createCheckout({
        productId,
        successUrl:
          successUrl || `${window.location.origin}/dashboard?upgraded=true`,
      })

      if (checkout?.url) {
        window.location.href = checkout.url
      } else if (checkout?.success) {
        // Payment was successful (card on file)
        window.location.href = successUrl || '/dashboard?upgraded=true'
        // Session will be refreshed automatically
      }
    } catch (err) {
      console.error('Failed to create checkout:', err)
      throw err
    }
  }

  // Get customer data
  const customer = customerData || null

  // Feature summary for dashboard/components
  const featureSummary = useMemo(() => {
    if (!features) return null

    return {
      products: {
        used: features.products.usage,
        limit: features.products.unlimited
          ? '∞'
          : features.products.included_usage,
        available: features.products.balance,
        unlimited: features.products.unlimited,
      },
      locations: {
        used: features.locations.usage,
        limit: features.locations.unlimited
          ? '∞'
          : features.locations.included_usage,
        available: features.locations.balance,
        unlimited: features.locations.unlimited,
      },
      posIntegrations: {
        used: features.pos_integrations.usage,
        limit: features.pos_integrations.unlimited
          ? '∞'
          : features.pos_integrations.included_usage,
        available: features.pos_integrations.balance,
        unlimited: features.pos_integrations.unlimited,
      },
      teamMembers: {
        used: features.team_members.usage,
        limit: features.team_members.unlimited
          ? '∞'
          : features.team_members.included_usage,
        available: features.team_members.balance,
        unlimited: features.team_members.unlimited,
      },
    }
  }, [features])

  return {
    features,
    customer,
    openBillingPortal,
    createCheckout,
    featureSummary,
    loading: isPending || loading,
    hasFeatureAccess,
    getFeatureBalance,
    getFeatureUsage,
    isFeatureUnlimited,
    trackUsage,
    // Legacy compatibility
    hasAccess: hasFeatureAccess,
    checkFeature: hasFeatureAccess,
  }
}

// Simplified feature access hook for individual features
export function useFeatureAccess(
  featureId: keyof AutumnFeatures,
  requiredBalance: number = 1
) {
  const { user } = useAuth()
  const {
    hasFeatureAccess,
    getFeatureBalance,
    getFeatureUsage,
    isFeatureUnlimited,
    loading,
    trackUsage,
  } = useAutumnFeatures()
  
  const [checkingAccess, setCheckingAccess] = useState(false)
  const [accessResult, setAccessResult] = useState<boolean | null>(null)

  // For non-billing users, use the check endpoint
  useEffect(() => {
    const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)
    
    // If user doesn't have billing access and we don't have features data,
    // use the check endpoint to verify access
    if (user && !hasBillingAccess && !getFeatureBalance(featureId)) {
      setCheckingAccess(true)
      subscriptionApi
        .checkFeature({ featureId, requiredBalance })
        .then((result) => {
          setAccessResult(result?.access?.allowed || false)
        })
        .catch(() => {
          setAccessResult(false)
        })
        .finally(() => {
          setCheckingAccess(false)
        })
    }
  }, [user, featureId, requiredBalance, getFeatureBalance])

  // For billing users, use the cached features data
  const hasAccess = user?.role && ['owner', 'admin'].includes(user.role)
    ? hasFeatureAccess(featureId, requiredBalance)
    : (accessResult ?? false)
    
  const balance = getFeatureBalance(featureId)
  const usage = getFeatureUsage(featureId)
  const unlimited = isFeatureUnlimited(featureId)

  return {
    hasAccess,
    loading: loading || checkingAccess,
    balance,
    usage,
    unlimited,
    trackUsage: (value?: number, track?: boolean) =>
      trackUsage(featureId, value, track),
  }
}

// Convenience hooks for specific features
export function useProductsAccess(requiredBalance: number = 1) {
  return useFeatureAccess('products', requiredBalance)
}

export function useLocationsAccess(requiredBalance: number = 1) {
  return useFeatureAccess('locations', requiredBalance)
}

export function usePOSIntegrationsAccess(requiredBalance: number = 1) {
  return useFeatureAccess('pos_integrations', requiredBalance)
}

export function useTeamMembersAccess(requiredBalance: number = 1) {
  return useFeatureAccess('team_members', requiredBalance)
}
