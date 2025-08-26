import type {
  Recipe,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RecipeCostBreakdown,
  RecipesResponse,
  RecipeSearchParams,
} from '@happy-bar/types'
import { apiClient } from './client'

interface APIRes<T> {
  success: boolean
  data: T
}

export const recipesApi = {
  async getRecipes(params?: RecipeSearchParams): Promise<RecipesResponse> {
    const response = await apiClient.get<APIRes<RecipesResponse>>('/api/recipes', {
      params,
    })
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
    const response = await apiClient.put<APIRes<Recipe>>(`/api/recipes/${id}`, data)
    if (!response.success || !response.data) {
      throw new Error('Failed to update recipe')
    }
    return response.data
  },

  async deleteRecipe(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(`/api/recipes/${id}`)
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
}