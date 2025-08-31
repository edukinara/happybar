import type {
  Category,
  InventoryProduct,
  POSProduct,
  Product,
  ProductMappingResponse,
} from '@happy-bar/types'
import { apiClient } from './client'

// Re-export types for convenience
export type { Category, POSProduct, Product, ProductMappingResponse }

export interface MappingSuggestion {
  productId: string
  posProductId: string
  productName: string
  posProductName: string
  confidence: number
  reasons: string[]
}

export interface ProductsResponse {
  products: InventoryProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface APIRes<T> {
  success: boolean
  data: T
}

// Product API functions
export async function getProducts(params?: {
  page?: number
  limit?: number
  category?: string
  search?: string
  isActive?: boolean
}): Promise<ProductsResponse> {
  const response = await apiClient.get<APIRes<ProductsResponse>>(
    '/api/products',
    {
      params,
    }
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to fetch products')
  }
}

export async function getProduct(id: string): Promise<{ product: Product }> {
  const response = await apiClient.get<APIRes<{ product: Product }>>(
    `/api/products/${id}`
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to fetch product')
  }
}

export async function createProduct(
  product: Omit<
    Product,
    'id' | 'createdAt' | 'updatedAt' | 'category' | 'mappings'
  >
): Promise<{ product: Product }> {
  const response = await apiClient.post<APIRes<{ product: Product }>>(
    '/api/products',
    product
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to create product')
  }
}

export async function updateProduct(
  id: string,
  product: Partial<
    Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'mappings'>
  >
): Promise<{ product: Product }> {
  const response = await apiClient.put<APIRes<{ product: Product }>>(
    `/api/products/${id}`,
    product
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to update product')
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(
    `/api/products/${id}`
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success !== undefined) {
    return { success: response.success }
  } else {
    // If no explicit success field, assume success if no error was thrown
    return { success: true }
  }
}

// POS Product API functions
export async function getPOSProducts(params?: {
  integrationId?: string
  unmappedOnly?: boolean
  search?: string
  category?: string
}): Promise<{ posProducts: POSProduct[] }> {
  const response = await apiClient.get<APIRes<{ posProducts: POSProduct[] }>>(
    '/api/products/pos-products',
    { params }
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to fetch POS products')
  }
}

export async function importPOSProducts(data: {
  integrationId: string
  productIds?: string[]
  categoryFilter?: string
  selectedGroupGuids?: string[]
  autoMap?: boolean
}): Promise<{
  success: boolean
  imported: number
  autoMapped?: number
  suggestions?: MappingSuggestion[]
}> {
  const response = await apiClient.post<
    APIRes<{
      success: boolean
      imported: number
      autoMapped?: number
      suggestions?: MappingSuggestion[]
    }>
  >('/api/products/import-pos-products', data)

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to import POS products')
  }
}

// Product Mapping API functions
export async function getProductMappings(params?: {
  integrationId?: string
  productId?: string
  unconfirmedOnly?: boolean
}): Promise<{ mappings: ProductMappingResponse[] }> {
  const response = await apiClient.get<
    APIRes<{ mappings: ProductMappingResponse[] }>
  >('/api/products/mappings', { params })

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to fetch product mappings')
  }
}

export async function createProductMapping(mapping: {
  productId: string
  posProductId: string
  isConfirmed?: boolean
  servingUnit?: string
  servingSize?: number
}): Promise<{ mapping: ProductMappingResponse }> {
  const response = await apiClient.post<
    APIRes<{ mapping: ProductMappingResponse }>
  >('/api/products/mappings', mapping)

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to create product mapping')
  }
}

export async function updateProductMapping(
  id: string,
  mapping: {
    productId: string
    posProductId: string
    isConfirmed?: boolean
    servingUnit?: string
    servingSize?: number
  }
): Promise<{ mapping: ProductMappingResponse }> {
  const response = await apiClient.put<
    APIRes<{ mapping: ProductMappingResponse }>
  >(`/api/products/mappings/${id}`, mapping)

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to update product mapping')
  }
}

export async function deleteProductMapping(
  id: string
): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(
    `/api/products/mappings/${id}`
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success !== undefined) {
    return { success: response.success }
  } else {
    // If no explicit success field, assume success if no error was thrown
    return { success: true }
  }
}

export async function getMappingSuggestions(
  integrationId: string
): Promise<{ suggestions: MappingSuggestion[] }> {
  const response = await apiClient.get<
    APIRes<{ suggestions: MappingSuggestion[] }>
  >(`/api/products/mapping-suggestions/${integrationId}`)

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    // Wrapped format: { success: true, data: { suggestions: [] } }
    return response.data
  } else {
    throw new Error('Failed to fetch mapping suggestions')
  }
}

export async function bulkCreateProductsFromPOS(data: {
  integrationId: string
  posProductIds: string[]
  categoryId?: string
  defaultUnit?: string
  defaultUnitSize?: number
  defaultCaseSize?: number
  defaultContainer?: string
  defaultServingUnit?: string
  defaultServingSize?: number
}): Promise<{
  success: boolean
  created: number
  mapped: number
  errors: number
  errorMessages: string[]
  products: Product[]
}> {
  const response = await apiClient.post<
    APIRes<{
      success: boolean
      created: number
      mapped: number
      errors: number
      errorMessages: string[]
      products: Product[]
    }>
  >('/api/products/bulk-create-from-pos', data)

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to bulk create products from POS')
  }
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  const response = await apiClient.get<APIRes<{ categories: Category[] }>>(
    '/api/products/categories'
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to fetch categories')
  }
}

export async function updatePOSProductServing(
  id: string,
  data: {
    servingUnit?: string
    servingSize?: number
  }
): Promise<{ posProduct: POSProduct }> {
  const response = await apiClient.patch<APIRes<{ posProduct: POSProduct }>>(
    `/api/products/pos-products/${id}`,
    data
  )

  // Handle both wrapped and unwrapped response formats
  if (response.success && response.data) {
    return response.data
  } else {
    throw new Error('Failed to update POS product serving information')
  }
}
