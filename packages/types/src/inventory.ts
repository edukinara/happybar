import { CountStatus } from '.'
import type { Location } from './location'
import type { Category, Product } from './product'

export enum InventoryItemCountStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
export interface InventoryItem {
  id: string
  organizationId: string
  productId: string
  locationId: string
  zoneId: string | null
  aisleId: string | null
  shelfId: string | null
  binId: string | null
  currentQuantity: number
  minimumQuantity: number
  maximumQuantity: number | null
  lastCountDate: Date | null
  lastReceivedDate: Date | null
  binLocationCode: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Count {
  id: string
  organizationId: string
  name: string
  status: CountStatus
  scheduledAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  userId: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type InventoryProduct = Product & {
  category: {
    id: string
    organizationId: string
    name: string
    parentId: string | null
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  inventoryItems: (InventoryItem & {
    location: Location
  })[]
  mappings: { id: string }
}

export interface InventoryLevel extends InventoryItem {
  product: Product & {
    category: Category
  }
  location: Location
}

export interface InventoryCount extends Count {
  itemsCount: number
  user: {
    name: string | null
  }
  _count: {
    items: number
  }
}

export interface LowStockItem extends InventoryItem {
  product: Product & {
    category: Category
  }
  location: Location
}
