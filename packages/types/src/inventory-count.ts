// Inventory Count Types

export enum CountType {
  FULL = 'FULL',    // Complete inventory count
  SPOT = 'SPOT',    // Quick count of specific items  
  CYCLE = 'CYCLE',  // Rotating count of different areas
}

export enum InventoryCountStatus {
  DRAFT = 'DRAFT',               // Not started
  IN_PROGRESS = 'IN_PROGRESS',   // Currently counting
  COMPLETED = 'COMPLETED',       // Counting done, pending approval
  APPROVED = 'APPROVED',         // Approved and finalized
}

export enum AreaStatus {
  PENDING = 'PENDING',     // Not started
  COUNTING = 'COUNTING',   // Currently being counted
  COMPLETED = 'COMPLETED', // Area count complete
}

export interface InventoryCount {
  id: string
  organizationId: string
  locationId: string
  name: string
  type: CountType
  status: InventoryCountStatus
  startedAt: Date
  completedAt?: Date
  approvedAt?: Date
  approvedById?: string
  totalValue: number
  itemsCounted: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  location?: {
    id: string
    name: string
    code?: string
  }
  approvedBy?: {
    id: string
    name?: string
    email: string
  }
  areas?: CountArea[]
}

export interface CountArea {
  id: string
  countId: string
  name: string
  order: number
  status: AreaStatus
  
  // Relations
  items?: InventoryCountItem[]
}

export interface InventoryCountItem {
  id: string
  areaId: string
  productId: string
  fullUnits: number
  partialUnit: number      // 0.0 to 0.9 for tenthing
  totalQuantity: number    // fullUnits + partialUnit
  expectedQty?: number     // Par level or previous count
  variance?: number        // totalQuantity - expectedQty
  unitCost?: number        // Cost per unit at time of count
  totalValue?: number      // totalQuantity * unitCost
  notes?: string
  countedById: string
  countedAt: Date
  
  // Relations
  product?: {
    id: string
    name: string
    sku?: string
    unit: string
    container?: string
    unitSize: number
  }
  countedBy?: {
    id: string
    name?: string
    email: string
  }
}

// API Request/Response Types

export interface CreateInventoryCountRequest {
  locationId: string
  name?: string
  type: CountType
  notes?: string
}

export interface CreateInventoryCountResponse {
  count: InventoryCount
}

export interface UpdateInventoryCountRequest {
  name?: string
  notes?: string
  status?: InventoryCountStatus
}

export interface AddCountAreaRequest {
  name: string
  order?: number
}

export interface AddCountItemRequest {
  areaId: string
  productId: string
  fullUnits: number
  partialUnit?: number
  notes?: string
}

export interface UpdateCountItemRequest {
  fullUnits?: number
  partialUnit?: number
  notes?: string
}

export interface CountItemVariance {
  productId: string
  productName: string
  areaName: string
  totalQuantity: number
  expectedQty?: number
  variance?: number
  variancePercent?: number
  unitCost?: number
  varianceValue?: number
}

export interface CountSummary {
  totalItems: number
  totalValue: number
  areasCompleted: number
  totalAreas: number
  significantVariances: CountItemVariance[]
  progressPercent: number
}

export interface CountReport {
  count: InventoryCount
  summary: CountSummary
  itemsByArea: {
    area: CountArea
    items: InventoryCountItem[]
    subtotal: number
  }[]
  variances: CountItemVariance[]
}

// Storage Area Templates
export interface StorageAreaTemplate {
  id: string
  organizationId: string
  name: string
  areas: string[] // Array of area names
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateStorageAreaTemplateRequest {
  name: string
  areas: string[]
  isDefault?: boolean
}

// Default storage areas based on research
export const DEFAULT_STORAGE_AREAS = [
  'Behind Bar',
  'Back Bar', 
  'Liquor Storage',
  'Beer Cooler',
  'Walk-in Cooler',
  'Wine Cellar',
  'Dry Storage',
  'Speed Rail',
  'Display Cooler',
  'Prep Area'
] as const

export type DefaultStorageArea = typeof DEFAULT_STORAGE_AREAS[number]