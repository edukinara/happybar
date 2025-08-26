import { apiClient } from './client'

export interface AuditLog {
  id: string
  organizationId: string
  eventType: string
  productId?: string
  recipeId?: string
  userId?: string
  source?: string
  externalOrderId?: string
  eventData: Record<string, any>
  createdAt: string
  product?: {
    name: string
    sku?: string
  }
  recipe?: {
    name: string
  }
}

export interface AuditLogsResponse {
  success: boolean
  data: AuditLog[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface AuditLogsQuery {
  eventType?: string
  productId?: string
  recipeId?: string
  userId?: string
  source?: string
  externalOrderId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface CleanupResponse {
  success: boolean
  data: {
    deletedCount: number
    message: string
  }
}

class AuditLogsApi {
  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(query?: AuditLogsQuery): Promise<AuditLog[]> {
    const params = new URLSearchParams()

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }

    const url = params.toString()
      ? `/api/audit-logs?${params.toString()}`
      : '/api/audit-logs'
    const response = await apiClient.get<AuditLogsResponse>(url)

    if (!response.success) {
      throw new Error('Failed to load audit logs')
    }

    return response.data
  }

  /**
   * Clean up old audit logs for current organization
   */
  async cleanupAuditLogs(): Promise<{ deletedCount: number; message: string }> {
    const response = await apiClient.post<CleanupResponse>(
      '/api/audit-logs/cleanup'
    )

    if (!response.success) {
      throw new Error('Failed to cleanup audit logs')
    }

    return response.data
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStats(): Promise<{
    totalLogs: number
    logsByType: Record<string, number>
    logsBySource: Record<string, number>
    recentActivity: number
  }> {
    // Get logs from last 30 days for statistics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const logs = await this.getAuditLogs({
      startDate: thirtyDaysAgo.toISOString(),
      limit: 1000,
    })

    const logsByType: Record<string, number> = {}
    const logsBySource: Record<string, number> = {}
    let recentActivity = 0

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    logs.forEach((log) => {
      // Count by type
      logsByType[log.eventType] = (logsByType[log.eventType] || 0) + 1

      // Count by source
      if (log.source) {
        logsBySource[log.source] = (logsBySource[log.source] || 0) + 1
      }

      // Count recent activity (last 7 days)
      if (new Date(log.createdAt) > sevenDaysAgo) {
        recentActivity++
      }
    })

    return {
      totalLogs: logs.length,
      logsByType,
      logsBySource,
      recentActivity,
    }
  }
}

export const auditLogsApi = new AuditLogsApi()
