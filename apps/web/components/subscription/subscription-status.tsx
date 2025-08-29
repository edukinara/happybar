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
import { Progress } from '@/components/ui/progress'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import {
  BarChart3,
  Crown,
  ExternalLink,
  MapPin,
  Package,
  Smartphone,
  Users,
} from 'lucide-react'

export function SubscriptionStatus() {
  const { featureSummary, customer, loading } = useAutumnFeatures()
  const { openBillingPortal } = useAutumnFeatures()

  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='animate-pulse'>Loading subscription data...</div>
        </CardContent>
      </Card>
    )
  }

  if (!featureSummary || !customer) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-muted-foreground'>
            No subscription data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get primary product for plan name
  const primaryProduct =
    customer.products?.find((p) => p.is_default) || customer.products?.[0]
  const planName = primaryProduct?.name || 'Free'

  return (
    <div className='space-y-6'>
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Crown className='size-5' />
                Current Plan
              </CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            <Badge variant='default' className='text-sm'>
              {planName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground mb-1'>Customer ID</p>
              <p className='font-mono text-xs'>{customer.id}</p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={openBillingPortal}
              className='flex items-center gap-2'
            >
              <ExternalLink className='size-4' />
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <BarChart3 className='size-5' />
            Feature Usage
          </CardTitle>
          <CardDescription>
            Track your current usage against plan limits
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Products */}
          <FeatureUsageCard
            icon={<Package className='size-4' />}
            name='Products'
            used={featureSummary.products.used}
            limit={featureSummary.products.limit}
            unlimited={featureSummary.products.unlimited}
            description='Inventory items you can track'
          />

          {/* Locations */}
          <FeatureUsageCard
            icon={<MapPin className='size-4' />}
            name='Locations'
            used={featureSummary.locations.used}
            limit={featureSummary.locations.limit}
            unlimited={featureSummary.locations.unlimited}
            description='Storage locations for inventory'
          />

          {/* POS Integrations */}
          <FeatureUsageCard
            icon={<Smartphone className='size-4' />}
            name='POS Integrations'
            used={featureSummary.posIntegrations.used}
            limit={featureSummary.posIntegrations.limit}
            unlimited={featureSummary.posIntegrations.unlimited}
            description='Connected point-of-sale systems'
          />

          {/* Team Members */}
          <FeatureUsageCard
            icon={<Users className='size-4' />}
            name='Team Members'
            used={featureSummary.teamMembers.used}
            limit={featureSummary.teamMembers.limit}
            unlimited={featureSummary.teamMembers.unlimited}
            description='Staff members with access'
          />
        </CardContent>
      </Card>
    </div>
  )
}

interface FeatureUsageCardProps {
  icon: React.ReactNode
  name: string
  used: number
  limit: string | number
  unlimited: boolean
  description: string
}

function FeatureUsageCard({
  icon,
  name,
  used,
  limit,
  unlimited,
  description,
}: FeatureUsageCardProps) {
  // Calculate percentage for progress bar
  const percentage = unlimited ? 0 : (used / (limit as number)) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3 flex-1'>
        <div className='p-2 bg-muted rounded-lg'>{icon}</div>
        <div className='flex-1'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='font-medium'>{name}</h4>
            <Badge
              variant={
                isAtLimit
                  ? 'destructive'
                  : isNearLimit
                    ? 'secondary'
                    : 'default'
              }
              className='text-xs'
            >
              {used} / {unlimited ? '∞' : limit}
            </Badge>
          </div>
          <p className='text-sm text-muted-foreground'>{description}</p>
          {!unlimited && (
            <Progress value={Math.min(percentage, 100)} className='mt-2 h-2' />
          )}
        </div>
      </div>
    </div>
  )
}

// Compact version for dashboard widgets
export function SubscriptionStatusCompact() {
  const { featureSummary, customer, loading } = useAutumnFeatures()

  if (loading) {
    return <div className='animate-pulse text-sm'>Loading...</div>
  }

  if (!customer) {
    return <div className='text-sm text-muted-foreground'>No subscription</div>
  }

  const primaryProduct =
    customer.products?.find((p) => p.is_default) || customer.products?.[0]
  const planName = primaryProduct?.name || 'Free'

  return (
    <div className='flex items-center gap-2'>
      <Crown className='size-4' />
      <span className='font-medium'>{planName}</span>
      {featureSummary && (
        <div className='flex gap-1'>
          <Badge variant='outline' className='text-xs'>
            {featureSummary.products.used}/
            {featureSummary.products.unlimited
              ? '∞'
              : featureSummary.products.limit}{' '}
            products
          </Badge>
        </div>
      )}
    </div>
  )
}
