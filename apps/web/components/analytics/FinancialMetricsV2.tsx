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
  type MenuEngineeringResponse,
  type PurchasingAnalyticsResponse,
  type WasteAnalysisResponse,
} from '@/lib/api/analytics'
import {
  AlertTriangle,
  DollarSign,
  PieChart,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface FinancialMetricsProps {
  locationId?: string
  dateRange: { from: Date; to: Date }
}

export function FinancialMetricsV2({
  locationId,
  dateRange,
}: FinancialMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [menuData, setMenuData] = useState<MenuEngineeringResponse | null>(null)
  const [wasteData, setWasteData] = useState<WasteAnalysisResponse | null>(null)
  const [purchasingData, setPurchasingData] =
    useState<PurchasingAnalyticsResponse | null>(null)
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

        // Load data from multiple endpoints to build financial metrics
        const [menuResponse, wasteResponse, purchasingResponse] =
          await Promise.all([
            analyticsApi.getMenuEngineering(params),
            analyticsApi.getWasteAnalysis(params),
            analyticsApi.getPurchasingAnalytics(params),
          ])

        setMenuData(menuResponse)
        setWasteData(wasteResponse)
        setPurchasingData(purchasingResponse)
      } catch (error) {
        console.warn('Failed to load financial metrics:', error)
        setError('Failed to load financial metrics')
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

  const formatPercent = (value: number) => value.toFixed(1) + '%'

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <RefreshCw className='h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground' />
          <h2 className='text-xl font-semibold mb-2'>
            Loading Financial Metrics
          </h2>
          <p className='text-muted-foreground'>
            Analyzing financial performance...
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
              <RefreshCw className='mr-2 h-4 w-4' />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!menuData || !wasteData || !purchasingData) {
    return null
  }

  // Calculate derived financial metrics
  const grossProfit =
    menuData.summary.totalRevenue - menuData.summary.totalCosts
  const grossMarginPercent = menuData.summary.averageMargin
  const costOfGoodsSold =
    menuData.summary.totalCosts + wasteData.summary.totalWasteValue
  const netProfit = grossProfit - wasteData.summary.totalWasteValue
  const netMarginPercent = (netProfit / menuData.summary.totalRevenue) * 100
  const foodCostPercent =
    (costOfGoodsSold / menuData.summary.totalRevenue) * 100

  return (
    <div className='space-y-6'>
      {/* Primary Financial KPIs */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(menuData.summary.totalRevenue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Total sales this period
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Gross Profit</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(grossProfit)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {formatPercent(grossMarginPercent)} margin
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Net Profit</CardTitle>
            <Target className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(netProfit)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {formatPercent(netMarginPercent)} net margin
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Food Cost %</CardTitle>
            <PieChart className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatPercent(foodCostPercent)}
            </div>
            <Progress value={foodCostPercent} className='mt-2 h-2' />
          </CardContent>
        </Card>
      </div>

      {/* Financial Performance Analysis */}
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Cost Breakdown</CardTitle>
            <CardDescription>
              Analysis of revenue streams and cost structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Total Revenue</span>
                  <span className='font-bold'>
                    {formatCurrency(menuData.summary.totalRevenue)}
                  </span>
                </div>
                <Progress value={100} className='h-2' />
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Cost of Goods Sold</span>
                  <span className='font-bold'>
                    {formatCurrency(costOfGoodsSold)}
                  </span>
                </div>
                <Progress value={foodCostPercent} className='h-2' />
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Food Waste</span>
                  <span className='font-bold text-red-600'>
                    {formatCurrency(wasteData.summary.totalWasteValue)}
                  </span>
                </div>
                <Progress
                  value={wasteData.summary.totalWastePercent}
                  className='h-2'
                />
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Gross Profit</span>
                  <span className='font-bold text-green-600'>
                    {formatCurrency(grossProfit)}
                  </span>
                </div>
                <Progress value={grossMarginPercent} className='h-2' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Metrics</CardTitle>
            <CardDescription>
              Key profitability indicators and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-6'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    {formatPercent(grossMarginPercent)}
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Gross Margin
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {formatPercent(netMarginPercent)}
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Net Margin
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm'>Target Food Cost</span>
                  <span className='text-sm font-bold'>28-32%</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm'>Current Food Cost</span>
                  <span
                    className={`text-sm font-bold ${foodCostPercent <= 32 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatPercent(foodCostPercent)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm'>Food Cost Status</span>
                  <Badge
                    variant='outline'
                    className={
                      foodCostPercent <= 32
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }
                  >
                    {foodCostPercent <= 32 ? 'On Target' : 'Above Target'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Center Analysis</CardTitle>
          <CardDescription>
            Breakdown of major cost categories and spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-4'>
              <h4 className='font-semibold'>Direct Costs</h4>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Raw Materials</span>
                  <span className='font-medium'>
                    {formatCurrency(menuData.summary.totalCosts)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm'>Food Waste</span>
                  <span className='font-medium text-red-600'>
                    {formatCurrency(wasteData.summary.totalWasteValue)}
                  </span>
                </div>
                <div className='flex justify-between border-t pt-2'>
                  <span className='text-sm font-bold'>Total Direct</span>
                  <span className='font-bold'>
                    {formatCurrency(costOfGoodsSold)}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='font-semibold'>Procurement</h4>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Total Spend</span>
                  <span className='font-medium'>
                    {formatCurrency(purchasingData.summary.monthlySpend)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm'>Suppliers</span>
                  <span className='font-medium'>
                    {purchasingData.summary.supplierCount}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm'>Avg Order</span>
                  <span className='font-medium'>
                    {formatCurrency(
                      purchasingData.purchasingData.avgOrderValue
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='font-semibold'>Opportunities</h4>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm'>Waste Reduction</span>
                  <span className='font-medium text-green-600'>
                    {formatCurrency(wasteData.summary.savingsOpportunity)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm'>Cost Savings</span>
                  <span className='font-medium text-green-600'>
                    {formatCurrency(
                      purchasingData.summary.costSavingsOpportunity
                    )}
                  </span>
                </div>
                <div className='flex justify-between border-t pt-2'>
                  <span className='text-sm font-bold'>Total Potential</span>
                  <span className='font-bold text-green-600'>
                    {formatCurrency(
                      wasteData.summary.savingsOpportunity +
                        purchasingData.summary.costSavingsOpportunity
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Optimization Opportunities</CardTitle>
          <CardDescription>
            Identified opportunities to improve financial performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-4'>
              <h4 className='font-semibold'>Menu Engineering</h4>
              <div className='space-y-3'>
                <div className='p-3 border rounded-lg bg-green-50 border-green-200'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>
                      Price Optimization
                    </span>
                    <span className='font-bold text-green-600'>
                      {formatCurrency(
                        menuData.summary.opportunities.priceIncrease
                      )}
                    </span>
                  </div>
                  <p className='text-xs text-green-700 mt-1'>
                    Monthly potential from strategic price increases
                  </p>
                </div>
                <div className='p-3 border rounded-lg bg-blue-50 border-blue-200'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>
                      Menu Mix Optimization
                    </span>
                    <span className='font-bold text-blue-600'>
                      {formatCurrency(
                        menuData.summary.opportunities.menuOptimization
                      )}
                    </span>
                  </div>
                  <p className='text-xs text-blue-700 mt-1'>
                    Focus on promoting high-margin items
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='font-semibold'>Cost Reduction</h4>
              <div className='space-y-3'>
                <div className='p-3 border rounded-lg bg-yellow-50 border-yellow-200'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>Waste Reduction</span>
                    <span className='font-bold text-yellow-600'>
                      {formatCurrency(wasteData.summary.savingsOpportunity)}
                    </span>
                  </div>
                  <p className='text-xs text-yellow-700 mt-1'>
                    Monthly savings from waste minimization
                  </p>
                </div>
                <div className='p-3 border rounded-lg bg-purple-50 border-purple-200'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>
                      Procurement Savings
                    </span>
                    <span className='font-bold text-purple-600'>
                      {formatCurrency(
                        purchasingData.summary.costSavingsOpportunity
                      )}
                    </span>
                  </div>
                  <p className='text-xs text-purple-700 mt-1'>
                    Supplier negotiation and consolidation
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
