import type { Location as Loc } from '@happy-bar/types'
import { apiClient } from './client'
import type { APIRes } from './types'

export type Location = Loc

export type LocationsResponse = (Location & {
  _count: {
    inventoryItems: number
  }
})[]

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
    category: {
      id: string
      name: string
    }
  }
  location: Location
}

export interface CreateLocationRequest {
  name: string
  code?: string
  type: string
  address?: string
  description?: string
  businessCloseTime?: string
  timezone?: string
}

export interface UpdateLocationRequest {
  name?: string
  code?: string
  type?: string
  address?: string
  description?: string
  businessCloseTime?: string
  timezone?: string
  isActive?: boolean
}

export interface QuickSetupRequest {
  type: 'BAR' | 'KITCHEN' | 'STORAGE'
}

export const locationsApi = {
  // Get all locations
  async getLocations(): Promise<LocationsResponse> {
    const response =
      await apiClient.get<APIRes<{ locations: LocationsResponse }>>(
        '/api/locations'
      )
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch locations')
    }
    return response.data.locations || []
  },

  // Create location
  async createLocation(data: CreateLocationRequest): Promise<Location> {
    const response = await apiClient.post<APIRes<Location>>(
      '/api/locations',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create location')
    }
    return response.data
  },

  // Update location
  async updateLocation(
    locationId: string,
    data: UpdateLocationRequest
  ): Promise<Location> {
    const response = await apiClient.put<APIRes<Location>>(
      `/api/locations/${locationId}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update location')
    }
    return response.data
  },

  // Delete location
  async deleteLocation(locationId: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(
      `/api/locations/${locationId}`
    )
    if (!response.success) {
      throw new Error('Failed to delete location')
    }
  },

  // Get location inventory
  async getLocationInventory(
    locationId: string
  ): Promise<LocationInventoryItem[]> {
    const response = await apiClient.get<
      APIRes<{ inventoryItems: LocationInventoryItem[] }>
    >(`/api/locations/${locationId}/inventory`)
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch location inventory')
    }
    return response.data.inventoryItems || []
  },

  // Quick setup
  async quickSetup(data: QuickSetupRequest): Promise<{
    location: Location
    message: string
  }> {
    const response = await apiClient.post<
      APIRes<{
        location: Location
        message: string
      }>
    >('/api/locations/quick-setup', data)
    if (!response.success || !response.data) {
      throw new Error('Failed to create quick setup')
    }
    return response.data
  },
}

// Location type display names
export const locationTypeNames = {
  STORAGE: 'Storage',
  BAR: 'Bar',
  KITCHEN: 'Kitchen',
  RETAIL: 'Retail',
  WAREHOUSE: 'Warehouse',
  OFFICE: 'Office',
} as const
