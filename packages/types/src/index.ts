// API Types

import type { HappyBarRole } from './auth'
import { ProductContainer } from './product'

export * from './adjustment'
export * from './alert'
export * from './auth'
export * from './inventory'
export * from './inventory-count'
export type { InventoryCount as InventoryCountType } from './inventory-count'
export * from './location'
export * from './pos-toast'
export * from './product'
export * from './recipe'
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Legacy Authentication & Authorization (deprecated - use new RBAC system from './auth')
// TODO: Remove these types once migration to new RBAC system is complete
/*
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
  organizationName: string
  permissions: Permission[]
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum Permission {
  // Inventory
  INVENTORY_READ = 'inventory:read',
  INVENTORY_WRITE = 'inventory:write',
  INVENTORY_COUNT = 'inventory:count',

  // Orders
  ORDERS_READ = 'orders:read',
  ORDERS_WRITE = 'orders:write',
  ORDERS_APPROVE = 'orders:approve',

  // Analytics
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // Admin
  USERS_MANAGE = 'users:manage',
  SETTINGS_MANAGE = 'settings:manage',
  INTEGRATIONS_MANAGE = 'integrations:manage',
}
*/

// Inventory Types
export interface InventoryCount {
  id: string
  name: string
  status: CountStatus
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  progress: {
    total: number
    completed: number
    percentage: number
  }
  variance?: {
    totalItems: number
    totalValue: number
    overageItems: number
    overageValue: number
    shortageItems: number
    shortageValue: number
  }
}

export enum CountStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface CountItemInput {
  productId: string
  locationId: string
  actualQuantity: number
  notes?: string
}

export interface VarianceItem {
  productId: string
  productName: string
  locationName: string
  expected: number
  actual: number
  variance: number
  variancePercent: number
  costImpact: number
  unit: string
}

// POS Integration Types
export interface POSCredentials {
  type: POSType
  apiKey?: string
  apiSecret?: string
  accessToken?: string
  refreshToken?: string
  storeId?: string
}

export interface ToastCredentials extends POSCredentials {
  type: POSType.TOAST
  integrationMode: 'standard' | 'partner'

  // Standard API Access - Direct customer credentials
  clientId?: string | undefined
  clientSecret?: string | undefined

  // Location ID - 6-digit code used in both Standard API Access and Partner Integration
  partnerLocationId?: string | undefined // 6-digit code entered in Toast

  // Token expiration tracking for Standard API Access
  accessTokenExpiresAt?: Date | undefined // When the current access token expires
  accessTokenExpiresIn?: number | undefined // Token validity duration in seconds
}

export enum POSType {
  TOAST = 'TOAST',
  SQUARE = 'SQUARE',
  CLOVER = 'CLOVER',
  SHOPIFY = 'SHOPIFY',
  LIGHTSPEED = 'LIGHTSPEED',
}

