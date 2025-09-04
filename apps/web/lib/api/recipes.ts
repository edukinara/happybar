import type {
  CreateRecipeRequest,
  Recipe,
  RecipeCostBreakdown,
  RecipeSearchParams,
  RecipesResponse,
  UpdateRecipeRequest,
} from '@happy-bar/types'
import { apiClient } from './client'
import type { APIRes } from './types'

export const recipesApi = {
  async getRecipes(params?: RecipeSearchParams): Promise<RecipesResponse> {
    const response = await apiClient.get<APIRes<RecipesResponse>>(
      '/api/recipes',
      {
        params,
      }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipes')
    }
    return response.data
  },

  async getRecipe(id: string): Promise<Recipe> {
    const response = await apiClient.get<APIRes<Recipe>>(`/api/recipes/${id}`)
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipe')
    }
    return response.data
  },

  async createRecipe(data: CreateRecipeRequest): Promise<Recipe> {
    const response = await apiClient.post<APIRes<Recipe>>('/api/recipes', data)
    if (!response.success || !response.data) {
      throw new Error('Failed to create recipe')
    }
    return response.data
  },

  async updateRecipe(id: string, data: UpdateRecipeRequest): Promise<Recipe> {
    const response = await apiClient.put<APIRes<Recipe>>(
      `/api/recipes/${id}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update recipe')
    }
    return response.data
  },

  async deleteRecipe(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(
      `/api/recipes/${id}`
    )
    if (!response.success) {
      throw new Error('Failed to delete recipe')
    }
  },

  async getRecipeCostBreakdown(id: string): Promise<RecipeCostBreakdown> {
    const response = await apiClient.get<APIRes<RecipeCostBreakdown>>(
      `/api/recipes/${id}/cost-breakdown`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipe cost breakdown')
    }
    return response.data
  },

  // Recipe POS Mapping functions
  async getRecipeMappingSuggestions(
    integrationId: string
  ): Promise<RecipeMappingSuggestion[]> {
    const response = await apiClient.get<
      APIRes<{ suggestions: RecipeMappingSuggestion[] }>
    >(`/api/recipes/mapping-suggestions/${integrationId}`)
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipe mapping suggestions')
    }
    return response.data.suggestions
  },

  async getRecipePOSMappings(
    params?: RecipePOSMappingSearchParams
  ): Promise<RecipePOSMapping[]> {
    const response = await apiClient.get<
      APIRes<{ mappings: RecipePOSMapping[] }>
    >('/api/recipes/pos-mappings', { params })
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipe POS mappings')
    }
    return response.data.mappings
  },

  async createRecipePOSMapping(
    data: CreateRecipePOSMappingRequest
  ): Promise<RecipePOSMapping> {
    const response = await apiClient.post<
      APIRes<{ mapping: RecipePOSMapping }>
    >('/api/recipes/pos-mappings', data)
    if (!response.success || !response.data) {
      throw new Error('Failed to create recipe POS mapping')
    }
    return response.data.mapping
  },

  async updateRecipePOSMapping(
    id: string,
    data: UpdateRecipePOSMappingRequest
  ): Promise<RecipePOSMapping> {
    const response = await apiClient.put<APIRes<{ mapping: RecipePOSMapping }>>(
      `/api/recipes/pos-mappings/${id}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update recipe POS mapping')
    }
    return response.data.mapping
  },

  async deleteRecipePOSMapping(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<void>>(
      `/api/recipes/pos-mappings/${id}`
    )
    if (!response.success) {
      throw new Error('Failed to delete recipe POS mapping')
    }
  },
}

// Types for recipe mapping
export interface RecipeMappingSuggestion {
  recipeId: string
  posProductId: string
  recipeName: string
  posProductName: string
  confidence: number
  reasons: string[]
}

export interface RecipePOSMapping {
  id: string
  organizationId: string
  recipeId: string
  posProductId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  recipe: Recipe
  posProduct: {
    id: string
    name: string
    category?: string
    integration: {
      id: string
      name: string
      type: string
    }
  }
}

export interface RecipePOSMappingSearchParams {
  integrationId?: string
  recipeId?: string
  posProductId?: string
  isActive?: boolean
}

export interface CreateRecipePOSMappingRequest {
  recipeId: string
  posProductId: string
  isActive?: boolean
}

export interface UpdateRecipePOSMappingRequest {
  recipeId: string
  posProductId: string
  isActive: boolean
}
