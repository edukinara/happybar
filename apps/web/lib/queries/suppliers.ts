import {
  suppliersApi,
  type CreateSupplierRequest,
  type UpdateSupplierRequest,
} from '@/lib/api/suppliers'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Query Keys
export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
} as const

// Suppliers List Query
export function useSuppliers(params?: {
  search?: string
  includeInactive?: boolean
  limit?: number
  offset?: number
}) {
  // Create stable query key by only including defined params
  const stableParams = params ? {
    ...(params.search !== undefined && { search: params.search }),
    ...(params.includeInactive !== undefined && { includeInactive: params.includeInactive }),
    ...(params.limit !== undefined && { limit: params.limit }),
    ...(params.offset !== undefined && { offset: params.offset }),
  } : {}

  return useQuery({
    queryKey: supplierKeys.list(stableParams),
    queryFn: () => suppliersApi.getSuppliers(params),
    staleTime: 10 * 60 * 1000, // 10 minutes - suppliers change less frequently
  })
}

// Single Supplier Query
export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id!),
    queryFn: () => suppliersApi.getSupplier(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// Create Supplier Mutation
export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSupplierRequest) =>
      suppliersApi.createSupplier(data),
    onSuccess: (data) => {
      // Invalidate ALL supplier-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: supplierKeys.all })
      
      // Add new supplier to cache
      queryClient.setQueryData(supplierKeys.detail(data.id), data)
      
      // Invalidate order suggestions since new supplier might affect reordering
      queryClient.invalidateQueries({ queryKey: ['orders', 'suggestions'] })

      toast.success('Supplier created successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create supplier')
    },
  })
}

// Update Supplier Mutation
export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierRequest }) =>
      suppliersApi.updateSupplier(id, data),
    onSuccess: (data, variables) => {
      // Update specific supplier in cache
      queryClient.setQueryData(supplierKeys.detail(variables.id), data)
      
      // Invalidate ALL supplier-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: supplierKeys.all })
      
      // Invalidate order suggestions
      queryClient.invalidateQueries({ queryKey: ['orders', 'suggestions'] })
      
      // Invalidate products if this supplier is associated with products
      queryClient.invalidateQueries({ queryKey: ['products'] })

      toast.success('Supplier updated successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update supplier')
    },
  })
}

// Delete Supplier Mutation
export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => suppliersApi.deleteSupplier(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: supplierKeys.detail(deletedId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() })
      // Invalidate related data
      queryClient.invalidateQueries({ queryKey: ['orders', 'suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })

      toast.success('Supplier deleted successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete supplier')
    },
  })
}

// Utility function to prefetch suppliers
export function usePrefetchSuppliers() {
  const queryClient = useQueryClient()

  return (params?: Parameters<typeof useSuppliers>[0]) => {
    queryClient.prefetchQuery({
      queryKey: supplierKeys.list(params || {}),
      queryFn: () => suppliersApi.getSuppliers(params),
    })
  }
}
