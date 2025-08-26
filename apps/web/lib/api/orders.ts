const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Order {
  id: string
  organizationId: string
  supplierId: string
  orderNumber: string
  status: OrderStatus
  orderDate: string
  expectedDate?: string
  receivedDate?: string
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  supplier: Supplier
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
  createdAt: string
  updatedAt: string
  product: {
    id: string
    name: string
    sku?: string
    category: {
      id: string
      name: string
    }
  }
}

export interface Supplier {
  id: string
  organizationId: string
  name: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  terms?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type OrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'

export interface CreateOrderRequest {
  supplierId: string
  expectedDate?: string
  notes?: string
  items: Array<{
    productId: string
    quantityOrdered: number
    unitCost?: number
    orderingUnit?: 'UNIT' | 'CASE'
  }>
}

export interface UpdateOrderRequest {
  status?: OrderStatus
  receivedDate?: string
  notes?: string
  items?: Array<{
    id?: string
    productId: string
    quantityOrdered?: number
    quantityReceived?: number
    unitCost?: number
  }>
}

export interface OrderSuggestion {
  supplier: Supplier
  items: Array<{
    product: {
      id: string
      name: string
      sku?: string
      category: { name: string }
      costPerUnit?: number
      costPerCase?: number
    }
    currentQuantity: number
    minimumQuantity: number
    suggestedQuantity: number
    unitCost: number
    estimatedCost: number
    orderingUnit?: 'UNIT' | 'CASE'
    packSize?: number
    location: {
      id: string
      name: string
    }
  }>
  totalEstimatedCost: number
}

export interface OrderAnalytics {
  ordersByStatus: Array<{
    status: OrderStatus
    count: number
    totalAmount: number
  }>
  supplierAnalytics: Array<{
    supplier: Supplier
    totalSpend: number
    orderCount: number
  }>
  totalOrders: number
  totalSpend: number
}

export interface OrdersResponse {
  success: boolean
  data: Order[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

class OrdersAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Get all orders with filtering and pagination
  async getOrders(params?: {
    status?: OrderStatus
    supplierId?: string
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }): Promise<OrdersResponse> {
    const searchParams = new URLSearchParams()

    if (params?.status) searchParams.append('status', params.status)
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const url = `/api/orders${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.fetchWithAuth(url)
  }

  // Get single order by ID
  async getOrder(id: string): Promise<{ success: boolean; data: Order }> {
    return this.fetchWithAuth(`/api/orders/${id}`)
  }

  // Create new order
  async createOrder(
    order: CreateOrderRequest
  ): Promise<{ success: boolean; data: Order }> {
    return this.fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    })
  }

  // Update order
  async updateOrder(
    id: string,
    updates: UpdateOrderRequest
  ): Promise<{ success: boolean; data: Order }> {
    return this.fetchWithAuth(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Delete order (only DRAFT orders)
  async deleteOrder(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return this.fetchWithAuth(`/api/orders/${id}`, {
      method: 'DELETE',
    })
  }

  // Get reorder suggestions based on inventory levels
  async getReorderSuggestions(): Promise<{
    success: boolean
    data: OrderSuggestion[]
  }> {
    return this.fetchWithAuth('/api/orders/suggestions/reorder')
  }

  // Get order analytics
  async getOrderAnalytics(params?: {
    startDate?: string
    endDate?: string
    supplierId?: string
  }): Promise<{ success: boolean; data: OrderAnalytics }> {
    const searchParams = new URLSearchParams()

    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId)

    const url = `/api/orders/analytics/summary${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.fetchWithAuth(url)
  }

  // Helper methods for order status management
  async sendOrder(id: string): Promise<{ success: boolean; data: Order }> {
    return this.updateOrder(id, { status: 'SENT' })
  }

  async confirmOrder(id: string): Promise<{ success: boolean; data: Order }> {
    return this.updateOrder(id, { status: 'CONFIRMED' })
  }

  async receiveOrder(
    id: string,
    receivedDate?: string
  ): Promise<{ success: boolean; data: Order }> {
    return this.updateOrder(id, {
      status: 'RECEIVED',
      receivedDate: receivedDate || new Date().toISOString(),
    })
  }

  async cancelOrder(id: string): Promise<{ success: boolean; data: Order }> {
    return this.updateOrder(id, { status: 'CANCELLED' })
  }
}

export const ordersApi = new OrdersAPI()
