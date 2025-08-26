import { apiClient } from './client'

export interface AlertConfig {
  usageVarianceThreshold: number
  lowEfficiencyThreshold: number
  overuseThreshold: number
  costImpactThreshold: number
  enableUsageVarianceAlerts: boolean
  enableEfficiencyAlerts: boolean
  enableOveruseAlerts: boolean
  cooldownHours: number
}

export interface Alert {
  id: string
  title: string
  message: string
  type: 'USAGE_VARIANCE' | 'EFFICIENCY_LOW' | 'OVERUSE_DETECTED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  triggerValue?: number
  thresholdValue?: number
  createdAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  rule: {
    product?: {
      id: string
      name: string
    }
  }
  inventoryItem: {
    product: {
      id: string
      name: string
    }
    location: {
      id: string
      name: string
    }
  }
}

export interface AlertNotification {
  id: string
  title: string
  message: string
  type: string
  severity: string
  productName?: string
  costImpact?: number
  createdAt: string
}

export interface AlertSummary {
  activeAlerts: number
  criticalAlerts: number
  recentAlerts: number
  alertsByType: Record<string, number>
}

export const alertsApi = {
  // Get alert configuration
  async getConfig(): Promise<AlertConfig> {
    const response = await apiClient.get<{ success: boolean; data: AlertConfig }>('/api/variance-alerts/config')
    if (!response.success) {
      throw new Error('Failed to get alert configuration')
    }
    return response.data
  },

  // Update alert configuration
  async updateConfig(config: Partial<AlertConfig>): Promise<void> {
    const response = await apiClient.put<{ success: boolean }>('/api/variance-alerts/config', config)
    if (!response.success) {
      throw new Error('Failed to update alert configuration')
    }
  },

  // Get alerts with pagination
  async getAlerts(params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{
    alerts: Alert[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const response = await apiClient.get<{ success: boolean; data: any }>(`/api/variance-alerts?${queryParams.toString()}`)
    if (!response.success) {
      throw new Error('Failed to get alerts')
    }
    return response.data
  },

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId?: string): Promise<void> {
    const response = await apiClient.put<{ success: boolean }>(`/api/variance-alerts/${alertId}/acknowledge`, { userId })
    if (!response.success) {
      throw new Error('Failed to acknowledge alert')
    }
  },

  // Resolve alert
  async resolveAlert(alertId: string, userId?: string): Promise<void> {
    const response = await apiClient.put<{ success: boolean }>(`/api/variance-alerts/${alertId}/resolve`, { userId })
    if (!response.success) {
      throw new Error('Failed to resolve alert')
    }
  },

  // Run manual alert evaluation
  async evaluateAlerts(): Promise<{ alertsCreated: number; alertsEvaluated: number; message: string }> {
    const response = await apiClient.post<{ success: boolean; data: any }>('/api/variance-alerts/evaluate', {})
    if (!response.success) {
      throw new Error('Failed to evaluate alerts')
    }
    return response.data
  },

  // Get alert summary
  async getSummary(): Promise<AlertSummary> {
    const response = await apiClient.get<{ success: boolean; data: AlertSummary }>('/api/variance-alerts/summary')
    if (!response.success) {
      throw new Error('Failed to get alert summary')
    }
    return response.data
  },

  // Get recent notifications
  async getNotifications(limit?: number): Promise<AlertNotification[]> {
    const queryParams = new URLSearchParams()
    if (limit) queryParams.append('limit', limit.toString())

    const response = await apiClient.get<{ success: boolean; data: AlertNotification[] }>(`/api/variance-alerts/notifications?${queryParams.toString()}`)
    if (!response.success) {
      throw new Error('Failed to get alert notifications')
    }
    return response.data
  },
}