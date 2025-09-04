import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { recipesApi, type RecipePOSMappingSearchParams, type CreateRecipePOSMappingRequest, type UpdateRecipePOSMappingRequest } from '../api/recipes'

// Query Keys
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: string) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  costBreakdown: (id: string) => [...recipeKeys.detail(id), 'cost-breakdown'] as const,
  posMappings: () => [...recipeKeys.all, 'pos-mappings'] as const,
  posMappingsList: (params: RecipePOSMappingSearchParams) => [...recipeKeys.posMappings(), params] as const,
  mappingSuggestions: (integrationId: string) => [...recipeKeys.all, 'mapping-suggestions', integrationId] as const,
}

// Recipe POS Mapping Suggestions Query
export function useRecipeMappingSuggestions(integrationId: string) {
  return useQuery({
    queryKey: recipeKeys.mappingSuggestions(integrationId),
    queryFn: async () => {
      console.log(`🚀 Fetching recipe suggestions for integration: ${integrationId}`)
      const result = await recipesApi.getRecipeMappingSuggestions(integrationId)
      console.log(`📊 Received ${result.length} recipe suggestions:`, result)
      return result
    },
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.error(`❌ Recipe suggestions API error (attempt ${failureCount}):`, error)
      return failureCount < 3
    },
  })
}

// Recipe POS Mappings Query
export function useRecipePOSMappings(params?: RecipePOSMappingSearchParams) {
  const stableParams = params || {}
  
  return useQuery({
    queryKey: recipeKeys.posMappingsList(stableParams),
    queryFn: () => recipesApi.getRecipePOSMappings(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create Recipe POS Mapping Mutation
export function useCreateRecipePOSMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRecipePOSMappingRequest) =>
      recipesApi.createRecipePOSMapping(data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: recipeKeys.posMappings() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      
      toast.success('Recipe mapping created successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create recipe mapping')
    },
  })
}

// Update Recipe POS Mapping Mutation
export function useUpdateRecipePOSMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecipePOSMappingRequest }) =>
      recipesApi.updateRecipePOSMapping(id, data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: recipeKeys.posMappings() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      
      toast.success('Recipe mapping updated successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update recipe mapping')
    },
  })
}

// Delete Recipe POS Mapping Mutation
export function useDeleteRecipePOSMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => recipesApi.deleteRecipePOSMapping(id),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: recipeKeys.posMappings() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      
      toast.success('Recipe mapping deleted successfully')
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete recipe mapping')
    },
  })
}

// Bulk Create Recipe POS Mappings (from suggestions)
export function useBulkCreateRecipePOSMappings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mappings: CreateRecipePOSMappingRequest[]) => {
      const results = await Promise.allSettled(
        mappings.map(mapping => recipesApi.createRecipePOSMapping(mapping))
      )
      
      const successful = results.filter(result => result.status === 'fulfilled')
      const failed = results.filter(result => result.status === 'rejected')
      
      return {
        successful: successful.length,
        failed: failed.length,
        total: mappings.length,
        errors: failed.map(result => 
          result.status === 'rejected' ? result.reason : null
        ).filter(Boolean)
      }
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: recipeKeys.posMappings() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      
      const { successful, failed, total } = result
      if (failed === 0) {
        toast.success(`Successfully created ${successful} recipe mapping${successful !== 1 ? 's' : ''}`)
      } else if (successful === 0) {
        toast.error(`Failed to create all ${total} recipe mappings`)
      } else {
        toast.success(
          `Created ${successful} of ${total} recipe mappings (${failed} failed)`
        )
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create recipe mappings')
    },
  })
}