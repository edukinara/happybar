import type {
  AdjustmentRequest,
  AdjustmentResponse,
  Count,
  InventoryCountStatus,
  InventoryCountType,
  InventoryItem,
  InventoryItemWithBasicProduct,
  InventoryLevel,
  InventoryProduct,
  LowStockItem,
  StockMovement,
} from '@happy-bar/types'
import { apiClient } from './client'
import type { APIRes } from './types'

export interface UsageAnalysisResponse {
  summary: {
    totalTheoreticalUsage: number
    totalActualUsage: number
    totalVariance: number
    overallEfficiency: number
    totalCostImpact: number
    productsAnalyzed: number
    significantVariances: number
  }
  productAnalysis: Array<{
    productId: string
    productName: string
    theoreticalQuantity: number
    actualQuantity: number
    variance: number
    variancePercent: number
    costImpact: number
    salesCount: number
    countEvents: number
    efficiency: number
    lastCountDate: Date
  }>
  topOverusers: Array<{
    productId: string
    productName: string
    variancePercent: number
    costImpact: number
  }>
  topWasters: Array<{
    productId: string
    productName: string
    efficiency: number
    costImpact: number
  }>
}

export interface RecentCount {
  id: string
  name: string
  status: string
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  user?: string
  itemsCount: number
}
interface DashboardStats {
  totalItems: number
  lowStockItems: number
  totalValue: number
  recentCounts: RecentCount[]
}

