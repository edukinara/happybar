import {
  ordersApi,
  type CreateOrderRequest,
  type Order,
  type OrderStatus,
  type UpdateOrderRequest,
} from '@/lib/api/orders'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Re-export types for easier import
export type { CreateOrderRequest, Order, OrderStatus, UpdateOrderRequest }

// Query Keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  suggestions: () => [...orderKeys.all, 'suggestions'] as const,
  analytics: () => [...orderKeys.all, 'analytics'] as const,
} as const

// Orders List Query
export function useOrders(params?: {
  status?: OrderStatus
  supplierId?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}) {
  // Create stable query key by only including defined params
  const stableParams = params
    ? {
        ...(params.status !== undefined && { status: params.status }),
        ...(params.supplierId !== undefined && {
          supplierId: params.supplierId,
        }),
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.offset !== undefined && { offset: params.offset }),
        ...(params.startDate !== undefined && { startDate: params.startDate }),
        ...(params.endDate !== undefined && { endDate: params.endDate }),
      }
    : {}

  return useQuery({
    queryKey: orderKeys.list(stableParams),
    queryFn: () => ordersApi.getOrders(params),
    staleTime: 2 * 60 * 1000, // 2 minutes - orders change frequently
  })
}

// Single Order Query
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn: () => ordersApi.getOrder(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute - order details change frequently during receiving
  })
}

// Reorder Suggestions Query
export function useReorderSuggestions() {
  return useQuery({
    queryKey: orderKeys.suggestions(),
    queryFn: () => ordersApi.getReorderSuggestions(),
    staleTime: 10 * 60 * 1000, // 10 minutes - suggestions don't change that often
  })
}

// Order Analytics Query
export function useOrderAnalytics(params?: {
  startDate?: string
  endDate?: string
  supplierId?: string
}) {
  return useQuery({
    queryKey: [...orderKeys.analytics(), params || {}],
    queryFn: () => ordersApi.getOrderAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create Order Mutation
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.createOrder(data),
    onSuccess: (response) => {
      // Invalidate ALL order-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      // Add new order to cache with correct data structure
      queryClient.setQueryData(orderKeys.detail(response.data.id), response)

      // Also invalidate suggestions since creating an order might affect reorder logic
      queryClient.invalidateQueries({ queryKey: orderKeys.suggestions() })

      // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: orderKeys.analytics() })

      toast.success('Order created successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create order')
    },
  })
}

// Update Order Mutation - Enhanced for receiving workflow
export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersApi.updateOrder(id, data),
    onSuccess: (response, variables) => {
      // Update specific order in cache with the FULL response structure
      // The useOrder hook expects { success: true, data: Order }
      queryClient.setQueryData(orderKeys.detail(variables.id), response)

      // Invalidate ALL order-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      // If order was received, invalidate inventory and dashboard
      if (variables.data.status === 'RECEIVED') {
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: orderKeys.suggestions() })

        toast.success('Order marked as received and inventory updated')
      } else if (variables.data.items) {
        // If items were updated (partial receiving), invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })

        toast.success('Order updated successfully')
      } else {
        toast.success('Order updated successfully')
      }

      // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: orderKeys.analytics() })
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update order')
    },
  })
}

// Delete Order Mutation
export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ordersApi.deleteOrder(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: orderKeys.detail(deletedId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: orderKeys.analytics() })

      toast.success('Order deleted successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete order')
    },
  })
}

// Send Order Mutation
export function useSendOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ordersApi.sendOrder(id),
    onSuccess: (response, orderId) => {
      // Update order in cache with correct data structure
      queryClient.setQueryData(orderKeys.detail(orderId), response)

      // Invalidate ALL order-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      toast.success('Order sent successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to send order')
    },
  })
}

// Receive Order Mutation - Simplified for our new workflow
export function useReceiveOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, receivedDate }: { id: string; receivedDate?: string }) =>
      ordersApi.receiveOrder(id, receivedDate),
    onSuccess: (response, variables) => {
      // Update order in cache with correct data structure
      queryClient.setQueryData(orderKeys.detail(variables.id), response)

      // Invalidate ALL order-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      // Invalidate inventory and dashboard since items were received
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      toast.success('Order marked as received and inventory updated')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to mark order as received')
    },
  })
}

// Cancel Order Mutation
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ordersApi.cancelOrder(id),
    onSuccess: (response, orderId) => {
      // Update order in cache with correct data structure
      queryClient.setQueryData(orderKeys.detail(orderId), response)

      // Invalidate ALL order-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      toast.success('Order cancelled')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to cancel order')
    },
  })
}

// Utility functions
export function usePrefetchOrders() {
  const queryClient = useQueryClient()

  return (params?: Parameters<typeof useOrders>[0]) => {
    queryClient.prefetchQuery({
      queryKey: orderKeys.list(params || {}),
      queryFn: () => ordersApi.getOrders(params),
    })
  }
}

// Helper hook to get orders by status efficiently
export function useOrdersByStatus(status: OrderStatus) {
  return useQuery({
    queryKey: orderKeys.list({ status }),
    queryFn: () => ordersApi.getOrders({ status }),
    staleTime: 2 * 60 * 1000,
  })
}

// Helper hook to get pending orders count for dashboard
export function usePendingOrdersCount() {
  const ordersQuery = useQuery({
    queryKey: orderKeys.list({ status: 'SENT' }),
    queryFn: () => ordersApi.getOrders({ status: 'SENT' }),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.pagination.total, // Only return count
  })

  return ordersQuery
}
