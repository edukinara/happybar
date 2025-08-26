enum LocationType {
  STORAGE = 'STORAGE',
  BAR = 'BAR',
  KITCHEN = 'KITCHEN',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  OFFICE = 'OFFICE',
}

export interface Location {
  id: string
  organizationId: string
  name: string
  code: string | null
  type: LocationType
  address: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Zone {
  id: string
  organizationId: string
  locationId: string
  name: string
  code: string
  description: string | null
  temperature: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Aisle {
  id: string
  organizationId: string
  zoneId: string
  name: string
  code: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Shelf {
  id: string
  organizationId: string
  aisleId: string
  name: string
  code: string
  level: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
export interface Bin {
  id: string
  organizationId: string
  shelfId: string
  name: string
  code: string
  barcode: string | null
  maxCapacity: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
