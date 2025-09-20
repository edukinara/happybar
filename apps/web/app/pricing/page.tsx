'use client'

import { NewLogo } from '@/components/brand/new-logo'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/auth-context'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import {
  ArrowRight,
  Building,
  Check,
  GraduationCap,
  Loader2,
  Package,
  Phone,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { createCheckout, customer } = useAutumnFeatures()
  const [products, setProducts] = useState<AutumnProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/autumn/products`
      )
      const { data } = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Error', {
        description: 'Failed to load pricing plans. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (productId: string, isFree: boolean) => {
    // If user is not logged in, redirect to registration with plan
    if (!user) {
      router.push(`/register?plan=${productId}`)
      return
    }

    // If it's the free plan, redirect to dashboard (will auto-subscribe on login)
    if (isFree && !user) {
      router.push('/dashboard')
      return
    }

    // For paid plans, create checkout session
    try {
      setSubscribing(productId)
      await createCheckout(
        productId,
        `${window.location.origin}/dashboard?upgraded=true`
      )
    } catch (error) {
      console.error('Failed to create checkout:', error)
      toast.error('Error', {
        description: 'Failed to start checkout. Please try again.',
      })
    } finally {
      setSubscribing(null)
    }
  }

  const addOnServices = [
    {
      category: 'Setup & Onboarding',
      icon: Sparkles,
      services: [
        {
          name: 'Quick Start Setup',
          price: '$199',
          description:
            'Product catalog setup (100 items), basic POS integration, 1-hour training',
          features: [
            'Up to 100 products',
            'POS integration',
            '1-hour training',
            '30-day email support',
          ],
        },
        {
          name: 'Premium Onboarding',
          price: '$499',
          popular: true,
          description:
            'Complete setup with unlimited products, multi-location config, staff training',
          features: [
            'Unlimited products',
            'Multi-location setup',
            'Staff training (5 people)',
            '30-day white-glove support',
            'Custom reporting',
          ],
        },
        {
          name: 'Enterprise Migration',
          price: '$999+',
          description:
            'Data migration, custom integrations, on-site training, dedicated PM',
          features: [
            'Data migration',
            'Custom integrations',
            'On-site training',
            'Dedicated project manager',
          ],
        },
      ],
    },
    {
      category: 'Training & Education',
      icon: GraduationCap,
      services: [
        {
          name: 'Live Training Workshop',
          price: '$89',
          description:
            '2-hour virtual session for up to 5 attendees with recording',
          features: [
            '2-hour virtual session',
            'Up to 5 attendees',
            'Best practices training',
            'Session recording',
          ],
        },
        {
          name: 'Advanced Analytics Training',
          price: '$149',
          description:
            '3-hour intensive on cost optimization and loss prevention techniques',
          features: [
            '3-hour intensive session',
            'Cost optimization strategies',
            'Loss prevention techniques',
            'Custom reporting setup',
          ],
        },
        {
          name: 'Manager Certification',
          price: '$299',
          description: '3-session certification program with digital badge',
          features: [
            '6 hours total training',
            'Digital certification',
            'Quarterly refreshers',
            'Expert badge',
          ],
        },
      ],
    },
    {
      category: 'Scale & Expansion',
      icon: Building,
      services: [
        {
          name: 'Extra Locations',
          price: '$25/mo',
          description: 'Add unlimited locations beyond your plan limits',
          features: [
            'Full feature access',
            'Consolidated reporting',
            'No setup fees',
            'Instant activation',
          ],
        },
        {
          name: 'Additional Team Members',
          price: '$15/mo',
          description:
            'Add team members beyond plan limits with full permissions',
          features: [
            'Role-based permissions',
            'Activity tracking',
            'Individual dashboards',
            'No user limits',
          ],
        },
        {
          name: 'Extended Data Retention',
          price: '$10/mo',
          description: 'Keep historical data beyond plan limits',
          features: [
            'Per additional year',
            'Advanced reporting',
            'Data export tools',
            'Compliance ready',
          ],
        },
      ],
    },
    {
      category: 'Industry Modules',
      icon: Package,
      services: [
        {
          name: 'Brewery Package',
          price: '$39/mo',
          description:
            'Specialized tools for breweries and beer-focused establishments',
          features: [
            'Barrel aging tracking',
            'Recipe scaling',
            'ABV/IBU tracking',
            'Compliance reporting',
          ],
        },
        {
          name: 'Wine Program Module',
          price: '$49/mo',
          popular: true,
          description: 'Complete wine management for restaurants and wine bars',
          features: [
            'Vintage tracking',
            'Cellar management',
            'Wine list optimization',
            'Temperature monitoring',
          ],
        },
        {
          name: 'Cocktail Program Pro',
          price: '$29/mo',
          description: 'Advanced cocktail and mixology management features',
          features: [
            'Recipe costing',
            'Garnish tracking',
            'Seasonal planning',
            'Batch calculators',
          ],
        },
      ],
    },
  ]

  const bundles = [
    {
      name: 'New Bar Starter',
      price: '$599',
      originalPrice: '$799',
      description:
        'Everything you need to launch with professional inventory management',
      features: [
        '6 months Pro plan ($474 value)',
        'Premium Onboarding ($499 value)',
        'Smart Scale Kit ($129 value)',
        'Basic Training ($89 value)',
      ],
      savings: '$200+',
    },
    {
      name: 'Growth Accelerator',
      price: '$899',
      originalPrice: '$1,199',
      description:
        'Scale your operations with advanced features and dedicated support',
      features: [
        '12 months Business plan ($1,788 value)',
        'Manager Certification for 3 people ($897 value)',
        'API Access included',
        'Priority Support for 6 months ($294 value)',
      ],
      savings: '$300+',
      popular: true,
    },
  ]

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

  // Filter products by billing cycle
  const filteredProducts = products.filter((product) => {
    const interval = getProductInterval(product)
    if (product.properties?.is_free) return true
    if (billingCycle === 'year') {
      return interval === 'year' || product.id.includes('annual')
    }
    return interval === 'month' && !product.id.includes('annual')
  })

  // Sort products: free first, then by price
  const sortedProducts = filteredProducts.sort((a, b) => {
    if (a.properties?.is_free) return -1
    if (b.properties?.is_free) return 1
    return getProductPrice(a) - getProductPrice(b)
  })

  if (loading) {
    return (
      <div className='min-h-full flex items-center justify-center'>
        <HappyBarLoader />
      </div>
    )
  }

  return (
    <div className='min-h-full relative overflow-hidden'>
      {/* Animated background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-neutral-900 dark:via-purple-900/10 dark:to-neutral-900 -z-10' />

      {/* Floating orbs for visual interest */}
      <div className='absolute top-40 left-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse dark:opacity-5' />
      <div className='absolute bottom-40 right-10 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse dark:opacity-5' />
      {/* Navigation */}
      <nav className='border-b bg-background/95 backdrop-blur-sm'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-2'>
              <div className='flex flex-row gap-1 items-center'>
                <NewLogo className='size-12' />
                <span className='font-bold tracking-tight text-2xl text-nowrap'>
                  Happy Bar
                </span>
              </div>
            </Link>
            <div className='flex items-center gap-4'>
              <Link href={!user ? '/login' : 'dashboard'}>
                <Button variant='ghost'>
                  {!user ? 'Sign In' : 'Dashboard'}
                </Button>
              </Link>
              <Link href='/register'>
                <Button className='bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'>
                  <Sparkles className='size-4 mr-2' />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='container mx-auto px-4 py-16'>
        <div className='text-center max-w-3xl mx-auto'>
          <h1 className='text-4xl font-bold tracking-tight sm:text-5xl mb-6'>
            Simple,{' '}
            <span className='bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent'>
              Transparent
            </span>{' '}
            Pricing
          </h1>
          <p className='text-xl text-muted-foreground mb-8'>
            Start free, scale as you grow. No hidden fees, no surprise charges.
            Pay for what you need when you need it.
          </p>
          <Badge className='mb-8 bg-gradient-to-r from-purple-100 to-amber-100 text-purple-800 border-purple-200'>
            🎉 Limited Time: First 100 customers get Pro plan for $59/month
          </Badge>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className='container mx-auto px-4 pb-8'>
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
      </section>

      {/* Core Plans */}
      <section className='container mx-auto px-4 pb-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
          {sortedProducts.map((product, index) => {
            const price = getProductPrice(product)
            const interval = getProductInterval(product)
            const features = getProductFeatures(product)
            const isFree = product.properties?.is_free
            const isPopular = index === 1 && !isFree // Second paid plan is popular

            return (
              <Card
                key={product.id}
                className={`relative transition-all hover:shadow-xl ${isPopular ? 'border-purple-300 shadow-lg ring-2 ring-purple-100' : 'border-purple-100 dark:border-purple-900/30 hover:border-purple-200'}`}
              >
                {isPopular && (
                  <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                    <Badge className='bg-gradient-to-r from-purple-600 to-purple-700 text-white'>
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    {product.name}
                    {isFree && <Badge variant='secondary'>Free</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {isFree
                      ? 'Perfect for small bars getting started'
                      : price < 100
                        ? 'For established bars ready to optimize'
                        : 'For growing restaurant groups'}
                  </CardDescription>
                  <div className='pt-4'>
                    <span className='text-4xl font-bold'>
                      {isFree ? '$0' : `$${price}`}
                    </span>
                    <span className='text-muted-foreground'>/{interval}</span>
                  </div>
                  {!isFree && (
                    <p className='text-sm text-muted-foreground'>
                      ${(price / 30).toFixed(2)} per day
                    </p>
                  )}
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

                  {/* Show extra features for paid plans */}
                  {!isFree && features.length > 5 && (
                    <div className='pt-2 border-t'>
                      <p className='text-sm font-medium mb-2'>Plus:</p>
                      <div className='space-y-1'>
                        {features.slice(5, 8).map((item) => (
                          <div
                            key={item.feature_id}
                            className='flex items-center gap-2 text-sm'
                          >
                            <Check className='size-4 text-green-500' />
                            <span>{item.feature?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className={`w-full transition-all transform hover:scale-[1.02] ${
                      isPopular
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'
                        : isFree
                          ? 'border-purple-200 text-purple-600 hover:bg-purple-50'
                          : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                    }`}
                    variant='outline'
                    onClick={() => handleSelectPlan(product.id, !!isFree)}
                    disabled={
                      subscribing === product.id ||
                      (!!customer &&
                        customer.products?.some((p) => p.id === product.id))
                    }
                  >
                    {subscribing === product.id ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        Processing...
                      </>
                    ) : (
                      <>
                        {!!customer &&
                        customer.products?.some((p) => p.id === product.id)
                          ? 'Subscribed'
                          : isFree
                            ? 'Get Started Free'
                            : product.free_trial
                              ? `Start ${product.free_trial.length}-Day Free Trial`
                              : 'Get Started'}
                        {!!customer &&
                        customer.products?.some((p) => p.id === product.id)
                          ? null
                          : !isFree && <ArrowRight className='ml-2 size-4' />}
                      </>
                    )}
                  </Button>
                  <p className='text-xs text-muted-foreground text-center'>
                    {isFree
                      ? 'No credit card required • Free forever'
                      : product.free_trial
                        ? `No credit card required • Then $${price}/${interval}`
                        : 'Start today • Cancel anytime'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Annual Discount */}
        <div className='text-center mt-8'>
          <Badge variant='outline' className='text-green-600 border-green-600'>
            💰 Save 15% with annual billing
          </Badge>
        </div>
      </section>

      {/* Add-on Services */}
      <section className='container mx-auto px-4 py-16'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold mb-4'>
              Professional Services & Add-Ons
            </h2>
            <p className='text-xl text-muted-foreground'>
              Accelerate your success with expert setup, training, and
              specialized features
            </p>
          </div>

          <Tabs defaultValue='setup' className='w-full'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='setup'>Setup & Onboarding</TabsTrigger>
              <TabsTrigger value='training'>Training</TabsTrigger>
              <TabsTrigger value='scale'>Scale & Expand</TabsTrigger>
              <TabsTrigger value='industry'>Industry Modules</TabsTrigger>
            </TabsList>

            {addOnServices.map((category, categoryIndex) => {
              const tabValues = ['setup', 'training', 'scale', 'industry']
              const tabValue = tabValues[categoryIndex] || 'setup'
              return (
                <TabsContent
                  key={category.category}
                  value={tabValue}
                  className='space-y-6'
                >
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    {category.services.map((service, _serviceIndex) => (
                      <Card
                        key={service.name}
                        className={`relative ${service.popular ? 'border-primary shadow-lg' : ''}`}
                      >
                        {service.popular && (
                          <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                            <Badge className='bg-primary text-primary-foreground'>
                              Popular
                            </Badge>
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className='flex items-center gap-2'>
                            <category.icon className='size-5 text-primary' />
                            {service.name}
                          </CardTitle>
                          <CardDescription>
                            {service.description}
                          </CardDescription>
                          <div className='pt-2'>
                            <span className='text-2xl font-bold text-primary'>
                              {service.price}
                            </span>
                            {service.price.includes('/') && (
                              <span className='text-muted-foreground'>
                                {' '}
                                each
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className='space-y-2'>
                            {service.features.map((feature, featureIndex) => (
                              <li
                                key={featureIndex}
                                className='flex items-start gap-2 text-sm'
                              >
                                <Check className='size-4 text-green-500 mt-0.5 shrink-0' />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <Button className='w-full mt-4' variant='outline'>
                            Learn More
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      </section>

      {/* Bundled Packages */}
      <section className='container mx-auto px-4 py-16 bg-muted/30'>
        <div className='max-w-4xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold mb-4'>Bundled Packages</h2>
            <p className='text-xl text-muted-foreground'>
              Save money with our carefully crafted bundles
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            {bundles.map((bundle) => (
              <Card
                key={bundle.name}
                className={`relative ${bundle.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {bundle.popular && (
                  <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                    <Badge className='bg-primary text-primary-foreground'>
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{bundle.name}</CardTitle>
                  <CardDescription>{bundle.description}</CardDescription>
                  <div className='pt-4'>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-3xl font-bold text-primary'>
                        {bundle.price}
                      </span>
                      <span className='text-lg text-muted-foreground line-through'>
                        {bundle.originalPrice}
                      </span>
                    </div>
                    <Badge variant='secondary' className='mt-2'>
                      Save {bundle.savings}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-2 mb-6'>
                    {bundle.features.map((feature, index) => (
                      <li
                        key={index}
                        className='flex items-start gap-2 text-sm'
                      >
                        <Check className='size-4 text-green-500 mt-0.5 shrink-0' />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className='w-full'>
                    Get Bundle
                    <ArrowRight className='ml-2 size-4' />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className='container mx-auto px-4 py-16'>
        <div className='max-w-3xl mx-auto'>
          <h2 className='text-3xl font-bold text-center mb-12'>
            Frequently Asked Questions
          </h2>
          <div className='space-y-8'>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                Can I switch plans at any time?
              </h3>
              <p className='text-muted-foreground'>
                Yes! You can upgrade or downgrade your plan at any time. Changes
                take effect immediately, and we&apos;ll prorate any billing
                differences.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                Is there a setup fee?
              </h3>
              <p className='text-muted-foreground'>
                No setup fees for any subscription plan. Professional setup
                services are optional and priced separately to give you
                flexibility.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                What POS systems do you integrate with?
              </h3>
              <p className='text-muted-foreground'>
                We integrate with all major POS systems including Toast, Square,
                Lightspeed, Clover, Resy, and many more. Custom integrations are
                available for Business plan customers.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                Do you offer refunds?
              </h3>
              <p className='text-muted-foreground'>
                We offer a 30-day money-back guarantee on all subscription
                plans. If you&apos;re not satisfied, we&apos;ll refund your
                first month&apos;s payment.
              </p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                How does billing work for add-ons?
              </h3>
              <p className='text-muted-foreground'>
                Monthly add-ons are billed with your subscription. One-time
                services are billed separately when ordered. Annual
                subscriptions get 15% off add-ons too!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className='container mx-auto px-4 py-16'>
        <Card className='bg-gradient-to-r from-purple-600 to-purple-700 text-white max-w-4xl mx-auto border-0 shadow-2xl'>
          <CardContent className='p-12 text-center'>
            <h2 className='text-3xl font-bold mb-4'>
              Ready to Transform Your Bar Operations?
            </h2>
            <p className='text-xl mb-8 opacity-90'>
              Start your free trial today. No credit card required, cancel
              anytime.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button
                size='lg'
                variant='secondary'
                onClick={() => handleSelectPlan('free', true)}
                className='text-lg px-8'
              >
                Start Free Trial
                <ArrowRight className='ml-2 size-5' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='text-lg px-8 bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10'
              >
                Schedule Demo
                <Phone className='ml-2 size-5' />
              </Button>
            </div>
            <p className='mt-6 text-sm opacity-75'>
              Questions? Email us at sales@happybar.com or call (555) 123-4567
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className='border-t mt-20'>
        <div className='container mx-auto px-4 py-12'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div>
              <div className='flex flex-row gap-1 items-center pb-2'>
                <NewLogo className='size-10' />
                <span className='font-bold tracking-tight text-lg text-nowrap'>
                  Happy Bar
                </span>
              </div>
              <p className='text-sm text-muted-foreground'>
                Intelligent inventory management for the modern bar
              </p>
            </div>
            <div>
              <h3 className='font-semibold mb-3'>Product</h3>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <Link href='/#features' className='hover:text-foreground'>
                    Features
                  </Link>
                </li>
                <li>
                  <Link href='/pricing' className='hover:text-foreground'>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='font-semibold mb-3'>Company</h3>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    About
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='font-semibold mb-3'>Legal</h3>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href='#' className='hover:text-foreground'>
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className='mt-8 pt-8 border-t text-center text-sm text-muted-foreground'>
            © 2024 Happy Bar. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
