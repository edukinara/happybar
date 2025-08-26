import type { Aisle, Bin, Location as Loc, Shelf, Zone } from '@happy-bar/types'
import { apiClient } from './client'

export type Location = Loc

export type LocationsResponse = (Location & {
  zones: (Zone & {
    aisles: (Aisle & {
      shelves: (Shelf & {
        bins: Bin[]
      })[]
    })[]
  })[]
  _count: {
    inventoryItems: number
  }
})[]

export interface LocationInventoryItem {
  id: string
  organizationId: string
  productId: string
  locationId: string
  zoneId?: string
  aisleId?: string
  shelfId?: string
  binId?: string
  currentQuantity: number
  minimumQuantity: number
  maximumQuantity?: number
  lastCountDate?: string
  lastReceivedDate?: string
  binLocationCode?: string
  locationCode?: string
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
  zone?: Zone
  aisle?: Aisle
  shelf?: Shelf
  bin?: Bin
}

export interface CreateLocationRequest {
  name: string
  code?: string
  type: string
  address?: string
  description?: string
}

export interface UpdateLocationRequest {
  name?: string
  code?: string
  type?: string
  address?: string
  description?: string
  isActive?: boolean
}

export interface CreateZoneRequest {
  name: string
  code: string
  description?: string
  temperature?: string
}

export interface CreateAisleRequest {
  name: string
  code: string
}

export interface CreateShelfRequest {
  name: string
  code: string
  level: number
}

export interface CreateBinRequest {
  name: string
  code: string
  barcode?: string
  maxCapacity?: number
}

export interface QuickSetupRequest {
  locationType: 'BAR' | 'KITCHEN' | 'STORAGE'
}

export const locationsApi = {
  // Get all locations
  async getLocations() {
    try {
      const response = await apiClient.get<{ locations: LocationsResponse }>(
        '/api/locations'
      )
      return response.locations || []
    } catch (_err) {
      console.error('Error fetching locations')
      throw new Error('Failed to fetch locations')
    }
  },

  // Create location
  async createLocation(data: CreateLocationRequest) {
    try {
      const response = await apiClient.post<Location>('/api/locations', data)
      return response
    } catch (_err) {
      console.error('Error creating location')
      throw new Error('Failed to create location')
    }
  },

  // Update location
  async updateLocation(locationId: string, data: UpdateLocationRequest) {
    try {
      const response = await apiClient.put<Location>(
        `/api/locations/${locationId}`,
        data
      )
      return response
    } catch (_err) {
      console.error('Error updating location')
      throw new Error('Failed to update location')
    }
  },

  // Delete location
  async deleteLocation(locationId: string) {
    try {
      await apiClient.delete(`/api/locations/${locationId}`)
    } catch (_err) {
      console.error('Error deleting location')
      throw new Error('Failed to delete location')
    }
  },

  // Create zone
  async createZone(locationId: string, data: CreateZoneRequest) {
    try {
      const response = await apiClient.post<Zone>(
        `/api/locations/${locationId}/zones`,
        data
      )
      return response
    } catch (_err) {
      console.error('Error creating zone')
      throw new Error('Failed to create zone')
    }
  },

  // Create aisle
  async createAisle(zoneId: string, data: CreateAisleRequest) {
    try {
      const response = await apiClient.post<Aisle>(
        `/api/zones/${zoneId}/aisles`,
        data
      )
      return response
    } catch (_err) {
      console.error('Error creating aisle')
      throw new Error('Failed to create aisle')
    }
  },

  // Create shelf
  async createShelf(aisleId: string, data: CreateShelfRequest) {
    try {
      const response = await apiClient.post<Shelf>(
        `/api/aisles/${aisleId}/shelves`,
        data
      )
      return response
    } catch (_err) {
      console.error('Error creating shelf')
      throw new Error('Failed to create shelf')
    }
  },

  // Create bin
  async createBin(shelfId: string, data: CreateBinRequest) {
    try {
      const response = await apiClient.post<Bin & { locationCode: string }>(
        `/api/shelves/${shelfId}/bins`,
        data
      )
      return response
    } catch (_err) {
      console.error('Error creating bin')
      throw new Error('Failed to create bin')
    }
  },

  // Get location inventory
  async getLocationInventory(locationId: string) {
    try {
      const response = await apiClient.get<{
        inventory: LocationInventoryItem[]
      }>(`/api/locations/${locationId}/inventory`)
      return response.inventory || []
    } catch (_err) {
      console.error('Error fetching location inventory')
      throw new Error('Failed to fetch location inventory')
    }
  },

  // Quick setup
  async quickSetup(data: QuickSetupRequest) {
    try {
      const response = await apiClient.post<{
        location: Location
        zones: Zone[]
        message: string
      }>('/api/locations/quick-setup', data)
      return response
    } catch (_err) {
      console.error('Error creating quick setup')
      throw new Error('Failed to create quick setup')
    }
  },
}

// Utility function to generate location code
export function generateLocationCode(hierarchy: {
  locationCode?: string
  zoneCode?: string
  aisleCode?: string
  shelfCode?: string
  binCode?: string
}): string {
  const parts = []

  if (hierarchy.locationCode) parts.push(hierarchy.locationCode)
  if (hierarchy.zoneCode) parts.push(hierarchy.zoneCode)
  if (hierarchy.aisleCode) parts.push(hierarchy.aisleCode)
  if (hierarchy.shelfCode) parts.push(hierarchy.shelfCode)
  if (hierarchy.binCode) parts.push(hierarchy.binCode)

  return parts.join('-')
}

// Utility function to parse location code
export function parseLocationCode(code: string) {
  const parts = code.split('-')
  return {
    locationCode: parts[0] || undefined,
    zoneCode: parts[1] || undefined,
    aisleCode: parts[2] || undefined,
    shelfCode: parts[3] || undefined,
    binCode: parts[4] || undefined,
  }
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

// Temperature type display names
export const temperatureTypes = {
  ambient: 'Ambient (Room Temperature)',
  refrigerated: 'Refrigerated (32-40°F)',
  frozen: 'Frozen (Below 32°F)',
} as const
