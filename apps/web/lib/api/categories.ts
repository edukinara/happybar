import type { Category } from '@happy-bar/types'
import { apiClient } from './client'

interface APIRes<T> {
  success: boolean
  data: T
}

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<APIRes<{ categories: Category[] }>>(
      '/api/products/categories'
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get categories')
    }
    return response.data.categories
  },

  async createCategory(data: {
    name: string
    description?: string
  }): Promise<Category> {
    const response = await apiClient.post<APIRes<Category>>(
      '/api/products/categories',
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create category')
    }
    return response.data
  },
}
