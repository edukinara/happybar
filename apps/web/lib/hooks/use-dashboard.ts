'use client'

import { inventoryApi, type RecentCount } from '@/lib/api/inventory'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalItems: number
  lowStockItems: number
  totalValue: number
  recentCounts: RecentCount[]
}

interface UseDashboardReturn {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const dashboardStats = await inventoryApi.getDashboardStats()
      setStats(dashboardStats)
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)

      let errorMessage = 'Failed to fetch dashboard stats'
      if (err instanceof Error) {
        errorMessage = err.message
      }

      // Handle specific error cases
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } }
        if (axiosError.response?.status === 401) {
          errorMessage = 'Session expired. Please log in again.'
        } else if (axiosError.response?.status === 403) {
          errorMessage = 'Access denied. Check your permissions.'
        } else if (
          axiosError.response?.status &&
          axiosError.response?.status >= 500
        ) {
          errorMessage = 'Server error. Please try again later.'
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
