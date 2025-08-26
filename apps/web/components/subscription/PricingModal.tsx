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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/auth-context'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import {
  ArrowRight,
  Check,
  Crown,
  Loader2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface AutumnProduct {
  id: string
  name: string
  items: Array<{
    type: string
    feature_id?: string
    feature?: {
      id: string
      name: string
      display?: {
        singular: string
        plural: string
      }
    }
    included_usage?: number | 'inf'
    price?: number
    interval?: string
    display?: {
      primary_text: string
      secondary_text?: string
    }
  }>
  free_trial?: {
    duration: string
    length: number
  }
  properties?: {
    is_free: boolean
  }
}

interface PricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureName?: string
  requiredPlan?: string
}

export function PricingModal({
  open,
  onOpenChange,
  featureName,
  requiredPlan: _ = 'Pro',
}: PricingModalProps) {
  const { user } = useAuth()
  const { createCheckout, customer } = useAutumnFeatures()
  const [products, setProducts] = useState<AutumnProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchProducts()
    }
  }, [open])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/autumn/products`
      )
      const { data } = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.warn('Failed to fetch products:', error)
      toast.error('Error', {
        description: 'Failed to load pricing plans. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (productId: string, isFree: boolean) => {
    // For free plans, just close modal (user already has access)
    if (isFree) {
      onOpenChange(false)
      return
    }

    // Check if user can handle billing operations
    const hasBillingAccess =
      user?.role && ['owner', 'admin'].includes(user.role)

    if (!hasBillingAccess) {
      toast.error('Access Denied', {
        description:
          'Only organization owners and administrators can upgrade plans. Contact your admin to upgrade.',
      })
      return
    }

    try {
      setSubscribing(productId)
      await createCheckout(
        productId,
        `${window.location.origin}/dashboard?upgraded=true`
      )
      // createCheckout will redirect to Stripe, so modal will be closed automatically
    } catch (error) {
      console.warn('Failed to create checkout:', error)

      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as any
        if (errorResponse.response?.status === 403) {
          toast.error('Permission Denied', {
            description:
              'You don&apos;t have permission to upgrade plans. Contact your organization administrator.',
          })
        } else {
          toast.error('Error', {
            description: 'Failed to start checkout. Please try again.',
          })
        }
      } else {
        toast.error('Error', {
          description: 'Failed to start checkout. Please try again.',
        })
      }
    } finally {
      setSubscribing(null)
    }
  }

  // Helper functions to extract data from Autumn products
  const getProductPrice = (product: AutumnProduct) => {
    const priceItem = product.items.find((item) => item.type === 'price')
    return priceItem?.price || 0
  }

  const getProductInterval = (product: AutumnProduct) => {
    const priceItem = product.items.find((item) => item.type === 'price')
    return priceItem?.interval || 'month'
  }

  const getProductFeatures = (product: AutumnProduct) => {
    return product.items.filter((item) => item.type === 'feature')
  }

  // Filter products by billing cycle and exclude free plans
  const filteredProducts = products.filter((product) => {
    if (product.properties?.is_free) return false // Exclude free plans from modal
    const interval = getProductInterval(product)
    if (billingCycle === 'year') {
      return interval === 'year' || product.id.includes('annual')
    }
    return interval === 'month' && !product.id.includes('annual')
  })

  // Sort products by price
  const sortedProducts = filteredProducts.sort(
    (a, b) => getProductPrice(a) - getProductPrice(b)
  )

  const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              {featureName && (
                <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center'>
                  <Crown className='h-5 w-5 text-primary' />
                </div>
              )}
              <div>
                <DialogTitle className='text-2xl'>
                  {featureName
                    ? `Upgrade to Access ${featureName}`
                    : 'Choose Your Plan'}
                </DialogTitle>
                <DialogDescription className='text-base mt-1'>
                  {featureName
                    ? '${featureName} requires a ${requiredPlan} plan or higher. Choose the plan that&apos;s right for you.'
                    : 'Unlock more features and grow your business with our flexible plans.'}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onOpenChange(false)}
              className='shrink-0'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Billing Toggle */}
          <div className='flex justify-center'>
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as 'month' | 'year')}
            >
              <TabsList>
                <TabsTrigger value='month'>Monthly</TabsTrigger>
                <TabsTrigger value='year'>
                  Annual
                  <Badge className='ml-2' variant='secondary'>
                    Save 15%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin mr-2' />
              <span>Loading pricing plans...</span>
            </div>
          )}

          {/* Pricing Plans */}
          {!loading && sortedProducts.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {sortedProducts.map((product, index) => {
                const price = getProductPrice(product)
                const interval = getProductInterval(product)
                const features = getProductFeatures(product)
                const isPopular = index === 1 // Second plan is popular
                const isCurrentPlan =
                  !!customer &&
                  customer.products?.some((p) => p.id === product.id)

                return (
                  <Card
                    key={product.id}
                    className={`relative ${
                      isPopular ? 'border-primary shadow-lg scale-105' : ''
                    } ${isCurrentPlan ? 'border-green-500' : ''}`}
                  >
                    {isPopular && (
                      <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                        <Badge className='bg-primary text-primary-foreground'>
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className='absolute -top-3 right-4'>
                        <Badge className='bg-green-500 text-white'>
                          Current Plan
                        </Badge>
                      </div>
                    )}
                    <CardHeader className='pb-4'>
                      <CardTitle className='flex items-center gap-2'>
                        {product.name}
                      </CardTitle>
                      <CardDescription>
                        {price < 100
                          ? 'Perfect for growing bars and restaurants'
                          : 'For established businesses and restaurant groups'}
                      </CardDescription>
                      <div className='pt-2'>
                        <span className='text-3xl font-bold'>${price}</span>
                        <span className='text-muted-foreground'>
                          /{interval}
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        ${(price / 30).toFixed(2)} per day
                      </p>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-2'>
                        {features.slice(0, 5).map((item) => (
                          <div
                            key={item.feature_id}
                            className='flex justify-between text-sm'
                          >
                            <span className='text-muted-foreground'>
                              {item.feature?.name || ''}
                            </span>
                            <span className='font-medium'>
                              {item.display?.primary_text ||
                                (item.included_usage === 'inf'
                                  ? 'Unlimited'
                                  : item.included_usage)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Show extra features */}
                      {features.length > 5 && (
                        <div className='pt-2 border-t space-y-1'>
                          {features.slice(5, 8).map((item) => (
                            <div
                              key={item.feature_id}
                              className='flex items-center gap-2 text-sm'
                            >
                              <Check className='h-4 w-4 text-green-500' />
                              <span>{item.feature?.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        className='w-full'
                        variant={isPopular ? 'default' : 'outline'}
                        onClick={() => handleSelectPlan(product.id, false)}
                        disabled={
                          subscribing === product.id ||
                          isCurrentPlan ||
                          !hasBillingAccess
                        }
                      >
                        {subscribing === product.id ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : !hasBillingAccess ? (
                          'Contact Admin to Upgrade'
                        ) : (
                          <>
                            {product.free_trial
                              ? `Start ${product.free_trial.length}-Day Free Trial`
                              : 'Upgrade Now'}
                            {!isCurrentPlan && (
                              <ArrowRight className='ml-2 h-4 w-4' />
                            )}
                          </>
                        )}
                      </Button>

                      <p className='text-xs text-muted-foreground text-center'>
                        {!hasBillingAccess
                          ? 'Only owners and admins can upgrade plans'
                          : product.free_trial
                            ? `No credit card required • Then $${price}/${interval}`
                            : 'Start today • Cancel anytime'}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* No Billing Access Warning */}
          {!hasBillingAccess && (
            <Card className='border-amber-200 bg-amber-50'>
              <CardContent className='flex items-center gap-3 p-4'>
                <Sparkles className='h-5 w-5 text-amber-600' />
                <div>
                  <p className='font-medium text-amber-800'>
                    Billing access required
                  </p>
                  <p className='text-sm text-amber-700'>
                    Only organization owners and administrators can upgrade
                    plans. Contact your admin to upgrade.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Annual Discount */}
          <div className='text-center'>
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              💰 Save 15% with annual billing
            </Badge>
          </div>

          {/* Trust indicators */}
          <div className='flex items-center justify-center gap-6 text-sm text-muted-foreground border-t pt-6'>
            <div className='flex items-center gap-2'>
              <Check className='h-4 w-4 text-green-500' />
              <span>30-day money-back guarantee</span>
            </div>
            <div className='flex items-center gap-2'>
              <Zap className='h-4 w-4 text-blue-500' />
              <span>Instant activation</span>
            </div>
            <div className='flex items-center gap-2'>
              <Crown className='h-4 w-4 text-purple-500' />
              <span>Premium support included</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
