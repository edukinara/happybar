import { apiClient } from './client'

// Types for analytics API responses
export interface VarianceAnalysisResponse {
  varianceData: Array<{
    productId: string
    productName: string
    category: string
    theoretical: number
    actual: number
    variance: number
    variancePercent: number
    varianceValue: number
    costPerUnit: number
    location: string
    countDate: string
    investigationStatus: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'ACCEPTED'
  }>
  summary: {
    totalVarianceValue: number
    totalVariancePercent: number
    positiveBias: number
    negativeBias: number
    itemsInvestigated: number
    totalItemsCounted: number
    majorVariances: number
    acceptableVariances: number
    trendDirection: 'STABLE' | 'IMPROVING' | 'DECLINING'
  }
}

export interface MenuEngineeringResponse {
  menuData: Array<{
    itemId: string
    itemName: string
    category: string
    unitsSold: number
    revenue: number
    costOfGoods: number
    grossProfit: number
    grossMargin: number
    popularity: number
    profitability: number
    classification: 'STAR' | 'PLOW_HORSE' | 'PUZZLE' | 'DOG'
    price: number
    foodCostPercent: number
    contributionMargin: number
    velocityRank: number
    recommendation: string
    trends: {
      salesTrend: 'STABLE' | 'GROWING' | 'DECLINING'
      marginTrend: 'STABLE' | 'IMPROVING' | 'DECLINING'
      trendPercent: number
    }
  }>
  summary: {
    totalRevenue: number
    totalCosts: number
    averageMargin: number
    topPerformers: number
    poorPerformers: number
    menuMix: {
      stars: number
      plowHorses: number
      puzzles: number
      dogs: number
    }
    opportunities: {
      priceIncrease: number
      costReduction: number
      menuOptimization: number
    }
  }
}

export interface ForecastingResponse {
  forecastData: Array<{
    productId: string
    productName: string
    category: string
    currentStock: number
    forecastedDemand: number
    suggestedOrder: number
    confidence: number
    algorithm: 'SEASONAL' | 'ARIMA' | 'ML' | 'HYBRID'
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    stockoutRisk: number
    overStockRisk: number
  }>
  metrics: {
    overallAccuracy: number
    mape: number
    bias: number
    totalForecastValue: number
    totalForecastCost: number
    totalForecastValueSuggested: number
    totalForecastCostSuggested: number
    confidenceScore: number
    algorithmsUsed: Array<{
      name: string
      accuracy: number
      usage: number
    }>
  }
}

export interface WasteAnalysisResponse {
  wasteData: Array<{
    productId: string
    productName: string
    category: string
    wasteQuantity: number
    wasteValue: number
    wastePercent: number
    wasteReason: 'EXPIRED' | 'DAMAGED' | 'SPILLAGE' | 'OTHER'
    trend: 'STABLE' | 'IMPROVING' | 'WORSENING'
  }>
  summary: {
    totalWasteValue: number
    totalWastePercent: number
    wasteByReason: Array<{
      reason: string
      value: number
      percent: number
    }>
    monthlyTrend: number
    targetWastePercent: number
    savingsOpportunity: number
  }
}

export interface PurchasingAnalyticsResponse {
  purchasingData: {
    totalSpend: number
    orderCount: number
    avgOrderValue: number
    avgLeadTime: number
    topSuppliers: Array<{
      supplierId: string
      supplierName: string
      totalSpend: number
      orderCount: number
      avgOrderValue: number
      spendPercentage: number
    }>
    categoryBreakdown: Array<{
      category: string
      spend: number
      percentage: number
    }>
  }
  summary: {
    monthlySpend: number
    supplierCount: number
    avgOrdersPerWeek: number
    onTimeDeliveryRate: number
    costSavingsOpportunity: number
    topSupplierDependency: number
  }
}

export interface InventoryAnalyticsResponse {
  inventoryData: {
    totalItems: number
    totalValue: number
    avgTurnover: number
    stockAccuracy: number
    lowStockCount: number
    overstockedCount: number
    stockoutCount: number
    lowStockItems: Array<{
      productId: string
      productName: string
      currentStock: number
      minimumStock: number
      location: string
      urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    }>
    slowMovingItems: Array<{
      productId: string
      productName: string
      currentStock: number
      daysOnHand: number
      value: number
    }>
  }
  summary: {
    totalValue: number
    turnoverRate: number
    stockAccuracy: number
    fillRate: number
    excessInventory: number
    carryingCostPercent: number
  }
}

export interface AnalyticsQueryParams {
  locationId?: string
  startDate?: string
  endDate?: string
  horizon?: string
}

class AnalyticsApi {
  async getVarianceAnalysis(
    params: AnalyticsQueryParams = {}
  ): Promise<VarianceAnalysisResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)

    const url = `/api/analytics/variance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<VarianceAnalysisResponse>(url)
  }

  async getMenuEngineering(
    params: AnalyticsQueryParams = {}
  ): Promise<MenuEngineeringResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)

    const url = `/api/analytics/menu-engineering${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<MenuEngineeringResponse>(url)
  }

  async getForecasting(
    params: AnalyticsQueryParams = {}
  ): Promise<ForecastingResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.horizon) queryParams.append('horizon', params.horizon)

    const url = `/api/analytics/forecasting${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<ForecastingResponse>(url)
  }

  async getWasteAnalysis(
    params: AnalyticsQueryParams = {}
  ): Promise<WasteAnalysisResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)

    const url = `/api/analytics/waste${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<WasteAnalysisResponse>(url)
  }

  async getPurchasingAnalytics(
    params: AnalyticsQueryParams = {}
  ): Promise<PurchasingAnalyticsResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)

    const url = `/api/analytics/purchasing${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<PurchasingAnalyticsResponse>(url)
  }

  async getInventoryAnalytics(
    params: AnalyticsQueryParams = {}
  ): Promise<InventoryAnalyticsResponse> {
    const queryParams = new URLSearchParams()

    if (params.locationId) queryParams.append('locationId', params.locationId)

    const url = `/api/analytics/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<InventoryAnalyticsResponse>(url)
  }
}

export const analyticsApi = new AnalyticsApi()
export default analyticsApi
