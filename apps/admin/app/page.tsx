'use client'

import { AdminHeader } from '@/components/admin-header'
import { AuthGuard } from '@/components/auth-guard'
import { usePlatformMetrics } from '@/hooks/use-platform-metrics'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

// Placeholder metrics component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  href,
}: {
  title: string
  value: string | number
  change?: string
  icon: any
  href?: string
}) {
  const content = (
    <div className='p-6 bg-card rounded-lg border hover:shadow-md transition-shadow'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>{title}</p>
          <p className='text-2xl font-bold mt-2'>{value}</p>
          {change && <p className='text-xs text-green-600 mt-1'>{change}</p>}
        </div>
        <Icon className='size-8 text-muted-foreground' />
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

export default function AdminDashboard() {
  const { data: platformMetrics, isLoading, error } = usePlatformMetrics()

  // Format system uptime
  const formatUptime = (uptimeSeconds: number) => {
    const hours = Math.floor(uptimeSeconds / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Format memory usage
  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <AuthGuard>
      <div className='min-h-screen bg-background'>
        <AdminHeader />

        {/* Main Content */}
        <main className='container mx-auto px-4 py-8'>
          {/* Platform Overview */}
          <div className='mb-8'>
            <h2 className='text-2xl font-bold mb-2'>Platform Overview</h2>
            <p className='text-muted-foreground'>
              Real-time metrics and system health
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className='p-6 bg-card rounded-lg border animate-pulse'
                >
                  <div className='h-4 bg-gray-200 rounded w-3/4 mb-4'></div>
                  <div className='h-8 bg-gray-200 rounded w-1/2'></div>
                </div>
              ))
            ) : error ? (
              <div className='col-span-4 p-6 bg-destructive/10 border border-destructive/20 rounded-lg'>
                <p className='text-destructive'>
                  Failed to load metrics: {error.message}
                </p>
              </div>
            ) : (
              <>
                <MetricCard
                  title='Total Organizations'
                  value={platformMetrics?.organizations.total || 0}
                  change={`${platformMetrics?.organizations.active || 0} active (${platformMetrics?.organizations.growthRate || '+0%'} this month)`}
                  icon={Building2}
                  href='/organizations'
                />
                <MetricCard
                  title='Active Users (24h)'
                  value={
                    platformMetrics?.users.activeToday.toLocaleString() || '0'
                  }
                  change={`${platformMetrics?.users.activeThisWeek.toLocaleString() || 0} weekly (${platformMetrics?.users.activityRate || '0%'} active)`}
                  icon={Users}
                  href='/users'
                />
                <MetricCard
                  title='Monthly Revenue'
                  value={`$${platformMetrics?.subscriptions.monthlyRevenue.toLocaleString() || '0'}`}
                  change={`${platformMetrics?.subscriptions.activeSubscriptions || 0} active (${platformMetrics?.subscriptions.conversionRate || '0%'} conversion)`}
                  icon={DollarSign}
                  href='/analytics/revenue'
                />
                <MetricCard
                  title='POS Integrations'
                  value={platformMetrics?.integrations.total || 0}
                  change={`${platformMetrics?.integrations.active || 0} active (${platformMetrics?.integrations.healthRate || '0%'} healthy)`}
                  icon={Zap}
                  href='/integrations'
                />
              </>
            )}
          </div>

          {/* System Health */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            <div className='bg-card rounded-lg border p-6'>
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <Activity className='size-5' />
                System Health
              </h3>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>System Uptime</span>
                  <span className='text-sm font-medium text-green-600'>
                    {platformMetrics?.system.uptime
                      ? formatUptime(platformMetrics.system.uptime)
                      : 'Loading...'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Memory Usage</span>
                  <span className='text-sm font-medium'>
                    {platformMetrics?.system.memoryUsage
                      ? formatMemory(
                          platformMetrics.system.memoryUsage.heapUsed
                        )
                      : 'Loading...'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Database Status</span>
                  <span className='text-sm font-medium flex items-center gap-1'>
                    <CheckCircle className='size-3 text-green-600' />
                    Healthy
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Integration Health</span>
                  <span className='text-sm font-medium text-green-600'>
                    {platformMetrics?.integrations.healthRate || '0%'}
                  </span>
                </div>
              </div>
            </div>

            <div className='bg-card rounded-lg border p-6'>
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <Package className='size-5' />
                Platform Insights
              </h3>
              <div className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <AlertTriangle className='size-4 text-amber-500 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>Low Stock Alerts</p>
                    <p className='text-xs text-muted-foreground'>
                      {platformMetrics?.inventory.lowStockAlerts || 0} active
                      alerts across all organizations
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Users className='size-4 text-blue-500 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>Recent Signups</p>
                    <p className='text-xs text-muted-foreground'>
                      {platformMetrics?.users.recentSignups || 0} new users this
                      week
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Building2 className='size-4 text-green-500 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>New Organizations</p>
                    <p className='text-xs text-muted-foreground'>
                      {platformMetrics?.organizations.newThisMonth || 0}{' '}
                      organizations joined this month
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <DollarSign className='size-4 text-green-500 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>Subscription Revenue</p>
                    <p className='text-xs text-muted-foreground'>
                      $
                      {platformMetrics?.subscriptions.monthlyRevenue.toLocaleString() ||
                        0}
                      /month from{' '}
                      {platformMetrics?.subscriptions.activeSubscriptions || 0}{' '}
                      subscriptions
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <ShoppingCart className='size-4 text-purple-500 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>Order Activity</p>
                    <p className='text-xs text-muted-foreground'>
                      {platformMetrics?.orders.thisMonth || 0} orders processed
                      this month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='bg-card rounded-lg border p-6'>
            <h3 className='text-lg font-semibold mb-4'>Quick Actions</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <Link
                href='/organizations/new'
                className='p-4 border rounded-lg hover:bg-secondary text-center'
              >
                <Building2 className='size-6 mx-auto mb-2' />
                <span className='text-sm'>Create Organization</span>
              </Link>
              <Link
                href='/users/search'
                className='p-4 border rounded-lg hover:bg-secondary text-center'
              >
                <Users className='size-6 mx-auto mb-2' />
                <span className='text-sm'>Find User</span>
              </Link>
              <Link
                href='/integrations/debug'
                className='p-4 border rounded-lg hover:bg-secondary text-center'
              >
                <Zap className='size-6 mx-auto mb-2' />
                <span className='text-sm'>Debug Integration</span>
              </Link>
              <Link
                href='/support/tickets'
                className='p-4 border rounded-lg hover:bg-secondary text-center'
              >
                <AlertTriangle className='size-6 mx-auto mb-2' />
                <span className='text-sm'>Support Tickets</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
