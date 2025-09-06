import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await authClient.getSession()

    if (session.data?.session?.token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.token}`,
      }
    }
    
    return {
      'Content-Type': 'application/json',
    }
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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
    return apiClient.post('/api/counts', data)
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

    const endpoint = `/api/counts${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    return apiClient.get(endpoint)
  },

  // Get specific count
  async getCount(id: string) {
    return apiClient.get(`/api/counts/${id}`)
  },

  // Update count
  async updateCount(id: string, data: {
    name?: string
    notes?: string
    status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
  }) {
    return apiClient.put(`/api/counts/${id}`, data)
  },

  // Delete count (drafts only)
  async deleteCount(id: string) {
    return apiClient.delete(`/api/counts/${id}`)
  },

  // Add item to count
  async addCountItem(countId: string, data: {
    areaId: string
    productId: string
    fullUnits?: number
    partialUnit?: number
    notes?: string
  }) {
    return apiClient.post(`/api/counts/${countId}/items`, data)
  },

  // Update count item
  async updateCountItem(countId: string, itemId: string, data: {
    fullUnits?: number
    partialUnit?: number
    notes?: string
  }) {
    return apiClient.put(`/api/counts/${countId}/items/${itemId}`, data)
  },

  // Delete count item
  async deleteCountItem(countId: string, itemId: string) {
    return apiClient.delete(`/api/counts/${countId}/items/${itemId}`)
  },

  // Get count report
  async getCountReport(id: string) {
    return apiClient.get(`/api/counts/${id}/report`)
  },

  // Add area to count
  async addCountArea(countId: string, data: { name: string; order?: number }) {
    return apiClient.post(`/api/counts/${countId}/areas`, data)
  },

  // Create default areas for count
  async createDefaultAreas(countId: string) {
    return apiClient.post(`/api/counts/${countId}/areas/default`, {})
  },
}
