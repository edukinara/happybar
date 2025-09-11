import { API_CONFIG } from '../constants/config'
import { authClient, Session } from './auth'

const API_URL = API_CONFIG.BASE_URL

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = (await authClient.getSession()) as { data: Session | null }

    if (session.data?.session?.token) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session.token}`,
      }

      // Include organization ID if available
      if (session.data.session.activeOrganizationId) {
        headers['x-organization-id'] = session.data.session.activeOrganizationId
      }

      return headers
    }

    throw new Error(
      'Authentication required: No valid session found. Please sign in again.'
    )
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'omit',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🌐 Mobile API Client - GET error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }

    return response.json()
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'omit',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🌐 Mobile API Client - POST error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }

    return response.json()
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const apiClient = new ApiClient(API_URL)

// Count-related API functions
export const countApi = {
  // Create a new inventory count
  async createCount(data: {
    locationId: string
    name?: string
    type?: 'FULL' | 'CYCLE' | 'SPOT'
    notes?: string
    areas?: Array<{ name: string; order: number }>
  }) {
    return apiClient.post<{
      success: boolean
      data: {
        id: string
        locationId: string
        name: string
        type: 'FULL' | 'CYCLE' | 'SPOT'
        status: string
        notes: string | null
        areas: Array<{ id: string; name: string; order: number }>
        createdAt: string
        updatedAt: string
      }
    }>('/api/inventory-counts', data)
  },

  // Get all counts
  async getCounts(params?: {
    page?: number
    limit?: number
    status?: string
    locationId?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.locationId) searchParams.append('locationId', params.locationId)

    const endpoint = `/api/inventory-counts${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    return apiClient.get(endpoint)
  },

  // Get active counts (in progress)
  async getActiveCounts() {
    return apiClient.get<{
      success: boolean
      data: {
        counts: Array<{
          id: string
          name: string
          type: 'FULL' | 'CYCLE' | 'SPOT'
          status: 'IN_PROGRESS'
          locationId: string
          location: { id: string; name: string }
          startedAt: string
          areas: Array<{ id: string; name: string; order: number }>
        }>
      }
    }>('/api/inventory-counts?status=IN_PROGRESS')
  },

  // Get recent counts for cleanup (last 50 counts)
  async getRecentCounts() {
    return apiClient.get<{
      success: boolean
      data: {
        counts: Array<{
          id: string
          name: string
          type: 'FULL' | 'CYCLE' | 'SPOT'
          status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
          locationId: string
          location: { id: string; name: string }
          startedAt: string
          completedAt?: string
          areas: Array<{ id: string; name: string; order: number }>
        }>
      }
    }>('/api/inventory-counts?limit=50')
  },

  // Get completed counts awaiting approval
  async getCompletedCounts() {
    return apiClient.get<{
      success: boolean
      data: {
        counts: Array<{
          id: string
          name: string
          type: 'FULL' | 'CYCLE' | 'SPOT'
          status: 'COMPLETED'
          locationId: string
          location: { id: string; name: string }
          startedAt: string
          completedAt: string
          areas: Array<{ id: string; name: string; order: number }>
          itemsCounted?: number
        }>
      }
    }>('/api/inventory-counts?status=COMPLETED')
  },

  // Get specific count
  async getCount(id: string) {
    return apiClient.get(`/api/inventory-counts/${id}`)
  },

  // Update count
  async updateCount(
    id: string,
    data: {
      name?: string
      notes?: string
      status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
    }
  ) {
    return apiClient.put<{
      success: boolean
      data: {
        id: string
        status: string
      }
    }>(`/api/inventory-counts/${id}`, data)
  },

  // Delete count (drafts only)
  async deleteCount(id: string) {
    return apiClient.delete(`/api/inventory-counts/${id}`)
  },

  // Approve completed count and apply to inventory
  async approveCount(id: string) {
    return apiClient.put<{
      success: boolean
      data: {
        id: string
        status: 'APPROVED'
        approvedAt: string
      }
    }>(`/api/inventory-counts/${id}`, { status: 'APPROVED' })
  },

  // Categories
  async getCategories() {
    const response = await apiClient.get<{
      success: boolean
      data: {
        categories: Array<{
          id: string
          name: string
          description?: string
          createdAt: string
          updatedAt: string
        }>
      }
    }>('/api/products/categories')

    if (!response.success || !response.data) {
      throw new Error('Failed to get categories')
    }
    return response.data
  },

  // Product catalog search
  async searchCatalog(params?: { limit?: number; search?: string }) {
    if (!params?.search || params.search.length < 3) {
      return { success: true, data: [] }
    }

    const response = await apiClient.get<{
      success: boolean
      data: Array<{
        id: string
        name: string
        upc: string | null
        unit: string | null
        unitSize: number | null
        caseSize: number | null
        costPerUnit: number | null
        costPerCase: number | null
        image: string | null
        container: string | null
        categoryId: string
        category: {
          id: string
          name: string
        }
      }>
    }>(
      `/api/products/catalog?search=${params.search}&limit=${params.limit || 20}`
    )

    if (!response.success || !response.data) {
      throw new Error('Failed to search product catalog')
    }
    return { success: true, data: response.data }
  },

  // Create product
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
    suppliers?: Array<{
      supplierId: string
      supplierSku?: string
      orderingUnit: 'UNIT' | 'CASE'
      costPerUnit: number
      costPerCase?: number
      minimumOrder: number
      minimumOrderUnit?: 'UNIT' | 'CASE'
      packSize?: number
      leadTimeDays: number
      isPreferred: boolean
    }>
  }) {
    const response = await apiClient.post<{
      success: boolean
      data: {
        id: string
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
        createdAt: string
        updatedAt: string
        suppliers?: Array<{
          id: string
          productId: string
          supplierId: string
          supplierSku?: string
          orderingUnit: 'UNIT' | 'CASE'
          costPerUnit: number
          costPerCase?: number
          minimumOrder: number
          minimumOrderUnit?: 'UNIT' | 'CASE'
          packSize?: number
          leadTimeDays: number
          isPreferred: boolean
          supplier: {
            id: string
            name: string
          }
        }>
      }
    }>('/api/products', data)

    if (!response.success || !response.data) {
      throw new Error('Failed to create product')
    }
    return response.data
  },

  // Suppliers
  async getSuppliers(params?: { active?: boolean; search?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.active !== undefined) {
      queryParams.append('active', params.active.toString())
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }

    const response = await apiClient.get<{
      success: boolean
      data: Array<{
        id: string
        name: string
        contactEmail?: string
        contactPhone?: string
        isActive: boolean
        createdAt: string
        updatedAt: string
      }>
    }>(`/api/suppliers?${queryParams}`)

    if (!response.success || !response.data) {
      throw new Error('Failed to get suppliers')
    }
    return response.data
  },

  // Add product to supplier
  async addProductToSupplier(
    supplierId: string,
    data: {
      productId: string
      orderingUnit: 'UNIT' | 'CASE'
      costPerUnit: number
      costPerCase?: number
      packSize?: number
      minimumOrder: number
      isPreferred: boolean
    }
  ) {
    const response = await apiClient.post<{
      success: boolean
      data: {
        id: string
        supplierId: string
        productId: string
        orderingUnit: 'UNIT' | 'CASE'
        costPerUnit: number
        costPerCase?: number
        packSize?: number
        minimumOrder: number
        isPreferred: boolean
      }
    }>(`/api/suppliers/${supplierId}/products`, data)

    if (!response.success || !response.data) {
      throw new Error('Failed to add product to supplier')
    }
    return response.data
  },

  // Add item to count
  async addCountItem(
    countId: string,
    data: {
      areaId: string
      productId: string
      fullUnits?: number
      partialUnit?: number
      notes?: string
    }
  ) {
    return apiClient.post<{
      success: boolean
      data: {
        id: string
        countId: string
        areaId: string
        productId: string
        fullUnits: number
        partialUnit: number
        notes: string | null
      }
    }>(`/api/inventory-counts/${countId}/items`, data)
  },

  // Update count item
  async updateCountItem(
    countId: string,
    itemId: string,
    data: {
      fullUnits?: number
      partialUnit?: number
      notes?: string
    }
  ) {
    return apiClient.put(
      `/api/inventory-counts/${countId}/items/${itemId}`,
      data
    )
  },

  // Update area status
  async updateAreaStatus(countId: string, areaId: string, status: string) {
    return apiClient.put<{
      success: boolean
      data: any
    }>(`/api/inventory-counts/${countId}/areas/${areaId}`, { status })
  },

  // Delete count item
  async deleteCountItem(countId: string, itemId: string) {
    return apiClient.delete(`/api/inventory-counts/${countId}/items/${itemId}`)
  },

  // Get count report
  async getCountReport(id: string) {
    return apiClient.get(`/api/inventory-counts/${id}/report`)
  },

  // Add area to count
  async addCountArea(countId: string, data: { name: string; order?: number }) {
    return apiClient.post(`/api/inventory-counts/${countId}/areas`, data)
  },

  // Create default areas for count
  async createDefaultAreas(countId: string) {
    return apiClient.post(`/api/inventory-counts/${countId}/areas/default`, {})
  },

  // ==================== ORDER MANAGEMENT ====================

  // Get all orders with optional filtering
  async getOrders(params?: {
    status?: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
    supplierId?: string
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const queryString = searchParams.toString()
    return apiClient.get<{
      success: boolean
      data: Array<{
        id: string
        supplierId: string
        orderNumber: string
        status:
          | 'DRAFT'
          | 'SENT'
          | 'PARTIALLY_RECEIVED'
          | 'RECEIVED'
          | 'CANCELLED'
        orderDate: string
        totalAmount: number
        expectedDate?: string
        notes?: string
        createdAt: string
        updatedAt: string
        supplier: {
          id: string
          name: string
          contactEmail?: string
          contactPhone?: string
        }
        items: Array<{
          id: string
          productId: string
          quantityOrdered: number
          quantityReceived: number
          unitCost: number
          totalCost: number
          orderingUnit: 'UNIT' | 'CASE'
          product: {
            id: string
            name: string
            sku?: string
            caseSize: number
            category: {
              id: string
              name: string
            }
          }
        }>
      }>
      pagination: {
        total: number
        limit: number
        offset: number
      }
    }>(`/api/orders${queryString ? '?' + queryString : ''}`)
  },

  // Get single order by ID
  async getOrder(id: string) {
    return apiClient.get<{
      success: boolean
      data: {
        id: string
        supplierId: string
        orderNumber: string
        status:
          | 'DRAFT'
          | 'SENT'
          | 'PARTIALLY_RECEIVED'
          | 'RECEIVED'
          | 'CANCELLED'
        orderDate: string
        receivedDate?: string
        totalAmount: number
        expectedDate?: string
        notes?: string
        createdAt: string
        updatedAt: string
        supplier: {
          id: string
          name: string
          contactEmail?: string
          contactPhone?: string
        }
        items: Array<{
          id: string
          productId: string
          quantityOrdered: number
          quantityReceived: number
          unitCost: number
          totalCost: number
          orderingUnit: 'UNIT' | 'CASE'
          product: {
            id: string
            name: string
            image?: string
            sku?: string
            caseSize: number
            category: {
              id: string
              name: string
            }
          }
        }>
      }
    }>(`/api/orders/${id}`)
  },

  // Get order suggestions (smart reorder recommendations)
  async getOrderSuggestions() {
    const response = await apiClient.get<{
      success: boolean
      data: Array<{
        supplier: {
          id: string
          name: string
          contactPerson?: string
          email?: string
          phone?: string
        }
        items: Array<{
          product: {
            id: string
            name: string
            brand?: string
            image?: string
            costPerUnit: number
            costPerCase?: number | null
            category: {
              id: string
              name: string
            }
          }
          currentQuantity: number
          minimumQuantity: number
          suggestedQuantity: number
          unitCost: number
          estimatedCost: number
          orderingUnit: 'UNIT' | 'CASE'
          packSize?: number | null
          location: {
            id: string
            name: string
          }
        }>
        totalEstimatedCost: number
      }>
    }>(`/api/orders/suggestions/reorder`)
    return response.data || []
  },

  // Create new order
  async createOrder(data: {
    supplierId: string
    expectedDate?: string
    notes?: string
    items: Array<{
      productId: string
      quantityOrdered: number
      unitCost: number
      orderingUnit: 'UNIT' | 'CASE'
    }>
  }) {
    return apiClient.post(`/api/orders`, data)
  },

  // Update order (status, items, etc.)
  async updateOrder(
    id: string,
    data: {
      status?:
        | 'DRAFT'
        | 'SENT'
        | 'PARTIALLY_RECEIVED'
        | 'RECEIVED'
        | 'CANCELLED'
      expectedDate?: string
      notes?: string
      items?: Array<{
        id?: string
        productId: string
        quantityOrdered: number
        quantityReceived?: number
        unitCost: number
        orderingUnit: 'UNIT' | 'CASE'
      }>
    }
  ) {
    return apiClient.put(`/api/orders/${id}`, data)
  },

  // Delete order (draft orders only)
  async deleteOrder(id: string) {
    return apiClient.delete(`/api/orders/${id}`)
  },

  // Create orders from suggestions (one by one like web app)
  async createOrdersFromSuggestions(
    selectedSuggestions: Array<{
      supplierId: string
      items: Array<{
        productId: string
        quantityOrdered: number
        unitCost: number
        orderingUnit: 'UNIT' | 'CASE'
      }>
      notes?: string
    }>
  ) {
    // Create orders one by one like the web app does
    const results = []
    for (const orderData of selectedSuggestions) {
      const result = await apiClient.post<{
        success: boolean
        data: any
      }>(`/api/orders`, {
        supplierId: orderData.supplierId,
        notes: orderData.notes || 'Generated from reorder suggestions',
        items: orderData.items,
      })
      results.push(result)
    }
    return results
  },
}

// Export the api object for order-related functions
export const api = {
  ...countApi,
  getOrderSuggestions: countApi.getOrderSuggestions,
  createOrder: countApi.createOrder,
  createOrdersFromSuggestions: countApi.createOrdersFromSuggestions,
  getOrders: countApi.getOrders,
  getOrder: countApi.getOrder,
  updateOrder: countApi.updateOrder,
  deleteOrder: countApi.deleteOrder,
}
