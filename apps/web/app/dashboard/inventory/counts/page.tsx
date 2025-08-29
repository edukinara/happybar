'use client'

import { HappBarLoader } from '@/components/HappyBarLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventoryApi } from '@/lib/api/inventory'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import {
  CountType,
  InventoryCountStatus,
  type InventoryCountType,
} from '@happy-bar/types'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardCheck,
  MapPin,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function InventoryCountsPage() {
  const [counts, setCounts] = useState<InventoryCountType[]>([])
  const [totalCounts, setTotalCounts] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [locations, setLocations] = useState<LocationsResponse>([])

  const fetchInventoryCounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await inventoryApi.getInventoryCounts()
      setCounts(data.counts)
      setTotalCounts(data.total)
    } catch (err) {
      console.error('Failed to fetch inventory counts:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch inventory counts'
      )
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const data = await locationsApi.getLocations()
      setLocations(data)
    } catch (_error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryCounts()
    fetchLocations()
  }, [])

  const getStatusColor = (status: InventoryCountStatus) => {
    switch (status) {
      case InventoryCountStatus.DRAFT:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      case InventoryCountStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case InventoryCountStatus.COMPLETED:
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case InventoryCountStatus.APPROVED:
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCountTypeIcon = (type: CountType) => {
    switch (type) {
      case CountType.FULL:
        return <ClipboardCheck className='size-4' />
      case CountType.SPOT:
        return <BarChart3 className='size-4' />
      case CountType.CYCLE:
        return <Calendar className='size-4' />
      default:
        return <ClipboardCheck className='size-4' />
    }
  }

  const getCountTypeLabel = (type: CountType) => {
    switch (type) {
      case CountType.FULL:
        return 'Full Count'
      case CountType.SPOT:
        return 'Spot Check'
      case CountType.CYCLE:
        return 'Cycle Count'
      default:
        return type
    }
  }

  const inProgressCounts = counts.filter(
    (count) => count.status === InventoryCountStatus.IN_PROGRESS
  )
  const completedCounts = counts.filter(
    (count) =>
      count.status === InventoryCountStatus.COMPLETED ||
      count.status === InventoryCountStatus.APPROVED
  )

  // Calculate average variance from completed counts with items
  const calculateVariancePercentage = (count: InventoryCountType): number => {
    if (!count.areas || count.areas.length === 0) return 0

    const allItems = count.areas.flatMap((area) => area.items || [])
    if (allItems.length === 0) return 0

    let totalVarianceValue = 0
    let totalExpectedValue = 0

    allItems.forEach((item) => {
      if (
        item.expectedQty &&
        item.expectedQty > 0 &&
        item.variance !== undefined
      ) {
        const expectedValue = item.expectedQty * (item.unitCost || 0)
        const varianceValue = Math.abs(item.variance) * (item.unitCost || 0)

        totalExpectedValue += expectedValue
        totalVarianceValue += varianceValue
      }
    })

    return totalExpectedValue > 0
      ? (totalVarianceValue / totalExpectedValue) * 100
      : 0
  }

  const avgVariance =
    completedCounts.length > 0
      ? completedCounts.reduce(
          (sum, count) => sum + calculateVariancePercentage(count),
          0
        ) / completedCounts.length
      : 0

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
            Failed to load inventory counts
          </h2>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchInventoryCounts}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Quick Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Counts</CardTitle>
            <ClipboardCheck className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalCounts}</div>
            <p className='text-xs text-muted-foreground'>All time counts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>In Progress</CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{inProgressCounts.length}</div>
            <p className='text-xs text-muted-foreground'>Active counts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Completed</CardTitle>
            <Calendar className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{completedCounts.length}</div>
            <p className='text-xs text-muted-foreground'>Finished counts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Avg Variance</CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {avgVariance > 0 ? `${avgVariance.toFixed(1)}%` : 'N/A'}
            </div>
            <p className='text-xs text-muted-foreground'>
              From completed counts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-full sm:w-48'>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value={InventoryCountStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={InventoryCountStatus.IN_PROGRESS}>
              In Progress
            </SelectItem>
            <SelectItem value={InventoryCountStatus.COMPLETED}>
              Completed
            </SelectItem>
            <SelectItem value={InventoryCountStatus.APPROVED}>
              Approved
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className='w-full sm:w-48'>
            <SelectValue placeholder='Filter by location' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem value={location.id} key={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Counts List */}
      <div className='grid gap-4'>
        {loading ? (
          <div className='flex justify-center py-8'>
            <div className='animate-spin rounded-full size-8 border-b-2 border-primary'></div>
          </div>
        ) : counts.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <ClipboardCheck className='h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No inventory counts yet
              </h3>
              <p className='text-muted-foreground text-center mb-4'>
                Get started by creating your first inventory count
              </p>
              <Button asChild>
                <Link href='/dashboard/inventory/counts/new'>
                  <Plus className='size-4 mr-2' />
                  New Count
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          counts
            .filter((count) => {
              if (statusFilter === 'all') return true
              return count.status === statusFilter
            })
            .filter((count) => {
              if (locationFilter === 'all') return true
              return count.location?.id === locationFilter
            })
            .map((count) => (
              <Card
                key={count.id}
                className='hover:shadow-md transition-shadow'
              >
                <CardContent className='p-6'>
                  <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        {getCountTypeIcon(count.type)}
                        <Link
                          href={`/dashboard/inventory/counts/${count.id}`}
                          className='text-lg font-semibold hover:text-primary transition-colors'
                        >
                          {count.name}
                        </Link>
                        <Badge
                          variant='secondary'
                          className={getStatusColor(count.status)}
                        >
                          {count.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                          <MapPin className='size-4' />
                          {count.location?.name}
                        </div>
                        <div className='flex items-center gap-1'>
                          <Calendar className='size-4' />
                          Started{' '}
                          {formatDistanceToNow(new Date(count.startedAt), {
                            addSuffix: true,
                          })}
                        </div>
                        <div className='flex items-center gap-1'>
                          <ClipboardCheck className='size-4' />
                          {getCountTypeLabel(count.type)}
                        </div>
                      </div>

                      {count.areas && (
                        <div className='mt-3'>
                          <div className='text-sm text-muted-foreground'>
                            Progress:{' '}
                            {
                              count.areas.filter(
                                (a) => a.status === 'COMPLETED'
                              ).length
                            }{' '}
                            of {count.areas.length} areas completed
                          </div>
                          <div className='w-full bg-muted rounded-full h-2 mt-1'>
                            <div
                              className='bg-primary h-2 rounded-full transition-all'
                              style={{
                                width: `${(count.areas.filter((a) => a.status === 'COMPLETED').length / count.areas.length) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className='flex flex-col lg:items-end gap-2'>
                      <div className='text-right'>
                        <div className='text-lg font-semibold'>
                          $
                          {count.totalValue.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {count.itemsCounted} items
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            href={`/dashboard/inventory/counts/${count.id}`}
                          >
                            View
                          </Link>
                        </Button>
                        {count.status === InventoryCountStatus.DRAFT && (
                          <Button size='sm' asChild>
                            <Link
                              href={`/dashboard/inventory/counts/${count.id}/count`}
                            >
                              Start Counting
                            </Link>
                          </Button>
                        )}
                        {count.status === InventoryCountStatus.IN_PROGRESS && (
                          <Button size='sm' asChild>
                            <Link
                              href={`/dashboard/inventory/counts/${count.id}/count`}
                            >
                              Continue
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  )
}
