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
import {
  analyticsApi,
  type VarianceAnalysisResponse,
} from '@/lib/api/analytics'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  DollarSign,
  Target,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface VarianceAnalysisProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function VarianceAnalysis({
  locationId,
  dateRange,
}: VarianceAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<VarianceAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVarianceData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {
          locationId,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }

        const response = await analyticsApi.getVarianceAnalysis(params)
        setData(response)
      } catch (err) {
        console.warn('Failed to load variance analysis:', err)
        setError('Failed to load variance data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadVarianceData()
  }, [locationId, dateRange])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

  const getVarianceColor = (variancePercent: number) => {
    if (Math.abs(variancePercent) <= 5) return 'text-green-600'
    if (Math.abs(variancePercent) <= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-800'
      case 'INVESTIGATING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDING':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground' />
          <h3 className='text-lg font-medium mb-2'>Analyzing Variances</h3>
          <p className='text-muted-foreground'>
            Processing inventory variance data...
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
            <h3 className='text-lg font-medium mb-2 text-red-800'>
              Error Loading Data
            </h3>
            <p className='text-red-600 mb-4'>{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-center'>
            <BarChart3 className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
            <h3 className='text-lg font-medium mb-2'>No Data Available</h3>
            <p className='text-muted-foreground'>
              No variance data found for the selected period.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Variance
            </CardTitle>
            <DollarSign className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.totalVarianceValue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.summary.totalVariancePercent.toFixed(1)}% variance rate
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Items Investigated
            </CardTitle>
            <CheckCircle className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.itemsInvestigated}
            </div>
            <p className='text-xs text-muted-foreground'>
              of {data.summary.totalItemsCounted} items counted
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Major Variances
            </CardTitle>
            <AlertTriangle className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.majorVariances}
            </div>
            <p className='text-xs text-muted-foreground'>
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Trend</CardTitle>
            <Target className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.trendDirection}
            </div>
            <p className='text-xs text-muted-foreground'>
              Overall variance trend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Variance Items */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis Details</CardTitle>
          <CardDescription>
            Detailed breakdown of inventory variances by product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.varianceData.length > 0 ? (
              data.varianceData.map((item) => (
                <div
                  key={item.productId}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='space-y-1'>
                    <div className='flex items-center space-x-2'>
                      <h4 className='font-semibold'>{item.productName}</h4>
                      <Badge variant='outline'>{item.category}</Badge>
                      <Badge
                        className={getStatusColor(item.investigationStatus)}
                      >
                        {item.investigationStatus}
                      </Badge>
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      Expected: {item.theoretical} • Actual: {item.actual} •
                      Location: {item.location}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Count Date: {item.countDate} • Cost per Unit:{' '}
                      {formatCurrency(item.costPerUnit)}
                    </div>
                  </div>
                  <div className='text-right space-y-1'>
                    <div
                      className={`text-lg font-semibold ${getVarianceColor(item.variancePercent)}`}
                    >
                      {formatCurrency(item.varianceValue)}
                    </div>
                    <div
                      className={`text-sm ${getVarianceColor(item.variancePercent)}`}
                    >
                      {item.variancePercent > 0 ? '+' : ''}
                      {item.variancePercent.toFixed(1)}%
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Qty: {item.variance > 0 ? '+' : ''}
                      {item.variance}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-8'>
                <BarChart3 className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                <p className='text-muted-foreground'>
                  No variance data available for this period.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
