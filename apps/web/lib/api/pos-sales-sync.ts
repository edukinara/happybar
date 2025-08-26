import type { SaleSyncStatus } from '@happy-bar/types'
import { apiClient } from './client'

export type SyncStatusIntegration = SaleSyncStatus

export interface SyncResult {
  success: boolean
  integrationId?: string
  integrationName?: string
  processed: number
  errors: number
  newSales: number
  duplicates: number
  errorDetails?: string[]
}

export interface BulkSyncResult {
  success: boolean
  organizationId?: string
  totalIntegrations: number
  successCount: number
  errorCount: number
  results: Array<{
    integrationId: string
    integrationName: string
    success: boolean
    processed: number
    newSales: number
    error?: string
  }>
}

export const posSalesSyncApi = {
  // Get sync status for all integrations
  async getSyncStatus(): Promise<{ integrations: SaleSyncStatus[] }> {
    const response = await apiClient.get<{ integrations: SaleSyncStatus[] }>(
      '/api/pos-sales-sync/status'
    )
    return response
  },

  // Trigger manual sync for specific integration
  async syncIntegration(
    integrationId: string,
    options?: {
      startDate?: string
      endDate?: string
      forced?: boolean
    }
  ): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>(
      `/api/pos-sales-sync/${integrationId}`,
      {
        startDate: options?.startDate,
        endDate: options?.endDate,
        forced: options?.forced || false,
      }
    )
    return response
  },

  // Trigger bulk sync for all integrations
  async syncAllIntegrations(options?: {
    forced?: boolean
  }): Promise<BulkSyncResult> {
    const response = await apiClient.post<BulkSyncResult>(
      '/api/pos-sales-sync',
      {
        forced: options?.forced || false,
      }
    )
    return response
  },
}
