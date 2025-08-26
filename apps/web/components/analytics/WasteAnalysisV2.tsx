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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { analyticsApi, type WasteAnalysisResponse } from '@/lib/api/analytics'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface WasteAnalysisProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function WasteAnalysisV2({ locationId, dateRange }: WasteAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WasteAnalysisResponse | null>(null)
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

        const response = await analyticsApi.getWasteAnalysis(params)
        setData(response)
      } catch (error) {
        console.warn('Failed to load waste analysis data:', error)
        setError('Failed to load waste analysis data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locationId, dateRange])

  const getWasteReasonColor = (reason: string) => {
    switch (reason) {
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'DAMAGED':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'SPILLAGE':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'OTHER':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingDown className='h-4 w-4 text-green-500' />
      case 'WORSENING':
        return <TrendingUp className='h-4 w-4 text-red-500' />
      case 'STABLE':
        return <Target className='h-4 w-4 text-gray-500' />
      default:
        return <Target className='h-4 w-4 text-gray-500' />
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
          <h2 className='text-xl font-semibold mb-2'>Loading Waste Analysis</h2>
          <p className='text-muted-foreground'>Analyzing waste patterns...</p>
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
            <CardTitle className='text-sm font-medium'>
              Total Waste Value
            </CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.totalWasteValue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.summary.totalWastePercent.toFixed(1)}% of total inventory
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Monthly Trend</CardTitle>
            <TrendingDown className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.monthlyTrend > 0 ? '+' : ''}
              {data.summary.monthlyTrend.toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              {data.summary.monthlyTrend > 0 ? 'Increasing' : 'Decreasing'}{' '}
              waste
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Target vs Actual
            </CardTitle>
            <Target className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.targetWastePercent.toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              Target: {data.summary.targetWastePercent.toFixed(1)}% | Actual:{' '}
              {data.summary.totalWastePercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Savings Opportunity
            </CardTitle>
            <CheckCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.savingsOpportunity)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Potential monthly savings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Waste by Reason */}
      <Card>
        <CardHeader>
          <CardTitle>Waste by Reason</CardTitle>
          <CardDescription>
            Breakdown of waste causes to identify improvement opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.summary.wasteByReason.map((reason) => (
              <div key={reason.reason} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <Badge
                      variant='outline'
                      className={getWasteReasonColor(reason.reason)}
                    >
                      {reason.reason}
                    </Badge>
                    <span className='text-sm font-medium'>
                      {formatCurrency(reason.value)}
                    </span>
                  </div>
                  <span className='text-sm font-bold'>{reason.percent}%</span>
                </div>
                <Progress value={reason.percent} className='h-2' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waste Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Items Analysis</CardTitle>
          <CardDescription>
            Detailed breakdown of waste by product and category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className='text-right'>Waste Quantity</TableHead>
                <TableHead className='text-right'>Waste Value</TableHead>
                <TableHead className='text-right'>Waste %</TableHead>
                <TableHead className='text-center'>Reason</TableHead>
                <TableHead className='text-center'>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.wasteData.map((item, index) => (
                <TableRow key={`${item.productId}-${index}`}>
                  <TableCell className='font-medium'>
                    {item.productName}
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {item.category}
                  </TableCell>
                  <TableCell className='text-right'>
                    {item.wasteQuantity}
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(item.wasteValue)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {item.wastePercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant='outline'
                      className={getWasteReasonColor(item.wasteReason)}
                    >
                      {item.wasteReason}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    {getTrendIcon(item.trend)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.wasteData.length === 0 && (
            <div className='text-center py-8'>
              <Package className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
              <h3 className='text-lg font-semibold mb-2'>
                No Waste Data Found
              </h3>
              <p className='text-muted-foreground'>
                No waste records found for the selected period and location.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Reduction Recommendations</CardTitle>
          <CardDescription>
            AI-driven suggestions to minimize food waste and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='p-4 border rounded-lg bg-blue-50 border-blue-200'>
              <div className='flex items-start space-x-3'>
                <CheckCircle className='h-5 w-5 text-blue-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-blue-900'>
                    Inventory Management
                  </h4>
                  <p className='text-sm text-blue-700 mt-1'>
                    Implement FIFO (First In, First Out) rotation to reduce
                    expiration waste by up to 30%.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg bg-green-50 border-green-200'>
              <div className='flex items-start space-x-3'>
                <Target className='h-5 w-5 text-green-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-green-900'>
                    Portion Control
                  </h4>
                  <p className='text-sm text-green-700 mt-1'>
                    Review portion sizes for high-waste items to reduce spillage
                    and overportioning.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg bg-yellow-50 border-yellow-200'>
              <div className='flex items-start space-x-3'>
                <Clock className='h-5 w-5 text-yellow-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-yellow-900'>
                    Staff Training
                  </h4>
                  <p className='text-sm text-yellow-700 mt-1'>
                    Train staff on proper handling techniques to minimize damage
                    and spillage incidents.
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
