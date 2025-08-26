import { apiClient } from './client'

export interface InventoryDepletionPolicy {
  allowOverDepletion: boolean
  warningThresholds: {
    low: number
    critical: number
  }
}

export interface InventorySettings {
  webhookPolicy: InventoryDepletionPolicy
  cronSyncPolicy: InventoryDepletionPolicy
  manualPolicy: InventoryDepletionPolicy
  enableAutoConversion: boolean
  conversionFallback: 'error' | 'warn' | 'ignore'
  enableOverDepletionLogging: boolean
  enableUnitConversionLogging: boolean
  auditLogRetentionDays: number
}

export interface InventorySettingsResponse extends InventorySettings {
  id?: string
  createdAt?: string
  updatedAt?: string
}

interface APIRes<T> {
  success: boolean
  data: T
}

class InventorySettingsApi {
  /**
   * Get current inventory settings
   */
  async getSettings(): Promise<InventorySettingsResponse> {
    const response = await apiClient.get<APIRes<InventorySettingsResponse>>(
      '/api/inventory-settings'
    )
    if (!response.success) {
      throw new Error('Failed to load inventory settings')
    }
    return response.data
  }

  /**
   * Update inventory settings (full update)
   */
  async updateSettings(
    settings: InventorySettings
  ): Promise<InventorySettingsResponse> {
    const response = await apiClient.put<APIRes<InventorySettingsResponse>>(
      '/api/inventory-settings',
      settings
    )
    if (!response.success) {
      throw new Error('Failed to update inventory settings')
    }
    return response.data
  }

  /**
   * Partially update inventory settings
   */
  async patchSettings(
    settings: Partial<InventorySettings>
  ): Promise<InventorySettingsResponse> {
    const response = await apiClient.patch<APIRes<InventorySettingsResponse>>(
      '/api/inventory-settings',
      settings
    )
    if (!response.success) {
      throw new Error('Failed to update inventory settings')
    }
    return response.data
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<InventorySettingsResponse> {
    const response = await apiClient.post<
      APIRes<InventorySettingsResponse> & { message?: string }
    >('/api/inventory-settings/reset')
    if (!response.success) {
      throw new Error('Failed to reset inventory settings')
    }
    return response.data
  }
}

export const inventorySettingsApi = new InventorySettingsApi()
