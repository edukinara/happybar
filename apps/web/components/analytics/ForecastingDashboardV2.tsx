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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { analyticsApi, type ForecastingResponse } from '@/lib/api/analytics'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  RefreshCw,
  Target,
  TrendingDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ForecastingDashboardProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function ForecastingDashboardV2({
  locationId,
  dateRange: _,
}: ForecastingDashboardProps) {
  const [forecastHorizon, setForecastHorizon] = useState('7')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ForecastingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = {
          locationId,
          horizon: forecastHorizon,
        }

        const response = await analyticsApi.getForecasting(params)
        setData(response)
      } catch (error) {
        console.warn('Failed to load forecasting data:', error)
        setError('Failed to load forecasting data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locationId, forecastHorizon])

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'spirits':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'wine':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'beer':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAlgorithmBadgeColor = (algorithm: string) => {
    switch (algorithm) {
      case 'SEASONAL':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ARIMA':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'ML':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'HYBRID':
        return 'bg-orange-100 text-orange-800 border-orange-200'
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
            Loading Forecasting Data
          </h2>
          <p className='text-muted-foreground'>
            Running predictive algorithms...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='px-6'>
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
    <div className='grid grid-cols-1 space-y-6'>
      {/* Forecast Controls */}
      <Card>
        <CardContent className='px-6'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center space-x-2'>
              <Calendar className='size-4' />
              <span className='text-sm font-medium'>Forecast Horizon:</span>
            </div>
            <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
              <SelectTrigger className='w-[10rem]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='3'>3 days</SelectItem>
                <SelectItem value='7'>7 days</SelectItem>
                <SelectItem value='14'>14 days</SelectItem>
                <SelectItem value='30'>30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Overall Accuracy
            </CardTitle>
            <Target className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.metrics.overallAccuracy?.toFixed(1)}%
            </div>
            <Progress value={data.metrics.overallAccuracy} className='mt-2' />
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Confidence Score
            </CardTitle>
            <Brain className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.metrics.confidenceScore?.toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              MAPE: {data.metrics.mape?.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Forecast Value
            </CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.metrics.totalForecastValue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Suggested Value:{' '}
              <span className='text-xs text-secondary font-semibold'>
                {formatCurrency(data.metrics.totalForecastValueSuggested)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Forecast Cost</CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.metrics.totalForecastCost)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Suggested Cost:{' '}
              <span className='text-xs text-secondary font-semibold'>
                {formatCurrency(data.metrics.totalForecastCostSuggested)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Items Forecasted
            </CardTitle>
            <Activity className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{data.forecastData.length}</div>
            <p className='text-xs text-muted-foreground'>Active forecasts</p>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Performance</CardTitle>
          <CardDescription>
            Accuracy and usage statistics for different forecasting algorithms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.metrics.algorithmsUsed.map((algorithm) => (
              <div key={algorithm.name} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <Badge
                      variant='outline'
                      className={getAlgorithmBadgeColor(algorithm.name)}
                    >
                      {algorithm.name}
                    </Badge>
                    <span className='text-sm'>
                      Accuracy: {algorithm.accuracy?.toFixed(1)}%
                    </span>
                  </div>
                  <span className='text-sm font-medium'>
                    {algorithm.usage}% usage
                  </span>
                </div>
                <div className='flex space-x-2'>
                  <Progress value={algorithm.accuracy} className='flex-1' />
                  <Progress value={algorithm.usage} className='flex-1' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forecast Data Table */}
      <Card className='flex'>
        <CardHeader>
          <CardTitle>Demand Forecasts</CardTitle>
          <CardDescription>
            AI-powered demand predictions for inventory planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className='text-right'>Current Stock</TableHead>
                <TableHead className='text-right'>Forecasted Demand</TableHead>
                <TableHead className='text-right'>Suggested Order</TableHead>
                <TableHead className='text-center'>Confidence</TableHead>
                <TableHead className='text-center'>Algorithm</TableHead>
                <TableHead className='text-center'>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.forecastData.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className='font-medium'>
                    {item.productName}
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'test-[10px]',
                        getCategoryBadgeColor(item.category)
                      )}
                    >
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    {+item.currentStock?.toFixed(1)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {item.forecastedDemand}
                  </TableCell>
                  <TableCell className='text-right'>
                    <span
                      className={
                        item.suggestedOrder > 0
                          ? 'font-semibold'
                          : 'text-muted-foreground'
                      }
                    >
                      {Math.round(item.suggestedOrder)}
                    </span>
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='flex items-center justify-center space-x-1'>
                      <span className='text-sm'>
                        {item.confidence?.toFixed(0)}%
                      </span>
                      <Progress value={item.confidence} className='w-12 h-2' />
                    </div>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant='outline'
                      className={getAlgorithmBadgeColor(item.algorithm)}
                    >
                      {item.algorithm}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant='outline'
                      className={getRiskBadgeColor(item.riskLevel)}
                    >
                      {item.riskLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <AlertTriangle className='size-5 text-red-500' />
              <span>High Stockout Risk</span>
            </CardTitle>
            <CardDescription>
              Items likely to run out based on current stock and demand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {data.forecastData
                .filter((item) => item.stockoutRisk > 50)
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.productId}
                    className='flex items-center justify-between'
                  >
                    <div>
                      <div className='font-medium'>{item.productName}</div>
                      <div className='text-sm text-muted-foreground'>
                        Stock: {item.currentStock} | Demand:{' '}
                        {item.forecastedDemand}
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-red-100 text-red-800 border-red-200'
                    >
                      {item.stockoutRisk?.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <TrendingDown className='size-5 text-yellow-500' />
              <span>High Overstock Risk</span>
            </CardTitle>
            <CardDescription>
              Items with excess inventory based on demand forecasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {data.forecastData
                .filter((item) => item.overStockRisk > 30)
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.productId}
                    className='flex items-center justify-between'
                  >
                    <div>
                      <div className='font-medium'>{item.productName}</div>
                      <div className='text-sm text-muted-foreground'>
                        Stock: {item.currentStock} | Demand:{' '}
                        {item.forecastedDemand}
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-yellow-100 text-yellow-800 border-yellow-200'
                    >
                      {item.overStockRisk?.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
