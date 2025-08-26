'use client'

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
  type PurchasingAnalyticsResponse,
} from '@/lib/api/analytics'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  RefreshCw,
  ShoppingCart,
  Target,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface PurchasingAnalyticsProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function PurchasingAnalyticsV2({
  locationId,
  dateRange,
}: PurchasingAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PurchasingAnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = {
          locationId,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }

        const response = await analyticsApi.getPurchasingAnalytics(params)
        setData(response)
      } catch (error) {
        console.warn('Failed to load purchasing analytics:', error)
        setError('Failed to load purchasing analytics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locationId, dateRange])

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
            Loading Purchasing Analytics
          </h2>
          <p className='text-muted-foreground'>Analyzing purchase data...</p>
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
              <RefreshCw className='mr-2 h-4 w-4' />
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
      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Spend</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.monthlySpend)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.purchasingData.orderCount} orders this period
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg Order Value
            </CardTitle>
            <ShoppingCart className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.purchasingData.avgOrderValue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.summary.avgOrdersPerWeek} orders/week
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Suppliers</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.supplierCount}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.summary.onTimeDeliveryRate.toFixed(1)}% on-time delivery
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Cost Savings</CardTitle>
            <Target className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.costSavingsOpportunity)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Optimization opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Suppliers</CardTitle>
          <CardDescription>
            Supplier performance and spend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.purchasingData.topSuppliers.map((supplier) => (
              <div key={supplier.supplierId} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <div className='font-medium'>{supplier.supplierName}</div>
                    <div className='text-sm text-muted-foreground'>
                      {supplier.orderCount} orders • Avg:{' '}
                      {formatCurrency(supplier.avgOrderValue)}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-bold'>
                      {formatCurrency(supplier.totalSpend)}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {supplier.spendPercentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <Progress value={supplier.spendPercentage} className='h-2' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spend by Category</CardTitle>
          <CardDescription>
            Distribution of purchases across product categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.purchasingData.categoryBreakdown
              .slice(0, 8)
              .map((category) => (
                <div key={category.category} className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>{category.category}</span>
                    <div className='text-right'>
                      <div className='font-bold'>
                        {formatCurrency(category.spend)}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {category.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={category.percentage} className='h-2' />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Dependency Analysis</CardTitle>
            <CardDescription>
              Risk assessment of supplier concentration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>
                    Top Supplier Dependency
                  </span>
                  <span className='text-sm font-bold'>
                    {data.summary.topSupplierDependency.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={data.summary.topSupplierDependency}
                  className='h-2'
                />
                <div className='text-xs text-muted-foreground'>
                  {data.summary.topSupplierDependency > 40
                    ? 'High dependency risk - consider diversification'
                    : 'Healthy supplier diversification'}
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>
                    On-Time Delivery Rate
                  </span>
                  <span className='text-sm font-bold'>
                    {data.summary.onTimeDeliveryRate.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={data.summary.onTimeDeliveryRate}
                  className='h-2'
                />
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Average Lead Time</span>
                  <span className='text-sm font-bold'>
                    {data.purchasingData.avgLeadTime.toFixed(1)} days
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Optimization Opportunities</CardTitle>
            <CardDescription>
              Identified areas for cost reduction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='p-4 border rounded-lg bg-green-50 border-green-200'>
                <div className='flex items-start space-x-3'>
                  <CheckCircle className='h-5 w-5 text-green-600 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-green-900'>
                      Supplier Consolidation
                    </h4>
                    <p className='text-sm text-green-700 mt-1'>
                      Potential savings:{' '}
                      {formatCurrency(
                        data.summary.costSavingsOpportunity * 0.4
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-4 border rounded-lg bg-blue-50 border-blue-200'>
                <div className='flex items-start space-x-3'>
                  <Target className='h-5 w-5 text-blue-600 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-blue-900'>
                      Volume Discounts
                    </h4>
                    <p className='text-sm text-blue-700 mt-1'>
                      Potential savings:{' '}
                      {formatCurrency(
                        data.summary.costSavingsOpportunity * 0.35
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-4 border rounded-lg bg-yellow-50 border-yellow-200'>
                <div className='flex items-start space-x-3'>
                  <Calendar className='h-5 w-5 text-yellow-600 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-yellow-900'>
                      Contract Optimization
                    </h4>
                    <p className='text-sm text-yellow-700 mt-1'>
                      Potential savings:{' '}
                      {formatCurrency(
                        data.summary.costSavingsOpportunity * 0.25
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
