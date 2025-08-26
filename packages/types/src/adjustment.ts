export enum MovementType {
  TRANSFER = 'TRANSFER',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', 
  RECEIVED = 'RECEIVED',
  SOLD = 'SOLD',
  WASTE = 'WASTE',
}

export enum MovementStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AdjustmentReason {
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  FOUND = 'FOUND',
  CORRECTION = 'CORRECTION',
  OTHER = 'OTHER',
}

export interface StockMovement {
  id: string
  organizationId: string
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  type: MovementType
  status: MovementStatus
  reason?: AdjustmentReason
  userId: string
  notes?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  product?: {
    id: string
    name: string
    sku?: string
    costPerUnit: number
  }
  fromLocation?: {
    id: string
    name: string
  }
  toLocation?: {
    id: string
    name: string
  }
  user?: {
    id: string
    name?: string
    email: string
  }
}

export interface AdjustmentRequest {
  productId: string
  locationId: string
  adjustment: number
  reason: AdjustmentReason
  notes?: string
}

export interface AdjustmentResponse {
  inventory: {
    id: string
    currentQuantity: number
  }
  movement: StockMovement
}