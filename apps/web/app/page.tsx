'use client'

import { Logo } from '@/components/brand/logo'
import { SimpleThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Package,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const features = [
    {
      icon: Package,
      title: 'Smart Inventory Tracking',
      description:
        'Real-time inventory management with automated stock alerts and predictive ordering',
    },
    {
      icon: Zap,
      title: 'POS Integration',
      description:
        'Seamlessly sync with Toast and other leading POS systems for accurate tracking',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description:
        'Detailed reports on usage patterns, costs, and profitability by product',
    },
    {
      icon: Shield,
      title: 'Loss Prevention',
      description:
        'Track variance between expected and actual usage to minimize shrinkage',
    },
    {
      icon: Users,
      title: 'Multi-location Support',
      description:
        'Manage inventory across multiple venues from a single dashboard',
    },
    {
      icon: TrendingUp,
      title: 'Cost Optimization',
      description:
        'Identify opportunities to reduce costs and increase profit margins',
    },
  ]

  const benefits = [
    'Reduce inventory costs by up to 25%',
    'Save 10+ hours per week on manual counting',
    'Minimize waste and over-pouring',
    'Improve order accuracy and timing',
    'Track real-time profit margins',
    'Prevent stockouts during peak hours',
  ]

  const testimonials = [
    {
      quote:
        'Happy Bar transformed how we manage inventory. We&apos;ve cut costs by 20% and virtually eliminated stockouts.',
      author: 'Sarah Mitchell',
      role: 'Bar Manager, The Copper Door',
      rating: 5,
    },
    {
      quote:
        'The POS integration is seamless. Everything syncs automatically, saving us hours of manual work each week.',
      author: 'Michael Chen',
      role: 'Owner, Sunset Lounge',
      rating: 5,
    },
    {
      quote:
        'Finally, software that understands the bar business. The serving size tracking alone has saved us thousands.',
      author: 'James Rodriguez',
      role: 'Operations Director, City Tap Houses',
      rating: 5,
    },
  ]

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Animated background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-neutral-900 dark:via-purple-900/10 dark:to-neutral-900 -z-10' />

      {/* Floating orbs for visual interest */}
      <div className='absolute top-40 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <div className='absolute bottom-40 right-10 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      {/* Navigation */}
      <nav className='sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <Logo size='md' />
            <div className='flex items-center gap-4'>
              {/* <Link href='/login'>
                <Button variant='ghost'>Sign In</Button>
              </Link> */}
              <SimpleThemeToggle />

              <Link href={!user ? '/login' : 'dashboard'}>
                <Button variant='ghost'>
                  {!user ? 'Sign In' : 'Dashboard'}
                </Button>
              </Link>
              <Link href='/register'>
                <Button className='bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'>
                  <Sparkles className='h-4 w-4 mr-2' />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='container mx-auto px-4 py-20'>
        <div className='mx-auto max-w-4xl text-center'>
          <h1 className='text-5xl font-bold tracking-tight sm:text-6xl'>
            Inventory Management
            <span className='block bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent mt-2'>
              Built for Bars
            </span>
          </h1>
          <p className='mt-6 text-xl text-muted-foreground'>
            Stop guessing, start knowing. Happy Bar gives you real-time
            visibility into your inventory, integrated directly with your POS
            system for accurate tracking and automated insights.
          </p>
          <div className='mt-10 flex flex-col sm:flex-row gap-4 justify-center'>
            <Button
              size='lg'
              onClick={() => router.push('/register')}
              className='text-lg px-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transition-all transform hover:scale-[1.02]'
            >
              Start Free Trial
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
            <Button
              size='lg'
              variant='outline'
              onClick={() =>
                document
                  .getElementById('features')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className='text-lg px-8'
            >
              See How It Works
            </Button>
          </div>
          <p className='mt-6 text-sm text-muted-foreground'>
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className='container mx-auto px-4 py-12'>
        <div className='mx-auto max-w-4xl'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent'>
                25%
              </div>
              <div className='mt-2 text-muted-foreground'>
                Average cost reduction
              </div>
            </div>
            <div className='text-center'>
              <div className='text-4xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent'>
                10+ hrs
              </div>
              <div className='mt-2 text-muted-foreground'>
                Saved weekly per venue
              </div>
            </div>
            <div className='text-center'>
              <div className='text-4xl font-bold bg-gradient-to-r from-amber-600 to-purple-600 bg-clip-text text-transparent'>
                500+
              </div>
              <div className='mt-2 text-muted-foreground'>
                Bars & restaurants trust us
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='container mx-auto px-4 py-20'>
        <div className='mx-auto max-w-6xl'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold sm:text-4xl'>
              Everything You Need to Manage Your Bar
            </h2>
            <p className='mt-4 text-xl text-muted-foreground'>
              Powerful features designed specifically for the hospitality
              industry
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {features.map((feature, index) => (
              <Card
                key={index}
                className='border-purple-100 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700/50 transition-all hover:shadow-lg hover:-translate-y-1'
              >
                <CardHeader>
                  <div className='h-12 w-12 rounded-lg bg-gradient-to-br from-purple-100 to-amber-100 dark:from-purple-900/30 dark:to-amber-900/30 flex items-center justify-center mb-4'>
                    <feature.icon className='h-6 w-6 text-purple-600 dark:text-purple-400' />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className='container mx-auto px-4 py-20 bg-muted/30'>
        <div className='mx-auto max-w-4xl'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
            <div>
              <h2 className='text-3xl font-bold mb-6'>
                Why Bar Owners Choose Happy Bar
              </h2>
              <p className='text-lg text-muted-foreground mb-8'>
                Join hundreds of successful bars and restaurants that have
                transformed their operations with our intelligent inventory
                management system.
              </p>
              <ul className='space-y-4'>
                {benefits.map((benefit, index) => (
                  <li key={index} className='flex items-start gap-3'>
                    <CheckCircle className='h-5 w-5 text-primary mt-0.5 shrink-0' />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='space-y-4'>
              <Card className='border-primary/20'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center gap-3'>
                    <Clock className='h-8 w-8 text-primary' />
                    <div>
                      <CardTitle className='text-lg'>
                        Real-time Tracking
                      </CardTitle>
                      <CardDescription>
                        Always know your exact inventory levels
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card className='border-primary/20'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center gap-3'>
                    <DollarSign className='h-8 w-8 text-primary' />
                    <div>
                      <CardTitle className='text-lg'>Cost Analytics</CardTitle>
                      <CardDescription>
                        Track costs and margins by product
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card className='border-primary/20'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center gap-3'>
                    <Zap className='h-8 w-8 text-primary' />
                    <div>
                      <CardTitle className='text-lg'>POS Integration</CardTitle>
                      <CardDescription>
                        Seamless sync with Toast and more
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className='container mx-auto px-4 py-20'>
        <div className='mx-auto max-w-6xl'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold sm:text-4xl'>
              Loved by Bar Professionals
            </h2>
            <p className='mt-4 text-xl text-muted-foreground'>
              See what our customers have to say about Happy Bar
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className='pt-6'>
                  <div className='flex gap-1 mb-4'>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg
                        key={i}
                        className='h-5 w-5 text-yellow-500 fill-current'
                        viewBox='0 0 20 20'
                      >
                        <path d='M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z' />
                      </svg>
                    ))}
                  </div>
                  <p className='text-muted-foreground mb-4'>
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <div className='font-semibold'>{testimonial.author}</div>
                    <div className='text-sm text-muted-foreground'>
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='container mx-auto px-4 py-20'>
        <Card className='bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 shadow-2xl'>
          <CardContent className='p-12 text-center'>
            <h2 className='text-3xl font-bold mb-4'>
              Ready to Transform Your Bar Operations?
            </h2>
            <p className='text-xl mb-8 opacity-90'>
              Join hundreds of successful bars using Happy Bar to optimize their
              inventory
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button
                size='lg'
                variant='secondary'
                onClick={() => router.push('/register')}
                className='text-lg px-8'
              >
                Start Your Free Trial
                <ChevronRight className='ml-2 h-5 w-5' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='text-lg px-8 bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10'
              >
                Schedule a Demo
              </Button>
            </div>
            <p className='mt-6 text-sm opacity-75'>
              Free for 14 days • No credit card required • Cancel anytime
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className='border-t mt-20'>
        <div className='container mx-auto px-4 py-12'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div>
              <Logo size='md' theme='auto' className='mb-4' />
              <p className='text-sm text-muted-foreground'>
                Intelligent inventory management for the modern bar
              </p>
            </div>
            <div>
              <h3 className='font-semibold mb-3'>Product</h3>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <Link href='#' className='hover:text-foreground'>
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
