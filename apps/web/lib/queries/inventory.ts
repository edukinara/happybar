import { inventoryApi } from '@/lib/api/inventory'
import type { AdjustmentRequest, InventoryCountStatus } from '@happy-bar/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Query Keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...inventoryKeys.lists(), filters] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  stats: () => [...inventoryKeys.all, 'stats'] as const,
  byLocation: (locationId: string) =>
    [...inventoryKeys.all, 'location', locationId] as const,
  lowStock: () => [...inventoryKeys.all, 'lowStock'] as const,
  counts: () => [...inventoryKeys.all, 'counts'] as const,
  adjustments: () => [...inventoryKeys.all, 'adjustments'] as const,
} as const

// Main Inventory Query
export function useInventory(_params?: {
  locationId?: string
  search?: string
  category?: string
  lowStockOnly?: boolean
  limit?: number
  offset?: number
}) {
  // Always use the same stable key for the basic inventory query
  // since the API doesn't use filter parameters yet
  const queryKey = inventoryKeys.lists()

  return useQuery({
    queryKey,
    queryFn: () => inventoryApi.getInventoryLevels(),
    staleTime: 10 * 60 * 1000, // 2 minutes - inventory changes frequently
  })
}

// Inventory by Location - Critical for dashboard
export function useInventoryByLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.byLocation(locationId!),
    queryFn: () => inventoryApi.getLocationInventory(locationId!),
    enabled: !!locationId,
    staleTime: 10 * 60 * 1000,
  })
}

// Low Stock Items - Used in dashboard and alerts
export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => inventoryApi.getLowStockItems(),
    staleTime: 10 * 60 * 1000, // 5 minutes
  })
}

// Inventory Stats for Dashboard
export function useInventoryStats(locationId?: string) {
  return useQuery({
    queryKey: [...inventoryKeys.stats(), { locationId }],
    queryFn: () => inventoryApi.getDashboardStats(),
    staleTime: 10 * 60 * 1000,
  })
}

// Single Inventory Item
export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.detail(id!),
    queryFn: () => inventoryApi.getProduct(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// Inventory Counts
export function useInventoryCounts(params?: {
  page?: number
  limit?: number
  status?: InventoryCountStatus
  locationId?: string
}) {
  // Create stable query key by only including defined params
  const stableParams = params
    ? {
        ...(params.page !== undefined && { page: params.page }),
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.status !== undefined && { status: params.status }),
        ...(params.locationId !== undefined && {
          locationId: params.locationId,
        }),
      }
    : {}

  return useQuery({
    queryKey: [...inventoryKeys.counts(), stableParams],
    queryFn: () => inventoryApi.getInventoryCounts(params),
    staleTime: 10 * 60 * 1000,
  })
}

// Create Inventory Adjustment
export function useCreateInventoryAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdjustmentRequest) =>
      inventoryApi.createAdjustment(data),
    onSuccess: () => {
      // Invalidate all inventory queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      // Also invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      toast.success('Inventory adjustment created')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create adjustment')
    },
  })
}

// Update Inventory Item
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        name?: string
        sku?: string
        upc?: string
        categoryId?: string
        unit?: string
        container?: string
        unitSize?: number
        caseSize?: number
        costPerUnit?: number
        costPerCase?: number
        sellPrice?: number
        alcoholContent?: number
        image?: string
        supplierId?: string
      }
    }) => inventoryApi.updateProduct(id, data),
    onSuccess: (data, variables) => {
      // Update specific item in cache
      queryClient.setQueryData(inventoryKeys.detail(variables.id), data)
      // Invalidate inventory lists
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() })

      toast.success('Inventory item updated')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update inventory item')
    },
  })
}

// Stock Transfer Mutation
export function useStockTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (_data: {
      fromLocationId: string
      toLocationId: string
      items: Array<{
        productId: string
        quantity: number
      }>
    }) => {
      // Note: transferStock method doesn't exist in current API
      // This would need to be implemented or use existing adjustment methods
      throw new Error('Stock transfer API not implemented yet')
    },
    onSuccess: () => {
      // Invalidate all inventory queries since transfer affects multiple locations
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      toast.success('Stock transfer completed')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to complete stock transfer')
    },
  })
}

// Inventory Count Mutations
export function useStartInventoryCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { locationId: string; name: string }) =>
      inventoryApi.createInventoryCount({ ...data, type: 'physical' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() })
      toast.success('Inventory count started')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to start inventory count')
    },
  })
}

export function useCompleteInventoryCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => inventoryApi.applyCountToInventory(id),
    onSuccess: () => {
      // Completing count affects actual inventory
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      toast.success('Inventory count completed')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to complete inventory count')
    },
  })
}

// Utility functions
export function usePrefetchInventory() {
  const queryClient = useQueryClient()

  return (params?: Parameters<typeof useInventory>[0]) => {
    queryClient.prefetchQuery({
      queryKey: inventoryKeys.list(params || {}),
      queryFn: () => inventoryApi.getInventoryLevels(),
    })
  }
}

// Helper hook to invalidate inventory when needed
export function useInvalidateInventory() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
    invalidateByLocation: (locationId: string) =>
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.byLocation(locationId),
      }),
    invalidateStats: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() }),
    invalidateLowStock: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() }),
  }
}
