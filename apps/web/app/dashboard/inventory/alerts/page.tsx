'use client'

import { LocationFilter } from '@/components/dashboard/LocationFilter'
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
import { alertsApi, type Alert, type AlertSummary } from '@/lib/api/alerts'
import { inventoryApi } from '@/lib/api/inventory'
import type { InventoryLevel } from '@happy-bar/types'
import {
  AlertTriangle,
  Bell,
  Eye,
  Package,
  RefreshCw,
  Settings,
  TrendingDown,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import pluralize from 'pluralize'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function InventoryAlertsPage() {
  const [lowStockItems, setLowStockItems] = useState<InventoryLevel[]>([])
  const [varianceAlerts, setVarianceAlerts] = useState<Alert[]>([])
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >()
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedLocationId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [inventoryData, alertsData, summaryData] = await Promise.all([
        inventoryApi.getInventoryLevels(),
        alertsApi.getAlerts({ status: 'ACTIVE' }),
        alertsApi.getSummary(),
      ])

      // Filter for low stock items
      const lowStock = inventoryData.filter(
        (item) => item.currentQuantity < item.minimumQuantity
      )
      setLowStockItems(lowStock)
      setVarianceAlerts(alertsData.alerts)
      setAlertSummary(summaryData)
    } catch (error) {
      console.error('Failed to load alerts data:', error)
      toast.error('Failed to load alerts data')
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateVarianceAlerts = async () => {
    try {
      setEvaluating(true)
      const result = await alertsApi.evaluateAlerts()
      toast.success('Variance alerts evaluated', {
        description: result.message,
      })
      await loadData()
    } catch (_error) {
      toast.error('Failed to evaluate variance alerts')
    } finally {
      setEvaluating(false)
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await alertsApi.acknowledgeAlert(alertId)
      toast.success('Alert acknowledged')
      await loadData()
    } catch (_error) {
      toast.error('Failed to acknowledge alert')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'MEDIUM':
        return 'bg-yellow-500 text-white'
      case 'LOW':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStockLevelSeverity = (item: InventoryLevel) => {
    if (item.currentQuantity <= 0) return 'CRITICAL'
    if (item.currentQuantity < item.minimumQuantity * 0.5) return 'HIGH'
    if (item.currentQuantity < item.minimumQuantity * 0.8) return 'MEDIUM'
    return 'LOW'
  }

  const outOfStockItems = lowStockItems.filter(
    (item) => item.currentQuantity <= 0
  )
  const criticalLowStock = lowStockItems.filter(
    (item) =>
      item.currentQuantity > 0 &&
      item.currentQuantity < item.minimumQuantity * 0.5
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappyBarLoader text='Loading alerts...' />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with location filter */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Inventory Alerts</h2>
          <p className='text-muted-foreground'>
            Monitor low stock levels and variance notifications
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <LocationFilter
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            placeholder='All locations'
          />
          <Button asChild variant='outline'>
            <Link href='/dashboard/settings'>
              <Settings className='size-4 mr-2' />
              Configure
            </Link>
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Out of Stock</CardTitle>
            <AlertTriangle className='size-4 text-red-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {outOfStockItems.length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Items with 0 quantity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Critical Low Stock
            </CardTitle>
            <TrendingDown className='size-4 text-orange-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {criticalLowStock.length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Below 50% of par level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Variance Alerts
            </CardTitle>
            <Zap className='size-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {alertSummary?.activeAlerts || 0}
            </div>
            <p className='text-xs text-muted-foreground'>
              Usage variance issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Alerts</CardTitle>
            <Bell className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {lowStockItems.length + (alertSummary?.activeAlerts || 0)}
            </div>
            <p className='text-xs text-muted-foreground'>Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Tabs */}
      <Tabs defaultValue='low-stock' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='low-stock' className='flex items-center gap-2'>
            <Package className='size-4' />
            Low Stock ({lowStockItems.length})
          </TabsTrigger>
          <TabsTrigger value='variance' className='flex items-center gap-2'>
            <Zap className='size-4' />
            Variance Alerts ({alertSummary?.activeAlerts || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='low-stock' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>
                Items below their minimum quantity thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <h3 className='text-lg font-medium mb-2'>
                    No Low Stock Items
                  </h3>
                  <p className='text-sm'>
                    All items are above their minimum quantity levels.
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {lowStockItems.map((item) => {
                    const needed = Math.max(
                      0,
                      item.minimumQuantity - item.currentQuantity
                    )
                    const severity = getStockLevelSeverity(item)
                    const unit = item.product.container || 'unit'
                    return (
                      <div
                        key={`${item.productId}-${item.locationId}`}
                        className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50'
                      >
                        <div className='flex items-center gap-3'>
                          <Package className='size-5 text-muted-foreground' />
                          <div>
                            <div className='flex items-center gap-2 mb-1'>
                              <Badge className={getSeverityColor(severity)}>
                                {severity}
                              </Badge>
                              <span className='font-medium'>
                                {item.product.name}
                              </span>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {item.location?.name} • Current:{' '}
                              {+item.currentQuantity.toFixed(2)} • Min:{' '}
                              {+item.minimumQuantity.toFixed(2)}{' '}
                              {item.minimumQuantity > 1
                                ? pluralize(unit)
                                : unit}
                            </div>
                            {item.currentQuantity <= 0 && (
                              <div className='text-sm font-medium text-red-600 mt-1'>
                                ⚠️ OUT OF STOCK
                              </div>
                            )}
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm font-semibold'>
                            Need: {+needed.toFixed(2)}{' '}
                            {needed > 1 ? pluralize(unit) : unit}
                          </div>
                          <Button size='sm' variant='outline' asChild>
                            <Link
                              href={`/dashboard/inventory?product=${item.productId}&location=${item.locationId}`}
                            >
                              <Eye className='size-4 mr-1' />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='variance' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Variance Alerts</CardTitle>
                  <CardDescription>
                    Automated alerts for usage variance and efficiency issues
                  </CardDescription>
                </div>
                <Button
                  variant='outline'
                  onClick={handleEvaluateVarianceAlerts}
                  disabled={evaluating}
                >
                  {evaluating ? (
                    <RefreshCw className='size-4 mr-2 animate-spin' />
                  ) : (
                    <RefreshCw className='size-4 mr-2' />
                  )}
                  Re-evaluate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {varianceAlerts.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Zap className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <h3 className='text-lg font-medium mb-2'>
                    No Variance Alerts
                  </h3>
                  <p className='text-sm mb-4'>
                    No variance issues detected in your usage analysis.
                  </p>
                  <Button
                    variant='outline'
                    onClick={handleEvaluateVarianceAlerts}
                    disabled={evaluating}
                  >
                    {evaluating ? (
                      <RefreshCw className='size-4 mr-2 animate-spin' />
                    ) : (
                      <RefreshCw className='size-4 mr-2' />
                    )}
                    Check for Issues
                  </Button>
                </div>
              ) : (
                <div className='space-y-3'>
                  {varianceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50'
                    >
                      <div className='flex items-center gap-3'>
                        <Zap className='size-5 text-orange-500' />
                        <div>
                          <div className='flex items-center gap-2 mb-1'>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className='font-medium'>{alert.title}</span>
                          </div>
                          <div className='text-sm text-muted-foreground mb-1'>
                            {alert.message}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            Created{' '}
                            {new Date(alert.createdAt).toLocaleDateString()} •
                            Status: {alert.status}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {alert.status === 'ACTIVE' && (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button size='sm' variant='outline' asChild>
                          <Link href='/dashboard/alerts'>
                            <Eye className='size-4 mr-1' />
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
