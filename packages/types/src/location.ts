export enum LocationType {
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

