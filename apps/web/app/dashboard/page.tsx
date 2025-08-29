'use client'

import { AlertSummaryCard } from '@/components/alerts/AlertSummary'
import { LocationFilter } from '@/components/dashboard/LocationFilter'
import { HappBarLoader } from '@/components/HappyBarLoader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { inventoryApi } from '@/lib/api/inventory'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { useDashboard } from '@/lib/hooks/use-dashboard'
import { usePOSIntegrations } from '@/lib/hooks/use-pos-integrations'
import type { InventoryLevel } from '@happy-bar/types'
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
import { useEffect, useState } from 'react'

interface LocationStats {
  location: LocationsResponse[number]
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  stockHealth: number
}

export default function DashboardPage() {
  const { stats, loading, error } = useDashboard()
  const { integrations } = usePOSIntegrations()

  // Location-based inventory state
  const [inventory, setInventory] = useState<InventoryLevel[]>([])
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >()
  const [locationStats, setLocationStats] = useState<LocationStats[]>([])
  const [loadingLocationData, setLoadingLocationData] = useState(false)

  // Load location-based inventory data
  useEffect(() => {
    loadLocationData()
  }, [])

  useEffect(() => {
    calculateLocationStats()
  }, [inventory, locations])

  const loadLocationData = async () => {
    try {
      setLoadingLocationData(true)
      const [inventoryData, locationsData] = await Promise.all([
        inventoryApi.getInventoryLevels(),
        locationsApi.getLocations(),
      ])
      setInventory(inventoryData)
      setLocations(locationsData)
    } catch (error) {
      console.error('Failed to load location data:', error)
    } finally {
      setLoadingLocationData(false)
    }
  }

  const calculateLocationStats = () => {
    if (!inventory.length || !locations.length) return

    const stats = locations.map((location) => {
      const locationInventory = inventory.filter(
        (item) => item.locationId === location.id
      )

      const totalItems = locationInventory.length
      const totalValue = locationInventory.reduce(
        (sum, item) => sum + item.currentQuantity * item.product.costPerUnit,
        0
      )
      const lowStockItems = locationInventory.filter(
        (item) => item.currentQuantity < item.minimumQuantity
      ).length
      const outOfStockItems = locationInventory.filter(
        (item) => item.currentQuantity <= 0
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

    setLocationStats(stats)
  }

  const getSelectedLocationStats = () => {
    if (!selectedLocationId) return null
    return locationStats.find((stat) => stat.location.id === selectedLocationId)
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappBarLoader />
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
          <p className='text-muted-foreground'>{error}</p>
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
              <div className='text-2xl font-bold brand-text-gradient'>0</div>
              <p className='text-xs text-muted-foreground'>
                Orders coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Location-Based Inventory Dashboard */}
        <Card className='brand-card gap-3'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='brand-text-gradient'>
                  Location Inventory Overview
                </CardTitle>
                <CardDescription>
                  Inventory metrics broken down by location
                </CardDescription>
              </div>
              <LocationFilter
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                placeholder='All locations'
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLocationData ? (
              <div className='flex items-center justify-center py-8'>
                <HappBarLoader
                  className='p-16'
                  text='Loading location data...'
                />
              </div>
            ) : selectedLocationId ? (
              // Single location view
              (() => {
                const locationStat = getSelectedLocationStats()
                if (!locationStat) return <div>Location not found</div>

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
              })()
            ) : (
              // All locations overview
              <div className='space-y-6'>
                <div className='grid gap-4'>
                  {locationStats.map((stat) => (
                    <Card
                      key={stat.location.id}
                      className='cursor-pointer hover:bg-accent/5'
                      onClick={() => setSelectedLocationId(stat.location.id)}
                    >
                      <CardContent className='px-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <MapPin className='size-5 text-muted-foreground' />
                            <div>
                              <h4 className='font-semibold'>
                                {stat.location.name}
                              </h4>
                              <p className='text-sm text-muted-foreground'>
                                {stat.location.type} • {stat.totalItems} items
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-6'>
                            <div className='text-right'>
                              <div className='text-sm font-medium'>
                                $
                                {stat.totalValue.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                Total Value
                              </div>
                            </div>

                            <div className='text-right'>
                              <div className='text-sm font-medium text-orange-600'>
                                {stat.lowStockItems}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                Low Stock
                              </div>
                            </div>

                            <div className='text-right min-w-[80px]'>
                              <div className='text-sm font-medium text-green-600'>
                                {stat.stockHealth.toFixed(0)}%
                              </div>
                              <Progress
                                value={stat.stockHealth}
                                className='mt-1 w-16'
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {locationStats.length === 0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    <MapPin className='h-12 w-12 mx-auto mb-4' />
                    <h3 className='text-lg font-medium mb-2'>
                      No locations found
                    </h3>
                    <p>Create your first location to see inventory data</p>
                    <Button asChild className='mt-4'>
                      <Link href='/dashboard/settings#manageLocations' scroll>
                        <MapPin className='mr-2 size-4' />
                        Manage Locations
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
                          {stats.recentCounts[0]?.itemsCount || 0}
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
                              by {count.user}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='text-sm font-medium capitalize'>
                              {count.status.toLowerCase()}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {count.itemsCount} items
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
            <AlertSummaryCard locationId={selectedLocationId} />

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