interface InventoryCountResponse {
  counts: InventoryCountType[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  total: number
}

export interface InventoryTransaction {
  id: string
  type: 'count' | 'adjustment' | 'sale' | 'transfer' | 'receipt'
  date: string
  productId: string
  locationId?: string
  quantity: number
  fromQuantity?: number
  toQuantity?: number
  reference?: string
  notes?: string
  reason?: string
  performedBy?: string
  metadata?: Record<string, any>
}

export interface TransactionHistoryResponse {
  transactions: InventoryTransaction[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export const inventoryApi = {
  async getInventoryProducts(): Promise<InventoryItemWithBasicProduct[]> {
    const response = await apiClient.get<
      APIRes<InventoryItemWithBasicProduct[]>
    >('/api/inventory/inventory-items')
    if (!response.success || !response.data) {
      throw new Error('Failed to get inventory items')
    }
    return response.data
  },

  async getInventoryLevels(): Promise<InventoryLevel[]> {
    const response = await apiClient.get<APIRes<InventoryLevel[]>>(
      '/api/inventory/levels'
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get inventory levels')
    }
    return response.data
  },

  async getLowStockItems(): Promise<LowStockItem[]> {
    const response = await apiClient.get<APIRes<LowStockItem[]>>(
      '/api/inventory/low-stock'
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get low stock items')
    }
    return response.data
  },

  async getCounts(): Promise<RecentCount[]> {
    const response = await apiClient.get<APIRes<RecentCount[]>>(
      '/api/inventory/counts'
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get counts')
    }
    return response.data
  },

  async getInventoryCounts(params?: {
    page?: number
    limit?: number
    status?: InventoryCountStatus
    locationId?: string
  }): Promise<InventoryCountResponse> {
    // Ensure numeric params are actually numbers
    const cleanParams = params
      ? {
          ...params,
          ...(params.page !== undefined && { page: Number(params.page) }),
          ...(params.limit !== undefined && { limit: Number(params.limit) }),
        }
      : undefined

    const response = await apiClient.get<APIRes<InventoryCountResponse>>(
      '/api/inventory-counts',
      {
        params: cleanParams,
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get inventory counts')
    }
    return response.data
  },

  async getInventoryCount(id: string): Promise<InventoryCountType> {
    const response = await apiClient.get<APIRes<InventoryCountType>>(
      `/api/inventory-counts/${id}`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get inventory count')
    }
    return response.data
  },

  async createInventoryCount(data: {
    locationId: string
    name: string
    type: string
    notes?: string
    areas?: Array<{ name: string; order: number }>
  }): Promise<InventoryCountType> {
    const response = await apiClient.post<APIRes<InventoryCountType>>(
      '/api/inventory-counts',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create inventory count')
    }
    return response.data
  },

  async updateInventoryCount(
    id: string,
    data: {
      name?: string
      notes?: string
      status?: string
    }
  ): Promise<InventoryCountType> {
    const response = await apiClient.put<APIRes<InventoryCountType>>(
      `/api/inventory-counts/${id}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update inventory count')
    }
    return response.data
  },

  async saveCountItem(
    countId: string,
    data: {
      areaId: string
      productId: string
      fullUnits: number
      partialUnit: number
      notes?: string
    }
  ) {
    const response = await apiClient.post<APIRes<any>>(
      `/api/inventory-counts/${countId}/items`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to save count item')
    }
    return response.data
  },

  async updateParLevel(
    inventoryItemId: string,
    parLevel: number
  ): Promise<any> {
    const response = await apiClient.put<APIRes<any>>(
      `/api/inventory/levels/${inventoryItemId}`,
      { minimumQuantity: parLevel }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update par level')
    }
    return response.data
  },

  async createInventoryItem(data: {
    productId: string
    locationId: string
    minimumQuantity: number
  }): Promise<any> {
    const response = await apiClient.post<APIRes<any>>(
      '/api/inventory/levels',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create inventory item')
    }
    return response.data
  },

  async updateCountAreaStatus(
    countId: string,
    areaId: string,
    status: string
  ): Promise<any> {
    const response = await apiClient.put<APIRes<any>>(
      `/api/inventory-counts/${countId}/areas/${areaId}`,
      { status }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update area status')
    }
    return response.data
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const [inventoryLevels, lowStockItems, counts] = await Promise.all([
      this.getInventoryLevels(),
      this.getLowStockItems(),
      this.getCounts(),
    ])

    const totalValue = inventoryLevels.reduce((sum, item) => {
      return sum + item.currentQuantity * item.product.costPerUnit
    }, 0)

    const uniqueProducts = new Set(
      inventoryLevels.map((item) => item.productId)
    )

    return {
      totalItems: uniqueProducts.size,
      lowStockItems: lowStockItems.length,
      totalValue,
      recentCounts: counts.slice(0, 5),
    }
  },

  async getProduct(id: string): Promise<InventoryProduct> {
    const response = await apiClient.get<APIRes<{ product: InventoryProduct }>>(
      `/api/products/${id}`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get product')
    }
    return response.data.product
  },

  async createProduct(data: {
    name: string
    sku?: string
    upc?: string
    categoryId: string
    unit: string
    container?: string
    unitSize?: number
    caseSize?: number
    costPerUnit: number
    costPerCase?: number
    sellPrice?: number
    alcoholContent?: number
    image?: string
    supplierId?: string
  }): Promise<InventoryProduct> {
    const response = await apiClient.post<APIRes<InventoryProduct>>(
      '/api/products',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create product')
    }
    return response.data
  },

  async updateProduct(
    id: string,
    data: {
      name?: string
      sku?: string
      upc?: string
      categoryId?: string
      unit?: string
      container?: string
      unitSize?: number
      caseSize?: number
      costPerUnit?: number
      costPerCase?: number
      sellPrice?: number
      alcoholContent?: number
      image?: string
      supplierId?: string
    }
  ): Promise<InventoryProduct> {
    const response = await apiClient.put<APIRes<InventoryProduct>>(
      `/api/products/${id}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update product')
    }
    return response.data
  },

  async deleteProduct(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(
      `/api/products/${id}`
    )
    if (!response.success) {
      throw new Error('Failed to delete product')
    }
  },

  async updateInventoryLevel(data: {
    productId: string
    locationId: string
    quantity: number
    notes?: string
  }): Promise<InventoryItem> {
    const response = await apiClient.post<APIRes<InventoryItem>>(
      '/api/inventory/levels',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update inventory level')
    }
    return response.data
  },

  async createCount(data: {
    name: string
    scheduledAt?: Date
  }): Promise<Count> {
    const response = await apiClient.post<APIRes<Count>>(
      '/api/inventory/counts',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create count')
    }
    return response.data
  },

  async applyCountToInventory(countId: string): Promise<void> {
    const response = await apiClient.post<APIRes<{ message: string }>>(
      `/api/inventory-counts/${countId}/apply`
    )
    if (!response.success) {
      throw new Error('Failed to apply count to inventory')
    }
  },

  // Stock Adjustments
  async createAdjustment(data: AdjustmentRequest): Promise<AdjustmentResponse> {
    const response = await apiClient.post<APIRes<AdjustmentResponse>>(
      '/api/stock/inventory/adjust',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create adjustment')
    }
    return response.data
  },

  async getAdjustments(params?: {
    locationId?: string
    productId?: string
    page?: number
    limit?: number
  }): Promise<{
    movements: StockMovement[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await apiClient.get<APIRes<any>>('/api/stock/transfers', {
      params,
    })
    if (!response.success || !response.data) {
      throw new Error('Failed to get adjustments')
    }
    return response.data
  },

  async getLocationInventory(
    locationId: string,
    lowStockOnly?: boolean
  ): Promise<{
    inventory: any[]
    summary: {
      totalItems: number
      lowStockItems: number
      totalValue: number
    }
  }> {
    const response = await apiClient.get<APIRes<any>>(
      `/api/stock/inventory/by-location/${locationId}`,
      {
        params: { lowStockOnly },
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get location inventory')
    }
    return response.data
  },

  // Reporting functions
  async getTransactionHistory(params: {
    productId: string
    locationId?: string
    limit?: number
    offset?: number
  }): Promise<TransactionHistoryResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('productId', params.productId)
    if (params.locationId) queryParams.append('locationId', params.locationId)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())

    const response = await apiClient.get<APIRes<TransactionHistoryResponse>>(
      `/api/inventory-transactions/history?${queryParams.toString()}`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get transaction history')
    }
    return response.data
  },

  async getUsageAnalysis(params?: {
    startDate?: string
    endDate?: string
    locationId?: string
    productId?: string
  }): Promise<UsageAnalysisResponse> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.locationId) queryParams.append('locationId', params.locationId)
    if (params?.productId) queryParams.append('productId', params.productId)

    const response = await apiClient.get<APIRes<any>>(
      `/api/inventory/reports/usage-analysis?${queryParams.toString()}`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get usage analysis')
    }
    return response.data
  },

  async getVarianceAnalysis(params?: {
    startDate?: string
    endDate?: string
    locationId?: string
  }): Promise<{
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
  }> {
    const response = await apiClient.get<APIRes<any>>(
      '/api/inventory/reports/variance-analysis',
      {
        params,
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get variance analysis')
    }
    return response.data
  },

  async getInventoryValuation(locationId?: string): Promise<{
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
  }> {
    const response = await apiClient.get<APIRes<any>>(
      '/api/inventory/reports/valuation',
      {
        params: { locationId },
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get inventory valuation')
    }
    return response.data
  },

  async getMovementHistory(params?: {
    startDate?: string
    endDate?: string
    locationId?: string
    productId?: string
    movementType?: string
  }): Promise<{
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
  }> {
    const response = await apiClient.get<APIRes<any>>(
      '/api/inventory/reports/movement-history',
      {
        params,
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get movement history')
    }
    return response.data
  },

  async getCountSummary(params?: {
    startDate?: string
    endDate?: string
    locationId?: string
  }): Promise<{
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
  }> {
    const response = await apiClient.get<APIRes<any>>(
      '/api/inventory/reports/count-summary',
      {
        params,
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get count summary')
    }
    return response.data
  },
}
