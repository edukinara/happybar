'use client'

import { UsageAlertsIntegration } from '@/components/alerts/UsageAlertsIntegration'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryApi, type UsageAnalysisResponse } from '@/lib/api/inventory'
import type { StockMovement } from '@happy-bar/types'
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Download,
  FileText,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface VarianceAnalysis {
  summary: {
    totalVariance: number
    totalVariancePercent: number
    totalCostImpact: number
    itemsWithVariance: number
    totalItemsCounted: number
  }
  variancesByLocation: Array<{
    locationId: string
    locationName: string
    totalVariance: number
    costImpact: number
    itemCount: number
  }>
  variancesByProduct: Array<{
    productId: string
    productName: string
    totalVariance: number
    costImpact: number
    countFrequency: number
  }>
}

interface InventoryValuation {
  summary: {
    totalValue: number
    totalItems: number
    averageTurnover: number
    slowMovingItems: number
  }
  valueByCategory: Array<{
    categoryId: string
    categoryName: string
    totalValue: number
    itemCount: number
    turnoverRate: number
  }>
  valueByLocation: Array<{
    locationId: string
    locationName: string
    totalValue: number
    itemCount: number
    averageAge: number
  }>
}

interface MovementHistory {
  movements: StockMovement[]
  summary: {
    totalMovements: number
    transferCount: number
    adjustmentCount: number
    totalValue: number
  }
  movementsByType: Array<{
    type: string
    count: number
    totalQuantity: number
    totalValue: number
  }>
}

interface CountSummary {
  summary: {
    totalCounts: number
    completedCounts: number
    averageVariance: number
    totalCostImpact: number
  }
  countsByLocation: Array<{
    locationId: string
    locationName: string
    countFrequency: number
    averageVariance: number
    lastCountDate: string
  }>
  recentCounts: Array<{
    id: string
    name: string
    locationName: string
    completedAt: string
    totalItems: number
    varianceCount: number
    costImpact: number
  }>
}

