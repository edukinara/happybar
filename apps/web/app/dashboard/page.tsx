'use client'

import { AlertSummaryCard } from '@/components/alerts/AlertSummary'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
// Re-enabled with stable query key fixes
import {
  useInventory,
  useInventoryCounts,
  useLocations,
  useLowStockItems,
} from '@/lib/queries'
import { useLocationStore } from '@/lib/stores/location-store'
import type { Integration } from '@happy-bar/types'
import {
  AlertTriangle,
  BarChart3,
  Box,
  ClipboardList,
  DollarSign,
  MapPin,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

export default function DashboardPage() {
  // Use global location state
  const { selectedLocationId } = useLocationStore()

  // Essential queries with stable query keys
  const inventoryQuery = useInventory()
  const locationsQuery = useLocations()
  const lowStockQuery = useLowStockItems()
  const inventoryCountsQuery = useInventoryCounts({
    limit: 5, // Explicitly pass as number, not string
    page: 1,
  })
  const pendingOrdersQuery = { data: 0 }
  const integrations: Integration[] = []

  // Extract data from queries
  const inventory = inventoryQuery.data || []
  const locations = locationsQuery.data || []
  const lowStockItems = lowStockQuery.data || []
  const recentCounts = inventoryCountsQuery.data?.counts || []
  const pendingOrdersCount = pendingOrdersQuery.data || 0

  // Loading states
  const loading =
    inventoryQuery.isLoading ||
    locationsQuery.isLoading ||
    lowStockQuery.isLoading
  const loadingLocationData =
    inventoryQuery.isLoading || locationsQuery.isLoading

  // Error handling
  const error =
    inventoryQuery.error || locationsQuery.error || lowStockQuery.error

  // Calculate dashboard stats from the query data
  const stats = useMemo(() => {
    if (!inventory.length) return null

    const totalValue = inventory.reduce((sum, item) => {
      const cost = item?.currentQuantity || 0
      const price = item?.product?.costPerUnit || 0
      return sum + cost * price
    }, 0)

    const uniqueProducts = new Set(inventory.map((item) => item.productId))

    return {
      totalItems: uniqueProducts.size,
      lowStockItems: lowStockItems.length,
      totalValue,
      recentCounts: recentCounts.slice(0, 2),
    }
  }, [inventory, lowStockItems, recentCounts])

  // Calculate location stats using useMemo to prevent recalculation on every render
  const locationStats = useMemo(() => {
    // Ensure we have valid arrays
    if (!Array.isArray(inventory) || !Array.isArray(locations)) return []
    if (!inventory.length || !locations.length) return []

    return locations.map((location) => {
      const locationInventory = inventory.filter(
        (item) => item?.locationId === location?.id
      )

      const totalItems = locationInventory.length
      const totalValue = locationInventory.reduce((sum, item) => {
        // Defensive check for nested properties
        const cost = item?.currentQuantity || 0
        const price = item?.product?.costPerUnit || 0
        return sum + cost * price
      }, 0)
      const lowStockItems = locationInventory.filter(
        (item) => (item?.currentQuantity || 0) < (item?.minimumQuantity || 0)
      ).length
      const outOfStockItems = locationInventory.filter(
        (item) => (item?.currentQuantity || 0) <= 0
      ).length

      return {
        location,
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        stockHealth:
          totalItems > 0
            ? ((totalItems - lowStockItems) / totalItems) * 100
            : 100,
      }
    })
  }, [inventory, locations])

  const getSelectedLocationStats = () => {
    if (!selectedLocationId) return null
    return locationStats.find((stat) => stat.location.id === selectedLocationId)
  }

  // Check loading state first
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappyBarLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Failed to load dashboard
          </h2>
          <p className='text-muted-foreground'>
            {error?.message || 'Unknown error occurred'}
          </p>
        </div>
      </div>
    )
  }

  const lastCountDate =
    stats?.recentCounts?.[0]?.completedAt || stats?.recentCounts?.[0]?.startedAt

  return (
    <div className='min-h-screen relative'>
      {/* Animated background gradient */}
      <div className='fixed inset-0 brand-gradient -z-10' />

      {/* Floating orbs for visual interest */}
      <div className='fixed top-40 left-10 w-72 h-72 brand-orb-primary animate-float' />
      <div className='fixed bottom-40 right-10 w-72 h-72 brand-orb-accent animate-float-reverse' />

      <div className='space-y-6 relative z-10'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Welcome back! Here&apos;s what&apos;s happening with your
              inventory.
            </p>
          </div>
          <div className='flex space-x-2'>
            <Button asChild className='btn-brand-primary'>
              <Link href='/dashboard/inventory/counts/new'>
                <ClipboardList className='mr-2 size-4' />
                Start Count
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Items</CardTitle>
              <Box className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold brand-text-gradient'>
                {stats?.totalItems || 0}
              </div>
              <p className='text-xs text-muted-foreground'>
                Across all locations
              </p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Low Stock Items
              </CardTitle>
              <AlertTriangle className='size-4 brand-icon-accent' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-amber-600'>
                {stats?.lowStockItems || 0}
              </div>
              <p className='text-xs text-muted-foreground'>Need attention</p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Inventory Value
              </CardTitle>
              <DollarSign className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold brand-text-gradient'>
                $
                {(stats?.totalValue || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className='text-xs text-muted-foreground'>
                Current on-hand value
              </p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Pending Orders
              </CardTitle>
              <ShoppingCart className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold brand-text-gradient'>
                {pendingOrdersCount}
              </div>
              <p className='text-xs text-muted-foreground'>
                Orders awaiting delivery
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Location-Based Inventory Dashboard */}
        {selectedLocationId && (
          <Card className='brand-card gap-3'>
            <CardHeader>
              <div>
                <CardTitle className='brand-text-gradient'>
                  Location Inventory Overview
                </CardTitle>
                <CardDescription>
                  Inventory metrics for selected location
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLocationData ? (
                <div className='flex items-center justify-center py-8'>
                  <HappyBarLoader
                    className='p-16'
                    text='Loading location data...'
                  />
                </div>
              ) : (() => {
                const locationStat = getSelectedLocationStats()
                if (!locationStat) {
                  return (
                    <div className='text-center py-8 text-muted-foreground'>
                      <MapPin className='h-12 w-12 mx-auto mb-4' />
                      <h3 className='text-lg font-medium mb-2'>
                        Location data not found
                      </h3>
                      <p>Please select a valid location from the top menu</p>
                    </div>
                  )
                }

                return (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2 mb-4'>
                      <MapPin className='size-5 text-muted-foreground' />
                      <h3 className='text-lg font-semibold'>
                        {locationStat.location.name}
                      </h3>
                      <span className='text-sm text-muted-foreground'>
                        ({locationStat.location.type})
                      </span>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                      <Card className='gap-2'>
                        <CardHeader className='pb-2'>
                          <CardTitle className='text-sm'>Total Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>
                            {locationStat.totalItems}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Product-location pairs
                          </p>
                        </CardContent>
                      </Card>

                      <Card className='gap-2'>
                        <CardHeader className='pb-2'>
                          <CardTitle className='text-sm'>
                            Inventory Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold'>
                            $
                            {locationStat.totalValue.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Current value
                          </p>
                        </CardContent>
                      </Card>

                      <Card className='gap-2'>
                        <CardHeader className='pb-2'>
                          <CardTitle className='text-sm'>
                            Low Stock Items
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold text-orange-600'>
                            {locationStat.lowStockItems}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Need attention
                          </p>
                        </CardContent>
                      </Card>

                      <Card className='gap-2'>
                        <CardHeader className='pb-2'>
                          <CardTitle className='text-sm'>
                            Stock Health
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='text-2xl font-bold text-green-600'>
                            {locationStat.stockHealth.toFixed(0)}%
                          </div>
                          <Progress
                            value={locationStat.stockHealth}
                            className='mt-2'
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <div className='flex justify-center pt-4'>
                      <Button asChild variant='outline'>
                        <Link
                          href={`/dashboard/inventory?location=${selectedLocationId}`}
                        >
                          <Box className='mr-2 size-4' />
                          View Full Inventory
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity & Alerts */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <Card className='col-span-4 brand-card'>
            <CardHeader>
              <CardTitle className='bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent'>
                Recent Variance Analysis
              </CardTitle>
              <CardDescription>
                {lastCountDate
                  ? `Last count on ${new Date(lastCountDate).toLocaleDateString()}`
                  : 'No counts completed yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {stats?.recentCounts && stats.recentCounts.length > 0 ? (
                  <>
                    <div className='flex items-center space-x-4'>
                      <div className='flex items-center space-x-2'>
                        <TrendingUp className='size-4 text-green-500' />
                        <span className='text-sm'>Recent activity</span>
                      </div>
                    </div>

                    <div className='grid grid-cols-3 gap-4 text-center'>
                      <div>
                        <div className='text-2xl font-bold text-blue-600'>
                          {stats.recentCounts[0]?.itemsCounted || 0}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Items Counted
                        </div>
                      </div>
                      <div>
                        <div className='text-2xl font-bold'>
                          {stats.recentCounts.length}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Recent Counts
                        </div>
                      </div>
                      <div>
                        <div className='text-2xl font-bold capitalize'>
                          {stats.recentCounts[0]?.status.toLowerCase() || 'N/A'}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Latest Status
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='text-center text-muted-foreground py-4'>
                    No count data available yet
                  </div>
                )}

                <div className='pt-2'>
                  <Button variant='outline' asChild className='w-full'>
                    <Link href='/dashboard/analytics'>
                      <BarChart3 className='mr-2 size-4' />
                      View Full Analysis
                    </Link>
                  </Button>
                </div>
                {/* Recent Counts */}
                <div className='mt-8 space-y-2'>
                  <p className='text-md font-semibold'>Recent Counts</p>
                  {stats?.recentCounts && stats.recentCounts.length > 0 ? (
                    <div className='space-y-4'>
                      {stats.recentCounts.map((count) => (
                        <div
                          key={count.id}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <div>
                            <div className='font-medium'>{count.name}</div>
                            <div className='text-sm text-muted-foreground'>
                              {count.createdAt
                                ? new Date(count.createdAt).toLocaleDateString()
                                : ''}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='text-sm font-medium capitalize'>
                              {count.status.toLowerCase()}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {count.itemsCounted || 0} items
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center text-muted-foreground py-8'>
                      No recent counts found.{' '}
                      <Link
                        href='/dashboard/inventory/counts/new'
                        className='text-primary hover:underline'
                      >
                        Start your first count
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='col-span-3 space-y-4'>
            {/* Alert Summary */}
            <AlertSummaryCard locationId={selectedLocationId || undefined} />

            {/* Quick Actions */}
            <Card className='brand-card'>
              <CardHeader>
                <CardTitle className='brand-text-gradient'>
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className='space-y-2'>
                <Button asChild className='w-full btn-brand-primary'>
                  <Link href='/dashboard/inventory'>
                    <Box className='mr-2 size-4' />
                    View Inventory
                  </Link>
                </Button>
                <Button asChild className='w-full btn-brand-primary'>
                  <Link href='/dashboard/orders/new'>
                    <ShoppingCart className='mr-2 size-4' />
                    Create Order
                  </Link>
                </Button>
                <Button asChild className='w-full btn-brand-primary'>
                  <Link href='/dashboard/orders/suggestions'>
                    <TrendingUp className='mr-2 size-4' />
                    Reorder Suggestions
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* POS Integration Status */}
        {integrations.length > 0 && (
          <Card className='brand-card'>
            <CardHeader>
              <CardTitle className='bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent'>
                POS Integration Status
              </CardTitle>
              <CardDescription>
                Current status of your point-of-sale integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {integrations.slice(0, 3).map((integration) => {
                  const getStatusColor = (
                    status: typeof integration.syncStatus
                  ) => {
                    switch (status) {
                      case 'SUCCESS':
                        return 'text-green-600'
                      case 'FAILED':
                        return 'text-red-600'
                      case 'SYNCING':
                        return 'text-blue-600'
                      case 'PARTIAL_SUCCESS':
                        return 'text-yellow-600'
                      default:
                        return 'text-gray-600'
                    }
                  }

                  const getStatusIcon = (
                    status: typeof integration.syncStatus
                  ) => {
                    switch (status) {
                      case 'SUCCESS':
                        return '✓'
                      case 'FAILED':
                        return '✗'
                      case 'SYNCING':
                        return '↻'
                      case 'PARTIAL_SUCCESS':
                        return '⚠'
                      default:
                        return '○'
                    }
                  }

                  return (
                    <div
                      key={integration.id}
                      className='flex items-center justify-between p-3 border rounded-lg'
                    >
                      <div>
                        <div className='font-medium flex items-center'>
                          <span
                            className={`mr-2 ${getStatusColor(integration.syncStatus)}`}
                          >
                            {getStatusIcon(integration.syncStatus)}
                          </span>
                          {integration.name}
                        </div>
                        <div className='text-sm text-muted-foreground capitalize'>
                          {integration.type} • Last sync:{' '}
                          {integration.lastSyncAt
                            ? new Date(
                                integration.lastSyncAt
                              ).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium capitalize ${getStatusColor(integration.syncStatus)}`}
                      >
                        {integration.syncStatus.replace('_', ' ').toLowerCase()}
                      </div>
                    </div>
                  )
                })}
                {integrations.length > 3 && (
                  <div className='text-center pt-2'>
                    <Link
                      href='/dashboard/settings'
                      className='text-primary hover:underline text-sm'
                    >
                      View all {integrations.length} integrations
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
