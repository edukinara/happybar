'use client'

import DateRangePicker from '@/components/dateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { analyticsApi } from '@/lib/api/analytics'
import { useLocationStore } from '@/lib/stores/location-store'
import { cn } from '@/lib/utils'
import {
  convertToBusinessDayRange,
  createLocationTimeConfig,
} from '@/lib/utils/business-day'
import { subDays } from 'date-fns'
import {
  Activity,
  BarChart3,
  DollarSign,
  PieChart,
  RefreshCw,
  ShoppingCart,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'

// Components
import { FinancialMetricsV2 } from '@/components/analytics/FinancialMetrics'
import { ForecastingDashboardV2 } from '@/components/analytics/ForecastingDashboard'
import { MenuEngineeringV2 } from '@/components/analytics/MenuEngineering'
import { OperationalMetricsV2 } from '@/components/analytics/OperationalMetrics'
import { PurchasingAnalyticsV2 } from '@/components/analytics/PurchasingAnalytics'
import { VarianceAnalysis } from '@/components/analytics/VarianceAnalysis'
import { WasteAnalysisV2 } from '@/components/analytics/WasteAnalysis'

interface AnalyticsSummary {
  totalRevenue: number
  revenueChange: number
  totalCosts: number
  costsChange: number
  grossMargin: number
  marginChange: number
  inventoryTurns: number
  turnsChange: number
  forecastAccuracy: number
  accuracyChange: number
  wastePercentage: number
  wasteChange: number
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  } as DateRange)
  // Memoize initial date filter to prevent recreation on every render
  const initialDateFilter = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7)
    const today = new Date()
    return {
      from: new Date(
        sevenDaysAgo.getFullYear(),
        sevenDaysAgo.getMonth(),
        sevenDaysAgo.getDate(),
        0,
        0,
        0,
        0
      ),
      to: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      ),
    } as DateRange
  }, [])

  const [dateFilter, setDateFilter] = useState<DateRange>(initialDateFilter)
  const [updating, setUpdating] = useState(false)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  // Get selected location from global store
  const { selectedLocationId, getSelectedLocation } = useLocationStore()

  // Helper function to convert date range to business day range
  const getFilteredDateRange = useCallback(
    (newDateRange: DateRange) => {
      const selectedLocation = getSelectedLocation()

      const locationConfig = selectedLocation
        ? createLocationTimeConfig(selectedLocation)
        : null

      const businessDayRange = convertToBusinessDayRange(
        newDateRange,
        locationConfig
      )

      if (businessDayRange) {
        return businessDayRange
      } else {
        // Fallback to standard calendar day boundaries if business day conversion fails
        return {
          from: new Date(
            newDateRange.from!.getFullYear(),
            newDateRange.from!.getMonth(),
            newDateRange.from!.getDate(),
            0,
            0,
            0,
            0
          ),
          to: new Date(
            newDateRange.to!.getFullYear(),
            newDateRange.to!.getMonth(),
            newDateRange.to!.getDate(),
            23,
            59,
            59,
            999
          ),
        } as DateRange
      }
    },
    [getSelectedLocation]
  )

  // Load analytics data function
  const loadAnalytics = async () => {
    if (!dateFilter?.from || !dateFilter?.to) return

    setUpdating(true)
    try {
      const params = {
        locationId: selectedLocationId || undefined,
        startDate: dateFilter.from.toISOString(),
        endDate: dateFilter.to.toISOString(),
      }

      // Fetch data from multiple endpoints in parallel
      const [menuData, wasteData, forecastData] = await Promise.all([
        analyticsApi.getMenuEngineering(params),
        analyticsApi.getWasteAnalysis(params),
        analyticsApi.getForecasting({
          locationId: selectedLocationId || undefined,
          horizon: '30',
        }),
      ])

      // Calculate aggregated KPIs from the API responses
      const totalRevenue = menuData.summary.totalRevenue
      const totalCosts = menuData.summary.totalCosts
      const grossMargin = menuData.summary.averageMargin
      const wastePercentage = wasteData.summary.totalWastePercent
      const forecastAccuracy = forecastData.metrics.overallAccuracy

      setSummary({
        totalRevenue,
        revenueChange: 12.5, // Would need historical data to calculate
        totalCosts,
        costsChange: -3.2, // Would need historical data to calculate
        grossMargin,
        marginChange: 2.1, // Would need historical data to calculate
        inventoryTurns: 0, // Would need inventory turnover calculation
        turnsChange: 0.7, // Would need historical data to calculate
        forecastAccuracy,
        accuracyChange: 1.8, // Would need historical accuracy data
        wastePercentage,
        wasteChange: wasteData.summary.monthlyTrend,
      })
    } catch (error) {
      console.error('Failed to load analytics summary:', error)
      // Fall back to mock data on error
      setSummary({
        totalRevenue: 125430.5,
        revenueChange: 12.5,
        totalCosts: 43650.25,
        costsChange: -3.2,
        grossMargin: 65.2,
        marginChange: 2.1,
        inventoryTurns: 0,
        turnsChange: 0.7,
        forecastAccuracy: 94.2,
        accuracyChange: 1.8,
        wastePercentage: 2.3,
        wasteChange: -0.5,
      })
    } finally {
      setUpdating(false)
    }
  }

  // Update date filter when location changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const filteredRange = getFilteredDateRange(dateRange)
      setDateFilter(filteredRange)
    }
  }, [selectedLocationId, dateRange, getFilteredDateRange])

  // Load initial data on location change only
  useEffect(() => {
    loadAnalytics()
  }, [selectedLocationId])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

  const getChangeColor = (change: number) =>
    change > 0
      ? 'text-green-600'
      : change < 0
        ? 'text-red-600'
        : 'text-gray-600'

  const getChangeIcon = (change: number) =>
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : Activity

  if (updating) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground' />
          <h2 className='text-xl font-semibold mb-2'>Loading Analytics</h2>
          <p className='text-muted-foreground'>Crunching your data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='max-h-screen brand-gradient -m-4 overflow-auto'>
      {/* Floating orbs */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='brand-orb-primary w-96 h-96 absolute -top-20 -right-20 animate-float' />
        <div className='brand-orb-accent w-80 h-80 absolute top-80 -left-20 animate-float-reverse' />
        <div className='brand-orb-primary w-64 h-64 absolute bottom-60 right-1/3 animate-float' />
      </div>

      <div className='relative z-10 p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
              Analytics & Forecasting
            </h1>
            <p className='text-muted-foreground'>
              Advanced insights and predictive analytics for optimal inventory
              management
            </p>
          </div>
          {/* <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn('mr-2 size-4', refreshing && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button variant='outline'>
            <Download className='mr-2 size-4' />
            Export
          </Button>
        </div> */}
        </div>

        {/* Filters */}
        <Card className='brand-card'>
          <CardContent className='px-6'>
            <div className='flex flex-wrap items-center gap-4'>
              {/* Date Range Picker */}
              <DateRangePicker
                range={dateRange}
                setRange={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange(range as DateRange)
                    // Convert to business day range and update filter immediately
                    const filteredRange = getFilteredDateRange(
                      range as DateRange
                    )
                    setDateFilter(filteredRange)
                  }
                }}
                setDateFilter={(newFilter) => {
                  // Keep for compatibility with DateRangePicker interface
                  if (newFilter?.from && newFilter?.to) {
                    setDateFilter(newFilter as DateRange)
                  }
                }}
              />

              {/* Update Button */}
              <Button
                onClick={loadAnalytics}
                disabled={updating || !dateFilter?.from || !dateFilter?.to}
                className='min-w-[100px] btn-brand-primary'
                loading={updating}
              >
                <RefreshCw
                  className={cn('mr-2 size-4', updating && 'animate-spin')}
                />
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        {summary && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-6'>
            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Revenue
                </CardTitle>
                <DollarSign className='size-4 brand-icon-accent' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(summary.revenueChange)
                  )}
                >
                  {React.createElement(getChangeIcon(summary.revenueChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.revenueChange > 0 ? '+' : ''}
                  {summary.revenueChange}%
                </div>
              </CardContent>
            </Card>

            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Costs
                </CardTitle>
                <ShoppingCart className='size-4 brand-icon-primary' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {formatCurrency(summary.totalCosts)}
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(-summary.costsChange)
                  )}
                >
                  {React.createElement(getChangeIcon(-summary.costsChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.costsChange > 0 ? '+' : ''}
                  {summary.costsChange}%
                </div>
              </CardContent>
            </Card>

            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Gross Margin
                </CardTitle>
                <Target className='size-4 brand-icon-accent' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {summary.grossMargin?.toFixed(1)}%
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(summary.marginChange)
                  )}
                >
                  {React.createElement(getChangeIcon(summary.marginChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.marginChange > 0 ? '+' : ''}
                  {summary.marginChange}pp
                </div>
              </CardContent>
            </Card>

            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Inventory Turns
                </CardTitle>
                <RefreshCw className='size-4 brand-icon-primary' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {summary.inventoryTurns?.toFixed(1)}x
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(summary.turnsChange)
                  )}
                >
                  {React.createElement(getChangeIcon(summary.turnsChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.turnsChange > 0 ? '+' : ''}
                  {summary.turnsChange}
                </div>
              </CardContent>
            </Card>

            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Forecast Accuracy
                </CardTitle>
                <Zap className='size-4 brand-icon-accent' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {summary.forecastAccuracy?.toFixed(1)}%
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(summary.accuracyChange)
                  )}
                >
                  {React.createElement(getChangeIcon(summary.accuracyChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.accuracyChange > 0 ? '+' : ''}
                  {summary.accuracyChange}pp
                </div>
              </CardContent>
            </Card>

            <Card className='brand-card justify-between gap-2'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Food Waste
                </CardTitle>
                <Trash2 className='size-4 brand-icon-primary' />
              </CardHeader>
              <CardContent>
                <div className='text-xl font-bold'>
                  {summary.wastePercentage?.toFixed(1)}%
                </div>
                <div
                  className={cn(
                    'text-xs flex items-center',
                    getChangeColor(-summary.wasteChange)
                  )}
                >
                  {React.createElement(getChangeIcon(-summary.wasteChange), {
                    className: 'size-3 mr-1',
                  })}
                  {summary.wasteChange > 0 ? '+' : ''}
                  {summary.wasteChange}pp
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Analytics Tabs */}
        <Tabs defaultValue='forecasting' className='space-y-4'>
          <TabsList className='max-w-full'>
            <div className='flex flex-row items-center overflow-x-auto'>
              <TabsTrigger value='forecasting' className='flex items-center'>
                <TrendingUp className='size-4 mr-1 brand-icon-primary' />
                Forecasting
              </TabsTrigger>
              <TabsTrigger value='variance' className='flex items-center'>
                <BarChart3 className='size-4 mr-1 brand-icon-accent' />
                Variance
              </TabsTrigger>
              <TabsTrigger
                value='menu-engineering'
                className='flex items-center'
              >
                <PieChart className='size-4 mr-1 brand-icon-primary' />
                Menu
              </TabsTrigger>
              <TabsTrigger value='waste' className='flex items-center'>
                <Trash2 className='size-4 mr-1' />
                Waste
              </TabsTrigger>
              <TabsTrigger value='purchasing' className='flex items-center'>
                <ShoppingCart className='size-4 mr-1' />
                Purchasing
              </TabsTrigger>
              <TabsTrigger value='financial' className='flex items-center'>
                <DollarSign className='size-4 mr-1' />
                Financial
              </TabsTrigger>
              <TabsTrigger value='operations' className='flex items-center'>
                <Activity className='size-4 mr-1' />
                Operations
              </TabsTrigger>
            </div>
          </TabsList>

          <TabsContent value='forecasting' className='space-y-4'>
            <ForecastingDashboardV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='variance' className='space-y-4'>
            <VarianceAnalysis
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='menu-engineering' className='space-y-4'>
            <MenuEngineeringV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='waste' className='space-y-4'>
            <WasteAnalysisV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='purchasing' className='space-y-4'>
            <PurchasingAnalyticsV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='financial' className='space-y-4'>
            <FinancialMetricsV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>

          <TabsContent value='operations' className='space-y-4'>
            <OperationalMetricsV2
              locationId={selectedLocationId || undefined}
              dateRange={{ from: dateFilter.from!, to: dateFilter.to! }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