export interface POSProduct {
  id: string
  organizationId: string
  integrationId: string
  externalId: string
  name: string
  sku: string | null
  category: string | null
  price: number | null
  servingUnit: string | null
  servingSize: number | null
  isActive: boolean
  lastSyncedAt: Date
  rawData: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface POSSale {
  externalId: string
  timestamp: Date
  totalAmount: number
  items: POSSaleItem[]
}

export interface POSSaleItem {
  productId: string
  name?: string // Optional: name from POS system
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ConvertedPOSProduct {
  externalId: string
  name: string
  sku?: string | null
  category?: string | null
  price?: number | null
  isActive?: boolean
}

export interface SyncResult {
  success: boolean
  productsSync: {
    created: number
    updated: number
    errors: number
    products?: ConvertedPOSProduct[] // Include actual product data
  }
  salesSync?: {
    imported: number
    errors: number
    sales?: POSSale[] // Include actual sales data
  }
  errors: string[] // Made required - always track errors
}

// Analytics Types
export interface VarianceAnalysis {
  period: DateRange
  summary: {
    totalVariance: number
    totalVariancePercent: number
    totalCostImpact: number
    itemsWithVariance: number
    totalItemsCounted: number
  }
  topVariances: VarianceItem[]
  categoryBreakdown: CategoryVariance[]
}

export interface CategoryVariance {
  categoryId: string
  categoryName: string
  totalVariance: number
  totalVariancePercent: number
  costImpact: number
  itemCount: number
}

export interface MenuEngineeringData {
  period: DateRange
  items: MenuEngineeringItem[]
  summary: {
    totalRevenue: number
    averageMargin: number
    totalItems: number
  }
}

export interface MenuEngineeringItem {
  productId: string
  productName: string
  category: string
  salesCount: number
  revenue: number
  costOfGoods: number
  margin: number
  marginPercent: number
  popularityScore: number // 1-100
  profitabilityScore: number // 1-100
  classification: 'star' | 'plow_horse' | 'puzzle' | 'dog'
  recommendations: string[]
}

export interface ForecastData {
  productId: string
  productName: string
  predictions: ForecastPrediction[]
  confidence: number // 0-1
  factors: ForecastFactor[]
}

export interface ForecastPrediction {
  date: Date
  predictedUsage: number
  confidenceInterval: {
    lower: number
    upper: number
  }
}

export interface ForecastFactor {
  type: 'weather' | 'event' | 'seasonal' | 'trend'
  name: string
  impact: number // -1 to 1
  description: string
}

// Utility Types
export interface DateRange {
  start: Date
  end: Date
}

export interface LocationSummary {
  id: string
  name: string
  type: LocationType
  itemCount: number
  totalValue: number
}

export enum LocationType {
  STORAGE = 'STORAGE',
  BAR = 'BAR',
  KITCHEN = 'KITCHEN',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  OFFICE = 'OFFICE',
}

// Dashboard Types
export interface DashboardStats {
  inventory: {
    totalItems: number
    lowStockItems: number
    totalValue: number
    lastCountDate?: Date
  }
  orders: {
    pending: number
    overdue: number
    thisMonth: number
    totalValue: number
  }
  variance: {
    lastCount: {
      totalVariance: number
      costImpact: number
      itemsWithVariance: number
    }
    trend: 'improving' | 'stable' | 'worsening'
  }
  alerts: DashboardAlert[]
}

export interface DashboardAlert {
  id: string
  type: 'low_stock' | 'variance' | 'order_overdue' | 'integration_error'
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string
  createdAt: Date
}

// Search and Filter Types
export interface SearchFilters {
  query?: string
  categories?: string[]
  locations?: string[]
  suppliers?: string[]
  isActive?: boolean
  lowStock?: boolean
  dateRange?: DateRange
}

export interface SortOption {
  field: string
  label: string
  direction: 'asc' | 'desc'
}

// Webhook Types
export interface WebhookPayload {
  event: WebhookEvent
  organizationId: string
  data: unknown
  timestamp: Date
  signature?: string
}

export enum WebhookEvent {
  INVENTORY_COUNT_COMPLETED = 'inventory.count.completed',
  ORDER_STATUS_CHANGED = 'order.status.changed',
  LOW_STOCK_ALERT = 'inventory.low_stock',
  POS_SYNC_COMPLETED = 'pos.sync.completed',
  USER_INVITED = 'user.invited',
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export type POSSyncStatus =
  | 'NEVER_SYNCED'
  | 'SYNCING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PARTIAL_SUCCESS'

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface AutumnCustomerData {
  id: string
  created_at: number
  name: string
  email: string
  fingerprint: string
  stripe_id: string | null
  env: string
  products: AutumnProduct[]
  features: AutumnFeatures
  metadata: AutumnMetadata
}

export interface AutumnProduct {
  id: string
  name: string
  group: string | null
  status: string
  canceled_at: number | null
  started_at: number
  is_default: boolean
  is_add_on: boolean
  version: number
  items: AutumnItem[]
  current_period_start?: number
  current_period_end?: number
}

export interface AutumnItem {
  type: string
  feature_id: string
  feature_type: string
  feature: AutumnFeature
  included_usage: number
  interval: string | null
  interval_count: number
  reset_usage_when_enabled: boolean
  entity_feature_id: string | null
  price?: number
}

export interface AutumnFeature {
  id: string
  name: string
  type: string
  display: AutumnDisplay
}

export interface AutumnDisplay {
  singular: string
  plural: string
}

export interface AutumnFeatures {
  pos_integrations: AutumnPosIntegrations
  team_members: AutumnTeamMembers
  products: AutumnProducts
  locations: AutumnLocations
}

export interface AutumnPosIntegrations {
  id: string
  name: string
  type: string
  unlimited: boolean
  balance: number
  usage: number
  included_usage: number
  next_reset_at: number | null
  interval: string
  interval_count: number
  overage_allowed: boolean
}

export interface AutumnTeamMembers {
  id: string
  name: string
  type: string
  unlimited: boolean
  balance: number
  usage: number
  included_usage: number
  next_reset_at: number | null
  interval: string
  interval_count: number
  overage_allowed: boolean
}

export interface AutumnProducts {
  id: string
  name: string
  type: string
  unlimited: boolean
  balance: number
  usage: number
  included_usage: number
  next_reset_at: number | null
  interval: string
  interval_count: number
  overage_allowed: boolean
}

export interface AutumnLocations {
  id: string
  name: string
  type: string
  unlimited: boolean
  balance: number
  usage: number
  included_usage: number
  next_reset_at: number | null
  interval: string
  interval_count: number
  overage_allowed: boolean
}

export interface AutumnMetadata {}

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: HappyBarRole // Will use HappyBarRole from auth types
  organizationId: string
  organization: Organization
}

export interface Organization {
  id: string
  name: string
  slug: string
  metadata?: unknown
}

export interface AutumnCheckFeature {
  access: {
    allowed: boolean
    customer_id: string
    feature_id: string
    required_balance: number
    code: string
    interval: string
    interval_count: number
    unlimited: boolean
    balance: number
    usage: number
    included_usage: number
    next_reset_at: number | null
    overage_allowed: boolean
  }
}

export interface InventoryProduct {
  id: string
  organizationId: string
  name: string
  sku: string | null
  upc: string | null
  categoryId: string
  unit: string
  container: ProductContainer | null
  unitSize: number
  caseSize: number
  costPerUnit: number
  costPerCase: number | null
  sellPrice: number | null
  alcoholContent: number | null
  isActive: boolean
  posProductId: string | null
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
  }
  inventoryItems: Array<{
    id: string
    currentQuantity: number
    locationId: string
    location: {
      id: string
      name: string
    }
  }>
  mappings?: Array<{ id: string }>
}

export interface SaleSyncStatus {
  id: string
  name: string
  type: POSType
  lastSyncAt: Date | null
  syncStatus: POSSyncStatus
  hasErrors: boolean
  errorCount: number
  daysSinceLastSync: number | null
}
