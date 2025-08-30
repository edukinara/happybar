import { locationsApi } from '@/lib/api/locations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Query Keys
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
} as const

// Locations List Query - This is the most frequently used
export function useLocations(params?: { includeInactive?: boolean }) {
  // Always use the same stable key for the basic locations query
  // since the API doesn't actually use the includeInactive parameter yet
  const queryKey = locationKeys.lists()
  
  return useQuery({
    queryKey,
    queryFn: () => locationsApi.getLocations(),
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Single Location Query
export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: locationKeys.detail(id!),
    queryFn: async () => {
      // Get single location from the list - API doesn't have individual getLocation
      const locations = await locationsApi.getLocations()
      return locations.find((loc) => loc.id === id) || null
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// Create Location Mutation
export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description?: string; type: string }) =>
      locationsApi.createLocation(data),
    onSuccess: (data) => {
      // Invalidate ALL location-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
      
      // Add new location to cache
      queryClient.setQueryData(locationKeys.detail(data.id), data)
      
      // Invalidate inventory since new location affects inventory views
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Location created successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create location')
    },
  })
}

// Update Location Mutation
export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name: string; description?: string }
    }) => locationsApi.updateLocation(id, data),
    onSuccess: (data, variables) => {
      // Update specific location in cache
      queryClient.setQueryData(locationKeys.detail(variables.id), data)
      
      // Invalidate ALL location-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
      
      // Invalidate inventory since location changes might affect inventory views
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Location updated successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update location')
    },
  })
}

// Delete Location Mutation
export function useDeleteLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => locationsApi.deleteLocation(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: locationKeys.detail(deletedId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() })
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] })

      toast.success('Location deleted successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete location')
    },
  })
}

// Utility function to prefetch locations
export function usePrefetchLocations() {
  const queryClient = useQueryClient()

  return (params?: Parameters<typeof useLocations>[0]) => {
    queryClient.prefetchQuery({
      queryKey: locationKeys.list(params || {}),
      queryFn: () => locationsApi.getLocations(),
    })
  }
}
