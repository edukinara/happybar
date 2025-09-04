import { apiClient } from './client'

export interface StockTransferRequest {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  notes?: string
}

export interface StockMovement {
  id: string
  organizationId: string
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  type:
    | 'TRANSFER'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'RECEIVED'
    | 'SOLD'
    | 'WASTE'
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  reason?: string
  userId: string
  notes?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  product: {
    id: string
    name: string
    sku?: string
    unit: string
    container?: string
  }
  fromLocation: {
    id: string
    name: string
    code?: string
    type: string
  }
  toLocation: {
    id: string
    name: string
    code?: string
    type: string
  }
  user: {
    id: string
    name: string
    email: string
  }
}

export interface StockAdjustmentRequest {
  productId: string
  locationId: string
  adjustment: number
  reason: 'DAMAGE' | 'LOSS' | 'FOUND' | 'CORRECTION' | 'OTHER'
  notes?: string
}

export interface LocationInventoryItem {
  id: string
  organizationId: string
  productId: string
  locationId: string
  currentQuantity: number
  minimumQuantity: number
  maximumQuantity?: number
  lastCountDate?: string
  lastReceivedDate?: string
  product: {
    id: string
    name: string
    sku?: string
    unit: string
    costPerUnit: number
    category: {
      id: string
      name: string
    }
  }
  location: {
    id: string
    name: string
    code?: string
    type: string
  }
}

export interface ProductLocationInventory {
  inventory: LocationInventoryItem[]
  summary: {
    totalQuantity: number
    locationCount: number
  }
}

export interface LocationInventorySummary {
  inventory: LocationInventoryItem[]
  summary: {
    totalItems: number
    lowStockItems: number
    totalValue: number
  }
}

export interface StockTransfersResponse {
  movements: StockMovement[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface APIRes<T> {
  success: boolean
  data: T
}

export const stockTransfersApi = {
  // Create a stock transfer between locations
  createTransfer: async (
    data: StockTransferRequest
  ): Promise<StockTransfersResponse> => {
    const response = await apiClient.post<APIRes<StockTransfersResponse>>(
      '/api/stock/transfers',
      data
    )
    return response.data
  },

  // Get stock transfer history
  getTransfers: async (params?: {
    locationId?: string
    productId?: string
    page?: number
    limit?: number
  }): Promise<StockTransfersResponse> => {
    const response = await apiClient.get<APIRes<StockTransfersResponse>>(
      '/api/stock/transfers',
      { params }
    )
    return response.data
  },

  // Get inventory by location
  getLocationInventory: async (
    locationId: string,
    lowStockOnly?: boolean
  ): Promise<LocationInventorySummary> => {
    const response = await apiClient.get<APIRes<LocationInventorySummary>>(
      `/api/stock/inventory/by-location/${locationId}`,
      {
        params: { lowStockOnly },
      }
    )
    return response.data
  },

  // Adjust stock at a specific location
  adjustStock: async (
    data: StockAdjustmentRequest
  ): Promise<{
    inventory: LocationInventoryItem
    movement: StockMovement
  }> => {
    const response = await apiClient.post<
      APIRes<{
        inventory: LocationInventoryItem
        movement: StockMovement
      }>
    >('/api/stock/inventory/adjust', data)
    return response.data
  },

  // Get stock levels across all locations for a product
  getProductLocationInventory: async (
    productId: string
  ): Promise<ProductLocationInventory> => {
    const response = await apiClient.get(
      `/api/stock/inventory/product/${productId}/locations`
    )
    return response as ProductLocationInventory
  },
}
