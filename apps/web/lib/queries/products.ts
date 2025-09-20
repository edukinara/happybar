import * as productsApi from '@/lib/api/products'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Use the exported functions directly

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  categories: ['categories'] as const,
} as const

// Products List Query
export function useProducts(params?: {
  limit?: number
  offset?: number
  search?: string
  category?: string
  locationId?: string
  includeInactive?: boolean
}) {
  // Create stable query key by only including defined params
  const stableParams = params
    ? {
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.offset !== undefined && { offset: params.offset }),
        ...(params.search !== undefined && { search: params.search }),
        ...(params.category !== undefined && { category: params.category }),
        ...(params.locationId !== undefined && {
          locationId: params.locationId,
        }),
        ...(params.includeInactive !== undefined && {
          includeInactive: params.includeInactive,
        }),
      }
    : {}

  return useQuery({
    queryKey: productKeys.list(stableParams),
    queryFn: () => productsApi.getProducts(params),
    staleTime: 10 * 60 * 1000, // 10 minutes - balanced caching
  })
}

export function useCatalog(params?: { limit?: number; search?: string }) {
  // Create stable query key by only including defined params
  const stableParams = params
    ? {
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.search !== undefined && { search: params.search }),
      }
    : {}

  return useQuery({
    queryKey: productKeys.list(stableParams),
    queryFn: () => productsApi.searchCatalog(params),
    staleTime: 10 * 60 * 1000, // 5 minutes
  })
}

// Single Product Query
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id!),
    queryFn: () => productsApi.getProduct(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// Categories Query
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => productsApi.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less frequently
  })
}

// Create Product Mutation
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof productsApi.createProduct>[0]) =>
      productsApi.createProduct(data),
    onSuccess: (response) => {
      // Invalidate ALL product-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: productKeys.all })

      // Invalidate inventory queries since new product affects inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      // Add the new product to cache with correct data structure
      queryClient.setQueryData(
        productKeys.detail(response.product.id),
        response.product
      )

      toast.success('Product created successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create product')
    },
  })
}

// Update Product Mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof productsApi.updateProduct>[1]
    }) => productsApi.updateProduct(id, data),
    onSuccess: (response, variables) => {
      // Update the specific product in cache with correct data structure
      queryClient.setQueryData(
        productKeys.detail(variables.id),
        response.product
      )

      // Invalidate ALL product-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: productKeys.all })

      // Invalidate inventory if product details that affect inventory changed
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Product updated successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update product')
    },
  })
}

// Bulk Update Products Mutation
export function useBulkUpdateProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: productsApi.BulkUpdateProductsRequest) =>
      productsApi.bulkUpdateProducts(data),
    onSuccess: (response) => {
      // Update individual product caches for successful updates
      response.results.forEach((result) => {
        if (result.success && result.product) {
          queryClient.setQueryData(
            productKeys.detail(result.id),
            result.product
          )
        }
      })

      // Invalidate ALL product-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: productKeys.all })

      // Invalidate inventory queries since product changes affect inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      // Show appropriate success/error messages
      const { successful, failed, total } = response
      if (failed === 0) {
        toast.success(
          `Successfully updated ${successful} product${successful !== 1 ? 's' : ''}`
        )
      } else if (successful === 0) {
        toast.error(`Failed to update all ${total} products`)
      } else {
        toast.success(
          `Updated ${successful} of ${total} products (${failed} failed)`
        )

        // Show details of failed updates
        const failedProductIds = response.errors
          .slice(0, 3)
          .map((e) => e.id)
          .join(', ')
        if (response.errors.length <= 3) {
          toast.error(`Failed products: ${failedProductIds}`)
        } else {
          toast.error(
            `Failed products: ${failedProductIds} and ${response.errors.length - 3} more`
          )
        }
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to bulk update products')
    },
  })
}

// Delete Product Mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(deletedId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Product deleted successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete product')
    },
  })
}

// Import from POS Mutation - Uses the existing POS import functionality
export function useImportFromPOS() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { integrationId: string; productIds?: string[] }) =>
      productsApi.importPOSProducts(data),
    onSuccess: () => {
      // Invalidate all product-related queries
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Products imported successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to import products')
    },
  })
}

// Utility function to prefetch products
export function usePrefetchProducts() {
  const queryClient = useQueryClient()

  return (params?: Parameters<typeof useProducts>[0]) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.list(params || {}),
      queryFn: () => productsApi.getProducts(params),
    })
  }
}
