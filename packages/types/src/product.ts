import { POSProduct, POSSyncStatus } from '.'

export type POSType = 'TOAST' | 'SQUARE' | 'CLOVER' | 'SHOPIFY' | 'LIGHTSPEED'

// Product unit options
export enum ProductUnit {
  ML = 'ml',
  L = 'L',
  FL_OZ = 'fl oz',
  GAL = 'gal',
  G = 'g',
  KG = 'kg',
  LB = 'lb',
  COUNT = 'count',
  CL = 'cl',
  OZ = 'oz',
}

// Product container options
export enum ProductContainer {
  CAN = 'can',
  BOTTLE = 'bottle',
  KEG = 'keg',
  BOX = 'box',
  BAG = 'bag',
  CARTON = 'carton',
  UNIT = 'unit',
  FIRKIN = 'firkin',
  CASK = 'cask',
  GROWLER = 'growler',
  MINI_KEG = 'mini keg',
  POUCH = 'pouch',
  JAR = 'jar',
  BEER_BALL = 'beer ball',
  RESERVED = 'reserved',
  DECANTER = 'decanter',
  CARTRIDGE = 'cartridge',
  FIASCO = 'fiasco',
  BUCKET = 'bucket',
  GLASS = 'glass',
}

// Serving unit options for product mappings (includes product units plus dynamic container option)
export type ServingUnit = ProductUnit | 'unit'

export interface Product {
  id: string
  organizationId: string
  name: string
  sku: string | null
  upc: string | null
  categoryId: string
  unit: ProductUnit
  container: ProductContainer | null
  unitSize: number
  caseSize: number
  costPerUnit: number
  costPerCase: number | null
  sellPrice: number | null
  alcoholContent: number | null
  image: string | null
  isActive: boolean
  posProductId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProductMapping {
  id: string
  organizationId: string
  productId: string
  posProductId: string
  confidence: number
  mappedBy: string | null
  isConfirmed: boolean
  servingUnit: ServingUnit | null
  servingSize: number | null
  createdAt: Date
  updatedAt: Date
}

export type ProductMappingResponse = ProductMapping & {
  product: Product
  posProduct: POSProduct & { integration: Integration }
}

export interface Category {
  id: string
  organizationId: string
  name: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Integration {
  id: string
  organizationId: string
  name: string
  type: POSType
  credentials: any
  isActive: boolean
  lastSyncAt: Date | null
  syncStatus: POSSyncStatus
  syncErrors: any | null
  selectedGroupGuids: any | null
  createdAt: Date
  updatedAt: Date
}

export interface CatalogProduct {
  id: string
  name: string
  upc: string | null
  unit: string | null
  unitSize: number | null
  caseSize: number | null
  costPerUnit: number | null
  costPerCase: number | null
  image: string | null
  container: string | null
  categoryId: string
  category: {
    id: string
    name: string
  }
}
