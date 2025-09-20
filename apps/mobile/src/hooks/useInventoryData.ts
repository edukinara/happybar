import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, countApi } from '../lib/api'

// Types for inventory data
export interface Location {
  id: string
  name: string
  organizationId: string
  createdAt: string
  updatedAt: string
  _count?: {
    inventoryItems: number
  }
}

// Basic Product type (matches backend)
export interface Product {
  id: string
  name: string
  sku: string | null
  upc: string | null
  categoryId: string
  unit: string
  container: string | null
  unitSize: number
  caseSize: number
  costPerUnit: number
  costPerCase: number | null
  sellPrice: number | null
  alcoholContent: number | null
  image: string | null
  isActive: boolean
  posProductId: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
  category?: {
    id: string
    name: string
  }
}

// Inventory Product with inventory items (for counting)
export interface InventoryProduct extends Product {
  inventoryItems: Array<{
    id: string
    productId: string
    locationId: string
    currentQuantity: number
    minimumQuantity: number
    maximumQuantity: number | null
    location: {
      id: string
      name: string
    }
  }>
}

export interface ProductByUPC {
  id: string
  name: string
  upc: string | null
  image: string | null
  caseSize: number
  unitSize: number
  unit: string
  costPerUnit: number
  costPerCase: number | null
  container: string | null
  categoryId: string
  organizationId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  sku: string | null
  sellPrice: number | null
  alcoholContent: number | null
  posProductId: string | null
  category: {
    id: string
    name: string
  }
  inventoryItems: {
    id: string
    location: {
      id: string
      name: string
    }
    currentQuantity: number
    minimumQuantity: number
    maximumQuantity: number | null
  }[]
}

export interface InventoryLevel {
  id: string
  productId: string
  locationId: string
  currentQuantity: number
  parLevel?: number
  maxLevel?: number
  reorderPoint?: number
  updatedAt: string
  product?: Product
}

export interface LowStockItem {
  id: string
  productId: string
  locationId: string
  currentQuantity: number
  parLevel: number
  shortage: number
  product: Product
}

export interface InventoryCount {
  id: string
  locationId: string
  status: 'active' | 'completed' | 'cancelled'
  startedAt: string
  completedAt?: string
  createdBy: string
  itemsCount: number
  completedItemsCount: number
}

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: string) => [...inventoryKeys.products(), id] as const,
  levels: () => [...inventoryKeys.all, 'levels'] as const,
  lowStock: () => [...inventoryKeys.all, 'low-stock'] as const,
  counts: () => [...inventoryKeys.all, 'counts'] as const,
  count: (id: string) => [...inventoryKeys.counts(), id] as const,
}

// Products hooks - returns InventoryProduct with inventory items
export const useProducts = () => {
  return useQuery({
    queryKey: inventoryKeys.products(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: {
          products: InventoryProduct[]
          pagination: {
            page: number
            limit: number
            total: number
            pages: number
          }
        }
      }>('/api/products')
      return response.data.products
    },
  })
}

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Product }>(
        `/api/inventory/products/${id}`
      )
      return response.data
    },
    enabled: !!id,
  })
}

export const useProductByUPC = (_upc: string) => {
  // remove leading 0s
  const upc = _upc.trim().replace(/^0+/, '') || '0'
  return useQuery({
    queryKey: [...inventoryKeys.products(), 'upc', upc],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: { product: ProductByUPC }
      }>(`/api/inventory/products/upc/${upc}`)
      return response.success && response.data.product
        ? response.data.product
        : null
    },
    enabled: !!upc,
    retry: false, // Don't retry if UPC not found
  })
}

// Inventory levels hooks
export const useInventoryLevels = () => {
  return useQuery({
    queryKey: inventoryKeys.levels(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: InventoryLevel[]
      }>('/api/inventory/levels')
      return response.data
    },
  })
}

// Low stock items
export const useLowStockItems = () => {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: LowStockItem[]
      }>('/api/inventory/low-stock')
      return response.data
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// Inventory counts
export const useInventoryCounts = () => {
  return useQuery({
    queryKey: inventoryKeys.counts(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: InventoryCount[]
      }>('/api/inventory-counts')
      return response.data
    },
  })
}

export const useInventoryCount = (id: string) => {
  return useQuery({
    queryKey: inventoryKeys.count(id),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: InventoryCount
      }>(`/api/inventory-counts/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Categories hook
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return countApi.getCategories()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less frequently
  })
}

// Catalog search hook
export const useCatalog = (params?: { limit?: number; search?: string }) => {
  // Create stable query key by only including defined params
  const stableParams = params
    ? {
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.search !== undefined && { search: params.search }),
      }
    : {}

  return useQuery({
    queryKey: ['catalog', stableParams],
    queryFn: async () => {
      const response = await countApi.searchCatalog(params)
      return response.data
    },
    enabled: !!(params?.search && params.search.length >= 3),
    staleTime: 10 * 60 * 1000, // 5 minutes
  })
}

// Suppliers hook
export const useSuppliers = (params?: {
  active?: boolean
  search?: string
}) => {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      return countApi.getSuppliers(params)
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - suppliers change less frequently
  })
}

// Mutations
export const useCreateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      sku?: string
      upc?: string
      categoryId: string
      unit: string
      container?: string
      unitSize?: number
      caseSize?: number
      costPerUnit: number
      costPerCase?: number
      sellPrice?: number
      alcoholContent?: number
      image?: string
      suppliers?: Array<{
        supplierId: string
        supplierSku?: string
        orderingUnit: 'UNIT' | 'CASE'
        costPerUnit: number
        costPerCase?: number
        minimumOrder: number
        minimumOrderUnit?: 'UNIT' | 'CASE'
        packSize?: number
        leadTimeDays: number
        isPreferred: boolean
      }>
    }) => {
      return countApi.createProduct(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<Product>
    }) => {
      const response = await apiClient.put<{ success: boolean; data: Product }>(
        `/api/inventory/products/${id}`,
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.product(data.id),
      })
    },
  })
}

export const useUpdateInventoryLevel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      productId: string
      locationId: string
      quantity: number
    }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        '/api/inventory/levels',
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.levels() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() })
    },
  })
}

export const useStartInventoryCount = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { locationId: string }) => {
      const response = await apiClient.post<{
        success: boolean
        data: InventoryCount
      }>('/api/inventory-counts', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() })
    },
  })
}

// Locations hook
export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data: { locations: Location[] }
      }>('/api/locations')
      return response.data.locations
    },
  })
}

// Completed counts hook for approval
export const useCompletedCounts = () => {
  return useQuery({
    queryKey: ['completed-counts'],
    queryFn: async () => {
      const response = await countApi.getCompletedCounts()
      return response.data.counts
    },
    refetchInterval: 30000, // Refetch every 30 seconds to stay current
  })
}

// Count approval mutation
export const useApproveCount = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (countId: string) => {
      const response = await countApi.approveCount(countId)
      return response.data
    },
    onSuccess: () => {
      // Invalidate completed counts and general counts queries
      queryClient.invalidateQueries({ queryKey: ['completed-counts'] })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() })
    },
  })
}
