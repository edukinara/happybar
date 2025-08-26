// Alert system types

export interface AlertRule {
  id: string
  organizationId: string
  name: string
  description?: string
  type: AlertType
  isEnabled: boolean
  thresholdType: ThresholdType
  thresholdValue: number
  locationId?: string
  categoryId?: string
  productId?: string
  notifyEmail: boolean
  notifyDashboard: boolean
  cooldownHours: number
  createdAt: string
  updatedAt: string

  // Relations (optional, included when expanded)
  location?: {
    id: string
    name: string
    type: string
  }
  category?: {
    id: string
    name: string
  }
  product?: {
    id: string
    name: string
    sku?: string
  }
  alertCount?: number
}

export interface Alert {
  id: string
  organizationId: string
  ruleId: string
  inventoryItemId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  status: AlertStatus
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  triggerValue?: number
  thresholdValue?: number
  createdAt: string
  updatedAt: string

  // Relations (optional, included when expanded)
  rule?: {
    id: string
    name: string
    type: AlertType
    thresholdType: ThresholdType
    thresholdValue: number
  }
  inventoryItem?: {
    id: string
    currentQuantity: number
    minimumQuantity: number
    product: {
      id: string
      name: string
      sku?: string
      unit: string
    }
    location: {
      id: string
      name: string
      type: string
    }
  }
}

export type AlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVERSTOCKED'
  | 'EXPIRED'
  | 'VARIANCE'
  | 'USAGE_VARIANCE'
  | 'EFFICIENCY_LOW'
  | 'OVERUSE_DETECTED'

export enum ThresholdType {
  QUANTITY = 'QUANTITY',
  PERCENTAGE = 'PERCENTAGE',
  DAYS_SUPPLY = 'DAYS_SUPPLY',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export interface CreateAlertRuleRequest {
  name: string
  description?: string
  type?: AlertType
  isEnabled?: boolean
  thresholdType?: ThresholdType
  thresholdValue: number
  locationId?: string
  categoryId?: string
  productId?: string
  notifyEmail?: boolean
  notifyDashboard?: boolean
  cooldownHours?: number
}

export interface UpdateAlertRuleRequest
  extends Partial<CreateAlertRuleRequest> {}

export interface UpdateAlertStatusRequest {
  status: AlertStatus
}

export interface BulkUpdateAlertStatusRequest {
  alertIds: string[]
  status: Exclude<AlertStatus, 'ACTIVE'>
}

export interface AlertStats {
  total: number
  active: number
  critical: number
  acknowledged: number
  resolved: number
  byType: Array<{
    type: AlertType
    count: number
  }>
  byLocation: Array<{
    locationId: string
    count: number
  }>
}

export interface AlertSummary {
  total: number
  active: number
  critical: number
  recent: Array<{
    id: string
    title: string
    severity: AlertSeverity
    createdAt: string
    inventoryItem: {
      product: {
        name: string
        sku?: string
      }
      location: {
        name: string
      }
    }
  }>
}

export interface AlertListQuery {
  status?: AlertStatus
  location?: string
  type?: AlertType
  severity?: AlertSeverity
  limit?: number
  offset?: number
}

export interface AlertRuleListQuery {
  isEnabled?: boolean
  type?: AlertType
  locationId?: string
  categoryId?: string
}
