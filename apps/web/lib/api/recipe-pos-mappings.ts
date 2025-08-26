import type {
  RecipePOSMapping,
  CreateRecipePOSMappingRequest,
  UpdateRecipePOSMappingRequest,
  RecipePOSMappingsResponse,
} from '@happy-bar/types'
import { apiClient } from './client'

interface APIRes<T> {
  success: boolean
  data: T
}

export const recipePOSMappingsApi = {
  async getMappings(params?: {
    page?: number
    limit?: number
    search?: string
    recipeId?: string
    posProductId?: string
    isActive?: boolean
  }): Promise<RecipePOSMappingsResponse> {
    const response = await apiClient.get<APIRes<RecipePOSMappingsResponse>>('/api/recipe-pos-mappings', {
      params,
    })
    if (!response.success || !response.data) {
      throw new Error('Failed to get recipe POS mappings')
    }
    return response.data
  },

  async createMapping(data: CreateRecipePOSMappingRequest): Promise<RecipePOSMapping> {
    const response = await apiClient.post<APIRes<RecipePOSMapping>>('/api/recipe-pos-mappings', data)
    if (!response.success || !response.data) {
      throw new Error('Failed to create recipe POS mapping')
    }
    return response.data
  },

  async updateMapping(id: string, data: UpdateRecipePOSMappingRequest): Promise<RecipePOSMapping> {
    const response = await apiClient.put<APIRes<RecipePOSMapping>>(`/api/recipe-pos-mappings/${id}`, data)
    if (!response.success || !response.data) {
      throw new Error('Failed to update recipe POS mapping')
    }
    return response.data
  },

  async deleteMapping(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(`/api/recipe-pos-mappings/${id}`)
    if (!response.success) {
      throw new Error('Failed to delete recipe POS mapping')
    }
  },

  async getAvailableRecipes(): Promise<Array<{
    id: string
    name: string
    yield: number
    totalCost?: number
    costPerServing?: number
  }>> {
    const response = await apiClient.get<APIRes<Array<{
      id: string
      name: string
      yield: number
      totalCost?: number
      costPerServing?: number
    }>>>('/api/recipe-pos-mappings/available-recipes')
    if (!response.success || !response.data) {
      throw new Error('Failed to get available recipes')
    }
    return response.data
  },

  async getAvailablePOSProducts(): Promise<Array<{
    id: string
    name: string
    externalId: string
    category: string | null
    price: number | null
    servingUnit: string | null
    servingSize: number | null
  }>> {
    const response = await apiClient.get<APIRes<Array<{
      id: string
      name: string
      externalId: string
      category: string | null
      price: number | null
      servingUnit: string | null
      servingSize: number | null
    }>>>('/api/recipe-pos-mappings/available-pos-products')
    if (!response.success || !response.data) {
      throw new Error('Failed to get available POS products')
    }
    return response.data
  },
}