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
import { analyticsApi, type MenuEngineeringResponse } from '@/lib/api/analytics'
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  RefreshCw,
  Star,
  Target,
  TrendingDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface MenuEngineeringProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function MenuEngineeringV2({
  locationId,
  dateRange,
}: MenuEngineeringProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MenuEngineeringResponse | null>(null)
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

        const response = await analyticsApi.getMenuEngineering(params)
        setData(response)
      } catch (error) {
        console.warn('Failed to load menu engineering data:', error)
        setError('Failed to load menu engineering data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locationId, dateRange])

  const getClassificationBadge = (classification: string) => {
    const styles = {
      STAR: 'bg-green-100 text-green-800 border-green-200',
      PLOW_HORSE: 'bg-blue-100 text-blue-800 border-blue-200',
      PUZZLE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      DOG: 'bg-red-100 text-red-800 border-red-200',
    }
    return styles[classification as keyof typeof styles] || styles.DOG
  }

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'STAR':
        return <Star className='size-4' />
      case 'PLOW_HORSE':
        return <Target className='size-4' />
      case 'PUZZLE':
        return <AlertTriangle className='size-4' />
      case 'DOG':
        return <TrendingDown className='size-4' />
      default:
        return <BarChart3 className='size-4' />
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
            Loading Menu Engineering
          </h2>
          <p className='text-muted-foreground'>Analyzing menu performance...</p>
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
      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
            <DollarSign className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.totalRevenue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Average margin: {data.summary.averageMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Costs</CardTitle>
            <Target className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(data.summary.totalCosts)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Gross profit:{' '}
              {formatCurrency(
                data.summary.totalRevenue - data.summary.totalCosts
              )}
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Top Performers
            </CardTitle>
            <Star className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.topPerformers}
            </div>
            <p className='text-xs text-muted-foreground'>
              Stars: {data.summary.menuMix.stars}%
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Poor Performers
            </CardTitle>
            <AlertTriangle className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.summary.poorPerformers}
            </div>
            <p className='text-xs text-muted-foreground'>
              Dogs: {data.summary.menuMix.dogs}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Mix Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Mix Distribution</CardTitle>
          <CardDescription>
            Classification of menu items based on popularity and profitability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Star className='size-4 text-green-600' />
                  <span className='text-sm font-medium'>Stars</span>
                  <span className='text-sm text-muted-foreground'>
                    (High popularity, High profit)
                  </span>
                </div>
                <span className='text-sm font-bold'>
                  {data.summary.menuMix.stars}%
                </span>
              </div>
              <Progress value={data.summary.menuMix.stars} className='h-2' />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Target className='size-4 text-blue-600' />
                  <span className='text-sm font-medium'>Plow Horses</span>
                  <span className='text-sm text-muted-foreground'>
                    (High popularity, Low profit)
                  </span>
                </div>
                <span className='text-sm font-bold'>
                  {data.summary.menuMix.plowHorses}%
                </span>
              </div>
              <Progress
                value={data.summary.menuMix.plowHorses}
                className='h-2'
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <AlertTriangle className='size-4 text-yellow-600' />
                  <span className='text-sm font-medium'>Puzzles</span>
                  <span className='text-sm text-muted-foreground'>
                    (Low popularity, High profit)
                  </span>
                </div>
                <span className='text-sm font-bold'>
                  {data.summary.menuMix.puzzles}%
                </span>
              </div>
              <Progress value={data.summary.menuMix.puzzles} className='h-2' />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <TrendingDown className='size-4 text-red-600' />
                  <span className='text-sm font-medium'>Dogs</span>
                  <span className='text-sm text-muted-foreground'>
                    (Low popularity, Low profit)
                  </span>
                </div>
                <span className='text-sm font-bold'>
                  {data.summary.menuMix.dogs}%
                </span>
              </div>
              <Progress value={data.summary.menuMix.dogs} className='h-2' />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items Analysis</CardTitle>
          <CardDescription>
            Detailed performance metrics for each menu item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className='text-right'>Units Sold</TableHead>
                <TableHead className='text-right'>Revenue</TableHead>
                <TableHead className='text-right'>Margin %</TableHead>
                <TableHead className='text-center'>Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.menuData.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {item.category}
                  </TableCell>
                  <TableCell className='text-right'>
                    {+item.unitsSold.toFixed(2)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(item.revenue)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {item.grossMargin.toFixed(1)}%
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant='outline'
                      className={getClassificationBadge(item.classification)}
                    >
                      <div className='flex items-center space-x-1'>
                        {getClassificationIcon(item.classification)}
                        <span>{item.classification.replace('_', ' ')}</span>
                      </div>
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Opportunities</CardTitle>
          <CardDescription>
            Potential revenue improvements based on menu analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>
                Price Increase
              </div>
              <div className='text-2xl font-bold text-green-600'>
                {formatCurrency(data.summary.opportunities.priceIncrease)}
              </div>
              <div className='text-xs text-muted-foreground'>
                Potential monthly gain
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>
                Cost Reduction
              </div>
              <div className='text-2xl font-bold text-blue-600'>
                {formatCurrency(data.summary.opportunities.costReduction)}
              </div>
              <div className='text-xs text-muted-foreground'>
                Potential monthly savings
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium text-muted-foreground'>
                Menu Optimization
              </div>
              <div className='text-2xl font-bold text-purple-600'>
                {formatCurrency(data.summary.opportunities.menuOptimization)}
              </div>
              <div className='text-xs text-muted-foreground'>
                Total optimization potential
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
