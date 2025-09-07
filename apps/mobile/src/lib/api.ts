import { authClient, Session } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

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
}