export default function InventoryReportsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLocationId, setSelectedLocationId] = useState<string>()
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // Report data states
  const [varianceData, setVarianceData] = useState<VarianceAnalysis | null>(
    null
  )
  const [valuationData, setValuationData] = useState<InventoryValuation | null>(
    null
  )
  const [movementData, setMovementData] = useState<MovementHistory | null>(null)
  const [countData, setCountData] = useState<CountSummary | null>(null)
  const [usageData, setUsageData] = useState<UsageAnalysisResponse | null>(null)

  useEffect(() => {
    fetchReportData()
  }, [selectedLocationId, dateRange.start, dateRange.end])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Fetch real data from API endpoints
      const [
        varianceResponse,
        valuationResponse,
        movementResponse,
        countResponse,
        usageResponse,
      ] = await Promise.all([
        inventoryApi
          .getVarianceAnalysis({
            startDate: dateRange.start,
            endDate: dateRange.end,
            locationId: selectedLocationId,
          })
          .catch(() => null), // Handle potential 404/500 errors gracefully
        inventoryApi
          .getInventoryValuation(selectedLocationId)
          .catch(() => null),
        inventoryApi
          .getMovementHistory({
            startDate: dateRange.start,
            endDate: dateRange.end,
            locationId: selectedLocationId,
          })
          .catch(() => null),
        inventoryApi
          .getCountSummary({
            startDate: dateRange.start,
            endDate: dateRange.end,
            locationId: selectedLocationId,
          })
          .catch(() => null),
        inventoryApi
          .getUsageAnalysis({
            startDate: dateRange.start,
            endDate: dateRange.end,
            locationId: selectedLocationId,
          })
          .catch(() => null),
      ])

      setVarianceData(varianceResponse)
      setValuationData(valuationResponse)
      setMovementData(movementResponse)
      setCountData(countResponse)
      setUsageData(usageResponse)
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappBarLoader />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Inventory Reports & Analytics
          </h1>
          <p className='text-muted-foreground'>
            Comprehensive insights into inventory performance, variance
            analysis, and trends.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='flex flex-col gap-1 py-1'>
              <Label>Start Date</Label>
              <Input
                type='date'
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
            </div>
            <div className='flex flex-col gap-1 py-1'>
              <Label>End Date</Label>
              <Input
                type='date'
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>
            <div className='flex flex-col gap-1 py-1'>
              <Label>Location</Label>
              <LocationFilter
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                placeholder='All Locations'
              />
            </div>
            <div className='flex items-end py-1'>
              <Button onClick={fetchReportData} className='w-full'>
                <FileText className='mr-2 h-4 w-4' />
                Refresh Reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-4'
      >
        <TabsList className='grid w-full grid-cols-5'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='usage'>Usage Analysis</TabsTrigger>
          <TabsTrigger value='variance'>Variance Analysis</TabsTrigger>
          <TabsTrigger value='valuation'>Inventory Valuation</TabsTrigger>
          <TabsTrigger value='movements'>Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          {/* Overview Stats */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Inventory Value
                </CardTitle>
                <DollarSign className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  $
                  {valuationData?.summary.totalValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }) || '0'}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Across {valuationData?.summary.totalItems || 0} items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Average Variance
                </CardTitle>
                <TrendingUp className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {varianceData?.summary.totalVariancePercent.toFixed(1) || '0'}
                  %
                </div>
                <p className='text-xs text-muted-foreground'>
                  {varianceData?.summary.itemsWithVariance || 0} items with
                  variance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Movements
                </CardTitle>
                <Package className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {movementData?.summary.totalMovements || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {movementData?.summary.transferCount || 0} transfers,{' '}
                  {movementData?.summary.adjustmentCount || 0} adjustments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Completed Counts
                </CardTitle>
                <Users className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {countData?.summary.completedCounts || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  of {countData?.summary.totalCounts || 0} total counts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Top Variance Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {varianceData?.variancesByLocation
                    .slice(0, 3)
                    .map((location, _index) => (
                      <div
                        key={location.locationId}
                        className='flex items-center justify-between'
                      >
                        <div>
                          <div className='font-medium'>
                            {location.locationName}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {location.itemCount} items
                          </div>
                        </div>
                        <div
                          className={`text-right ${location.costImpact < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          <div className='font-bold'>
                            ${Math.abs(location.costImpact).toFixed(2)}
                          </div>
                          <div className='text-sm'>
                            {location.totalVariance > 0 ? '+' : ''}
                            {location.totalVariance.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )) || []}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Count Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {countData?.recentCounts.slice(0, 3).map((count) => (
                    <div
                      key={count.id}
                      className='flex items-center justify-between'
                    >
                      <div>
                        <div className='font-medium'>{count.name}</div>
                        <div className='text-sm text-muted-foreground'>
                          {count.locationName} •{' '}
                          {new Date(count.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold'>
                          {count.totalItems} items
                        </div>
                        <div
                          className={`text-sm ${count.costImpact < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          ${Math.abs(count.costImpact).toFixed(2)} impact
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='usage' className='space-y-4'>
          {/* Variance Alerts Integration */}
          <UsageAlertsIntegration
            usageData={usageData || undefined}
            onEvaluateAlerts={fetchReportData}
          />

          {/* Usage Summary */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Overall Efficiency
                </CardTitle>
                <BarChart3 className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(usageData?.summary.overallEfficiency || 0) >= 85 ? 'text-green-600' : (usageData?.summary.overallEfficiency || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {usageData?.summary.overallEfficiency.toFixed(1) || '0'}%
                </div>
                <p className='text-xs text-muted-foreground'>
                  Theoretical vs Actual Usage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Cost Impact
                </CardTitle>
                {(usageData?.summary.totalCostImpact || 0) >= 0 ? (
                  <TrendingUp className='h-4 w-4 text-green-600' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-600' />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(usageData?.summary.totalCostImpact || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  $
                  {Math.abs(usageData?.summary.totalCostImpact || 0).toFixed(2)}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {(usageData?.summary.totalCostImpact || 0) >= 0
                    ? 'Savings'
                    : 'Loss'}{' '}
                  from variances
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Products Analyzed
                </CardTitle>
                <Package className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {usageData?.summary.productsAnalyzed || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {usageData?.summary.significantVariances || 0} with
                  significant variance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Usage Variance
                </CardTitle>
                <AlertTriangle className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(usageData?.summary.totalVariance || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {usageData?.summary.totalVariance &&
                  usageData.summary.totalVariance > 0
                    ? '+'
                    : ''}
                  {usageData?.summary.totalVariance.toFixed(1) || '0'}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Actual vs Expected Usage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Issues */}
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Top Wasters (Low Efficiency)</CardTitle>
                <CardDescription>
                  Products with poor efficiency that may indicate over-pouring,
                  spillage, or theft
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {usageData?.topWasters.slice(0, 5).map((item) => (
                    <div
                      key={item.productId}
                      className='flex items-center justify-between'
                    >
                      <div>
                        <div className='font-medium'>{item.productName}</div>
                        <div className='text-sm text-muted-foreground'>
                          {item.efficiency.toFixed(1)}% efficiency
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-red-600'>
                          ${Math.abs(item.costImpact).toFixed(2)} loss
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Overusers</CardTitle>
                <CardDescription>
                  Products being used more than sales indicate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {usageData?.topOverusers.slice(0, 5).map((item) => (
                    <div
                      key={item.productId}
                      className='flex items-center justify-between'
                    >
                      <div>
                        <div className='font-medium'>{item.productName}</div>
                        <div className='text-sm text-muted-foreground'>
                          +{item.variancePercent.toFixed(1)}% variance
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-red-600'>
                          ${Math.abs(item.costImpact).toFixed(2)} impact
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Usage Analysis</CardTitle>
              <CardDescription>
                Complete breakdown of theoretical vs actual usage by product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Theoretical</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Efficiency</TableHead>
                    <TableHead>Cost Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData?.productAnalysis.slice(0, 10).map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className='font-medium'>
                        {product.productName}
                        <div className='text-sm text-muted-foreground'>
                          {product.salesCount} sales • {product.countEvents}{' '}
                          counts
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.theoreticalQuantity.toFixed(1)}
                      </TableCell>
                      <TableCell>{product.actualQuantity.toFixed(1)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            product.variance >= 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {product.variance > 0 ? '+' : ''}
                          {product.variance.toFixed(1)} (
                          {product.variancePercent.toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            product.efficiency >= 85
                              ? 'text-green-600'
                              : product.efficiency >= 70
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }
                        >
                          {product.efficiency.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            product.costImpact >= 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          ${Math.abs(product.costImpact).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='variance' className='space-y-4'>
          {/* Variance Summary */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Cost Impact
                </CardTitle>
                {(varianceData?.summary.totalCostImpact || 0) >= 0 ? (
                  <TrendingUp className='h-4 w-4 text-green-600' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-600' />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(varianceData?.summary.totalCostImpact || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  $
                  {Math.abs(varianceData?.summary.totalCostImpact || 0).toFixed(
                    2
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {(varianceData?.summary.totalCostImpact || 0) >= 0
                    ? 'Net gain'
                    : 'Net loss'}{' '}
                  from variances
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Variance Rate
                </CardTitle>
                <AlertTriangle className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {varianceData?.summary.totalVariancePercent.toFixed(1) || '0'}
                  %
                </div>
                <p className='text-xs text-muted-foreground'>
                  {varianceData?.summary.itemsWithVariance || 0} of{' '}
                  {varianceData?.summary.totalItemsCounted || 0} items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Items with Variance
                </CardTitle>
                <Package className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {varianceData?.summary.itemsWithVariance || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {(
                    ((varianceData?.summary.itemsWithVariance || 0) /
                      (varianceData?.summary.totalItemsCounted || 1)) *
                    100
                  ).toFixed(1)}
                  % of total items
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Variance by Location */}
          <Card>
            <CardHeader>
              <CardTitle>Variance by Location</CardTitle>
              <CardDescription>
                Compare variance performance across different locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Items Counted</TableHead>
                    <TableHead>Total Variance</TableHead>
                    <TableHead>Cost Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceData?.variancesByLocation.map((location) => (
                    <TableRow key={location.locationId}>
                      <TableCell className='font-medium'>
                        {location.locationName}
                      </TableCell>
                      <TableCell>{location.itemCount}</TableCell>
                      <TableCell>
                        <span
                          className={
                            location.totalVariance >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {location.totalVariance > 0 ? '+' : ''}
                          {location.totalVariance.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            location.costImpact >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          ${Math.abs(location.costImpact).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Variance Products */}
          <Card>
            <CardHeader>
              <CardTitle>Products with Highest Variance</CardTitle>
              <CardDescription>
                Products requiring attention due to consistent variance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Count Frequency</TableHead>
                    <TableHead>Total Variance</TableHead>
                    <TableHead>Cost Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceData?.variancesByProduct.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className='font-medium'>
                        {product.productName}
                      </TableCell>
                      <TableCell>{product.countFrequency} counts</TableCell>
                      <TableCell>
                        <span
                          className={
                            product.totalVariance >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {product.totalVariance > 0 ? '+' : ''}
                          {product.totalVariance.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            product.costImpact >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          ${Math.abs(product.costImpact).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='valuation' className='space-y-4'>
          {/* Valuation Summary */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Inventory Value
                </CardTitle>
                <DollarSign className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  $
                  {valuationData?.summary.totalValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }) || '0'}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {valuationData?.summary.totalItems || 0} total items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Average Turnover
                </CardTitle>
                <TrendingUp className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {valuationData?.summary.averageTurnover.toFixed(1) || '0'}x
                </div>
                <p className='text-xs text-muted-foreground'>
                  Per year average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Slow Moving Items
                </CardTitle>
                <AlertTriangle className='h-4 w-4 text-orange-500' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-orange-600'>
                  {valuationData?.summary.slowMovingItems || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Items needing attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Value by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value by Category</CardTitle>
              <CardDescription>
                Breakdown of inventory value and turnover by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Item Count</TableHead>
                    <TableHead>Turnover Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationData?.valueByCategory.map((category) => (
                    <TableRow key={category.categoryId}>
                      <TableCell className='font-medium'>
                        {category.categoryName}
                      </TableCell>
                      <TableCell>
                        $
                        {category.totalValue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{category.itemCount} items</TableCell>
                      <TableCell>
                        <span
                          className={
                            category.turnoverRate >= 6
                              ? 'text-green-600'
                              : category.turnoverRate >= 3
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }
                        >
                          {category.turnoverRate.toFixed(1)}x
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Value by Location */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value by Location</CardTitle>
              <CardDescription>
                Distribution of inventory value across locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Item Count</TableHead>
                    <TableHead>Average Age (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationData?.valueByLocation.map((location) => (
                    <TableRow key={location.locationId}>
                      <TableCell className='font-medium'>
                        {location.locationName}
                      </TableCell>
                      <TableCell>
                        $
                        {location.totalValue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{location.itemCount} items</TableCell>
                      <TableCell>
                        <span
                          className={
                            location.averageAge <= 15
                              ? 'text-green-600'
                              : location.averageAge <= 30
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }
                        >
                          {location.averageAge.toFixed(0)} days
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='movements' className='space-y-4'>
          {/* Movement Summary */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Movements
                </CardTitle>
                <Package className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {movementData?.summary.totalMovements || 0}
                </div>
                <p className='text-xs text-muted-foreground'>
                  In selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Movement Value
                </CardTitle>
                <DollarSign className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  $
                  {movementData?.summary.totalValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }) || '0'}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Total movement value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Transfers vs Adjustments
                </CardTitle>
                <BarChart3 className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {movementData
                    ? Math.round(
                        (movementData.summary.transferCount /
                          movementData.summary.totalMovements) *
                          100
                      ) || 0
                    : 0}
                  %
                </div>
                <p className='text-xs text-muted-foreground'>
                  {movementData?.summary.transferCount || 0} transfers,{' '}
                  {movementData?.summary.adjustmentCount || 0} adjustments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Movement by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Movement Breakdown by Type</CardTitle>
              <CardDescription>
                Analysis of different movement types and their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementData?.movementsByType.map((movement) => (
                    <TableRow key={movement.type}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center space-x-2'>
                          {movement.type === 'TRANSFER' && (
                            <Package className='h-4 w-4 text-blue-600' />
                          )}
                          {movement.type === 'ADJUSTMENT_IN' && (
                            <TrendingUp className='h-4 w-4 text-green-600' />
                          )}
                          {movement.type === 'ADJUSTMENT_OUT' && (
                            <TrendingDown className='h-4 w-4 text-red-600' />
                          )}
                          <span className='capitalize'>
                            {movement.type.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{movement.count}</TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.totalQuantity >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {movement.totalQuantity > 0 ? '+' : ''}
                          {movement.totalQuantity.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.totalValue >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          ${Math.abs(movement.totalValue).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Reports</CardTitle>
              <CardDescription>
                Download detailed reports for further analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-3 md:grid-cols-2'>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => toast.info('Export feature coming soon')}
                >
                  <Download className='h-4 w-4 mr-2' />
                  Export Variance Analysis (CSV)
                </Button>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => toast.info('Export feature coming soon')}
                >
                  <Download className='h-4 w-4 mr-2' />
                  Export Inventory Valuation (PDF)
                </Button>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => toast.info('Export feature coming soon')}
                >
                  <Download className='h-4 w-4 mr-2' />
                  Export Movement History (CSV)
                </Button>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => toast.info('Export feature coming soon')}
                >
                  <Download className='h-4 w-4 mr-2' />
                  Export Count Summary (PDF)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
