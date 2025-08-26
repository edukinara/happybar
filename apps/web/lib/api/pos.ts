import type { POSSyncStatus, POSType } from '@happy-bar/types'
import { apiClient } from './client'

export interface POSIntegration {
  id: string
  name: string
  type: POSType
  isActive: boolean
  lastSyncAt?: string
  syncStatus: POSSyncStatus
  syncErrors?: string[]
  selectedGroupGuids?: string[]
  createdAt: string
  updatedAt: string
}

interface ToastCredentials {
  name: string
  type: POSType.TOAST
  integrationMode: 'standard' | 'partner'
  // Standard API Access
  clientId?: string
  clientSecret?: string
  // Location ID - 6-digit code used in both Standard API Access and Partner Integration
  partnerLocationId?: string
}

interface SyncRequest {
  integrationId: string
  syncSales?: boolean
  selectedGroupGuids?: string[]
  salesDateRange?: {
    start: string
    end: string
  }
}

interface MenuGroup {
  guid: string
  name: string
  items: unknown[]
}

interface SyncResult {
  success: boolean
  productsSync: {
    created: number
    updated: number
    errors: number
  }
  salesSync?: {
    imported: number
    errors: number
  }
  errors?: string[]
}

interface APIRes<T> {
  success: boolean
  data: T
}

export type { MenuGroup }

export const posApi = {
  async getIntegrations(): Promise<POSIntegration[]> {
    const response = await apiClient.get<APIRes<POSIntegration[]>>(
      '/api/pos/integrations'
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get POS integrations')
    }
    return response.data
  },

  async createIntegration(
    credentials: ToastCredentials
  ): Promise<POSIntegration> {
    const response = await apiClient.post<APIRes<POSIntegration>>(
      '/api/pos/integrations',
      credentials
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to create POS integration')
    }
    return response.data
  },

  async updateIntegration(
    id: string,
    updates: Partial<ToastCredentials>
  ): Promise<POSIntegration> {
    const response = await apiClient.put<APIRes<POSIntegration>>(
      `/api/pos/integrations/${id}`,
      updates
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update POS integration')
    }
    return response.data
  },

  async deleteIntegration(id: string): Promise<void> {
    const response = await apiClient.delete<{
      success: boolean
      message: string
    }>(`/api/pos/integrations/${id}`)
    if (!response.success) {
      throw new Error('Failed to delete POS integration')
    }
  },

  async testConnection(id: string): Promise<{
    success: boolean
    error?: string
    data?: { connectionTest: boolean | string; restaurantCount?: number }
  }> {
    const response = await apiClient.post<
      APIRes<{
        connectionTest: boolean
        restaurantCount?: number
      }>
    >(`/api/pos/integrations/${id}/test`)
    if (!response.success) {
      throw new Error('Failed to test connection')
    }
    return response
  },

  async generateLocationCode(): Promise<{
    locationCode: string
    formattedCode: string
  }> {
    const response = await apiClient.post<
      APIRes<{
        locationCode: string
        formattedCode: string
      }>
    >('/api/pos/generate-location-code')
    if (!response.success || !response.data) {
      throw new Error('Failed to generate location code')
    }
    return response.data
  },

  async syncData(syncRequest: SyncRequest): Promise<SyncResult> {
    const response = await apiClient.post<APIRes<SyncResult>>(
      '/api/pos/sync',
      syncRequest
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to sync POS data')
    }
    return response.data
  },

  async getMenuGroups(integrationId: string): Promise<MenuGroup[]> {
    const response = await apiClient.get<APIRes<MenuGroup[]>>(
      `/api/pos/integrations/${integrationId}/menu-groups`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to get menu groups')
    }
    return response.data
  },

  async updateSelectedGroups(
    integrationId: string,
    selectedGroupGuids: string[]
  ): Promise<POSIntegration> {
    const response = await apiClient.put<APIRes<POSIntegration>>(
      `/api/pos/integrations/${integrationId}/selected-groups`,
      { selectedGroupGuids }
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update selected groups')
    }
    return response.data
  },
}

// Helper function to match the expected interface in the mappings page
export async function getPOSIntegrations(): Promise<{
  integrations: POSIntegration[]
}> {
  const integrations = await posApi.getIntegrations()
  return { integrations }
}
