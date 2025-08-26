'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import {
  useFeatureCheck,
  useProductsFeatureCheck,
} from '@/lib/hooks/useFeatureCheck'
import { Crown, Lock, Zap } from 'lucide-react'
import { useState } from 'react'
import { PricingModal } from './PricingModal'

interface FeatureGateProps {
  featureId: 'products' | 'locations' | 'pos_integrations' | 'team_members'
  featureName: string
  requiredPlan?: string
  requiredBalance?: number
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({
  featureId,
  featureName,
  requiredPlan = 'Pro',
  requiredBalance = 1,
  children,
  fallback,
}: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureCheck(featureId, requiredBalance)
  const { user } = useAuth()
  const [showPricingModal, setShowPricingModal] = useState(false)

  if (loading) {
    return (
      <div className='p-2 border rounded-lg bg-muted'>
        <div className='animate-pulse'>Checking access...</div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Check if user can handle billing operations
  const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)

  // Default upgrade prompt - now opens modal instead of redirecting
  const handleUpgrade = () => {
    setShowPricingModal(true)
  }

  return (
    <Card className='border-dashed border-2'>
      <CardHeader className='text-center'>
        <div className='mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
          <Lock className='h-6 w-6 text-primary' />
        </div>
        <CardTitle className='flex items-center gap-2 justify-center'>
          {featureName}
          <Badge variant='secondary'>
            <Crown className='h-3 w-3 mr-1' />
            {requiredPlan} Feature
          </Badge>
        </CardTitle>
        <CardDescription>
          {`Upgrade to ${requiredPlan} to access this feature and unlock your bar&apos;s
          full potential`}
        </CardDescription>
      </CardHeader>
      <CardContent className='text-center'>
        <Button onClick={handleUpgrade} className='w-full'>
          <Zap className='h-4 w-4 mr-2' />
          {hasBillingAccess ? `Upgrade to ${requiredPlan}` : 'View Pricing'}
        </Button>
        <p className='text-xs text-muted-foreground mt-2'>
          {hasBillingAccess
            ? '14-day free trial • Cancel anytime'
            : 'Contact your organization admin to upgrade'}
        </p>
      </CardContent>
      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        featureName={featureName}
        requiredPlan={requiredPlan}
      />
    </Card>
  )
}

// Specific feature gates using the new system
export function ProductsGate({
  children,
  fallback,
  requiredBalance = 1,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredBalance?: number
}) {
  return (
    <FeatureGate
      featureId='products'
      featureName='Products'
      requiredPlan='Pro'
      requiredBalance={requiredBalance}
      fallback={fallback}
    >
      {children}
    </FeatureGate>
  )
}

export function LocationsGate({
  children,
  fallback,
  requiredBalance = 1,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredBalance?: number
}) {
  return (
    <FeatureGate
      featureId='locations'
      featureName='Additional Locations'
      requiredPlan='Pro'
      requiredBalance={requiredBalance}
      fallback={fallback}
    >
      {children}
    </FeatureGate>
  )
}

export function POSIntegrationsGate({
  children,
  fallback,
  requiredBalance = 1,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredBalance?: number
}) {
  return (
    <FeatureGate
      featureId='pos_integrations'
      featureName='POS Integrations'
      requiredPlan='Pro'
      requiredBalance={requiredBalance}
      fallback={fallback}
    >
      {children}
    </FeatureGate>
  )
}

export function TeamMembersGate({
  children,
  fallback,
  requiredBalance = 1,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredBalance?: number
}) {
  return (
    <FeatureGate
      featureId='team_members'
      featureName='Team Members'
      requiredPlan='Pro'
      requiredBalance={requiredBalance}
      fallback={fallback}
    >
      {children}
    </FeatureGate>
  )
}

// Product limit gate with current count checking
export function ProductLimitGate({
  currentCount,
  children,
}: {
  currentCount: number
  children: React.ReactNode
}) {
  const { hasAccess, loading } = useProductsFeatureCheck(currentCount + 1)
  const { user } = useAuth()
  const [showPricingModal, setShowPricingModal] = useState(false)

  const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)

  if (loading) {
    return <div className='animate-pulse'>Checking limits...</div>
  }

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <Card className='border-dashed border-2'>
      <CardHeader className='text-center'>
        <div className='mx-auto w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4'>
          <Lock className='h-6 w-6 text-orange-600' />
        </div>
        <CardTitle>Product Limit Reached</CardTitle>
        <CardDescription>
          You&apos;ve reached your plan&apos;s product limit. Upgrade to add
          more products.
        </CardDescription>
      </CardHeader>
      <CardContent className='text-center'>
        <Button onClick={() => setShowPricingModal(true)} className='w-full'>
          <Crown className='h-4 w-4 mr-2' />
          {hasBillingAccess ? 'Upgrade Plan' : 'View Pricing'}
        </Button>
        {!hasBillingAccess && (
          <p className='text-xs text-muted-foreground mt-2'>
            Contact your organization admin to upgrade
          </p>
        )}
      </CardContent>
      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        featureName='Products'
        requiredPlan='Pro'
      />
    </Card>
  )
}

// Usage display component
export function FeatureUsageBadge({
  featureId,
}: {
  featureId: 'products' | 'locations' | 'pos_integrations' | 'team_members'
}) {
  const { featureSummary, loading } = useAutumnFeatures()

  if (loading || !featureSummary) {
    return <Badge variant='outline'>Loading...</Badge>
  }

  const featureData =
    featureSummary[
      featureId === 'pos_integrations'
        ? 'posIntegrations'
        : featureId === 'team_members'
          ? 'teamMembers'
          : featureId
    ]

  if (!featureData) {
    return <Badge variant='outline'>N/A</Badge>
  }

  const { used, limit, unlimited } = featureData

  if (unlimited) {
    return <Badge variant='default'>{used} / ∞</Badge>
  }

  const limitNumber =
    typeof limit === 'number' ? limit : parseInt(limit.toString())
  const isNearLimit = used >= limitNumber * 0.8
  const isAtLimit = used >= limitNumber

  return (
    <Badge
      variant={
        isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'default'
      }
    >
      {used} / {limit}
    </Badge>
  )
}
