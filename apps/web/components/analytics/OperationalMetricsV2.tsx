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
import {
  analyticsApi,
  type InventoryAnalyticsResponse,
} from '@/lib/api/analytics'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Target,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface OperationalMetricsProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function OperationalMetricsV2({
  locationId,
  dateRange,
}: OperationalMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventoryAnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = { locationId }
        const response = await analyticsApi.getInventoryAnalytics(params)
        setData(response)
      } catch (error) {
        console.warn('Failed to load operational metrics:', error)
        setError('Failed to load operational metrics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locationId, dateRange])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <RefreshCw className='h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground' />
          <h2 className='text-xl font-semibold mb-2'>
            Loading Operational Metrics
          </h2>
          <p className='text-muted-foreground'>
            Analyzing operational performance...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-center'>
            <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-red-500' />
            <h2 className='text-xl font-semibold mb-2'>Error Loading Data</h2>
            <p className='text-muted-foreground mb-4'>{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className='mr-2 size-4' />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className='space-y-6'>
      {/* Key Performance Indicators */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Inventory Value
            </CardTitle>
            <DollarSign className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.totalValue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.inventoryData.totalItems} total items
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Turnover Rate</CardTitle>
            <Activity className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.turnoverRate.toFixed(1)}x
            </div>
            <p className='text-xs text-muted-foreground'>
              Annual inventory turns
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Stock Accuracy
            </CardTitle>
            <Target className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.stockAccuracy.toFixed(1)}%
            </div>
            <Progress value={data.summary.stockAccuracy} className='mt-2 h-2' />
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Fill Rate</CardTitle>
            <CheckCircle className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.fillRate.toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              Orders fulfilled completely
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Health Overview */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <AlertTriangle className='size-5 text-red-500' />
              <span>Stock Issues</span>
            </CardTitle>
            <CardDescription>
              Items requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Stockouts</span>
                <Badge
                  variant='outline'
                  className='bg-red-100 text-red-800 border-red-200'
                >
                  {data.inventoryData.stockoutCount}
                </Badge>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Low Stock</span>
                <Badge
                  variant='outline'
                  className='bg-orange-100 text-orange-800 border-orange-200'
                >
                  {data.inventoryData.lowStockCount}
                </Badge>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Overstocked</span>
                <Badge
                  variant='outline'
                  className='bg-yellow-100 text-yellow-800 border-yellow-200'
                >
                  {data.inventoryData.overstockedCount}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <BarChart3 className='size-5 text-blue-500' />
              <span>Efficiency Metrics</span>
            </CardTitle>
            <CardDescription>
              Operational performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Carrying Cost</span>
                  <span className='text-sm font-bold'>
                    {data.summary.carryingCostPercent.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={data.summary.carryingCostPercent}
                  className='h-2'
                />
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Inventory Accuracy</span>
                  <span className='text-sm font-bold'>
                    {data.summary.stockAccuracy.toFixed(1)}%
                  </span>
                </div>
                <Progress value={data.summary.stockAccuracy} className='h-2' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <DollarSign className='size-5 text-green-500' />
              <span>Financial Impact</span>
            </CardTitle>
            <CardDescription>Cost optimization opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div>
                <div className='text-sm text-muted-foreground'>
                  Excess Inventory
                </div>
                <div className='text-xl font-bold'>
                  {formatCurrency(data.summary.excessInventory)}
                </div>
              </div>
              <div>
                <div className='text-sm text-muted-foreground'>
                  Annual Carrying Cost
                </div>
                <div className='text-xl font-bold'>
                  {formatCurrency(
                    data.summary.totalValue *
                      (data.summary.carryingCostPercent / 100)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>
            Items that need immediate restocking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {data.inventoryData.lowStockItems.length > 0 ? (
              data.inventoryData.lowStockItems.map((item) => (
                <div
                  key={item.productId}
                  className='flex items-center justify-between p-3 border rounded-lg'
                >
                  <div className='space-y-1'>
                    <div className='font-medium'>{item.productName}</div>
                    <div className='text-sm text-muted-foreground'>
                      {item.location} • Min: {item.minimumStock}
                    </div>
                  </div>
                  <div className='flex flex-row space-x-2'>
                    <div className='flex flex-col text-right gap-2 leading-0'>
                      <div className='font-bold text-md'>
                        {+item.currentStock.toFixed(1)}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        current
                      </div>
                    </div>
                    <div className='w-[80px]'>
                      <Badge
                        variant='outline'
                        className={getUrgencyColor(item.urgency)}
                      >
                        {item.urgency}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-8'>
                <CheckCircle className='h-12 w-12 mx-auto mb-4 text-green-500' />
                <h3 className='text-lg font-semibold mb-2'>
                  All Items Well Stocked
                </h3>
                <p className='text-muted-foreground'>
                  No items are currently below minimum stock levels.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Slow Moving Items */}
      <Card>
        <CardHeader>
          <CardTitle>Slow Moving Inventory</CardTitle>
          <CardDescription>
            Items with excessive stock levels or long inventory cycles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {data.inventoryData.slowMovingItems.length > 0 ? (
              data.inventoryData.slowMovingItems.map((item) => (
                <div
                  key={item.productId}
                  className='flex items-center justify-between p-3 border rounded-lg'
                >
                  <div className='space-y-1'>
                    <div className='font-medium'>{item.productName}</div>
                    <div className='text-sm text-muted-foreground'>
                      {item.daysOnHand} days on hand
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-bold'>
                      {formatCurrency(item.value)}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {item.currentStock} units
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-8'>
                <Activity className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                <h3 className='text-lg font-semibold mb-2'>
                  No Slow Moving Items
                </h3>
                <p className='text-muted-foreground'>
                  All inventory items are moving at optimal rates.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Recommendations</CardTitle>
          <CardDescription>
            Actions to improve operational efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='p-4 border rounded-lg bg-blue-50 border-blue-200'>
              <div className='flex items-start space-x-3'>
                <Target className='size-5 text-blue-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-blue-900'>
                    Optimize Reorder Points
                  </h4>
                  <p className='text-sm text-blue-700 mt-1'>
                    Review minimum stock levels for items with frequent
                    stockouts to improve fill rates.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg bg-green-50 border-green-200'>
              <div className='flex items-start space-x-3'>
                <CheckCircle className='size-5 text-green-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-green-900'>
                    Reduce Excess Inventory
                  </h4>
                  <p className='text-sm text-green-700 mt-1'>
                    Focus on moving slow-moving items through promotions or
                    recipe modifications.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg bg-yellow-50 border-yellow-200'>
              <div className='flex items-start space-x-3'>
                <Clock className='size-5 text-yellow-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-yellow-900'>
                    Improve Turnover
                  </h4>
                  <p className='text-sm text-yellow-700 mt-1'>
                    Implement more frequent ordering cycles for high-volume
                    items to reduce carrying costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
