import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'

export interface PlatformMetrics {
  organizations: {
    total: number
    active: number
    newThisMonth: number
    growthRate: string
  }
  users: {
    total: number
    activeToday: number
    activeThisWeek: number
    recentSignups: number
    activityRate: string
  }
  products: {
    total: number
  }
  orders: {
    total: number
    thisMonth: number
  }
  sales: {
    total: number
    thisMonth: number
  }
  integrations: {
    total: number
    active: number
    healthRate: string
  }
  inventory: {
    totalItems: number
    lowStockAlerts: number
  }
  subscriptions: {
    totalCustomers: number
    activeSubscriptions: number
    monthlyRevenue: number
    conversionRate: string
    products: number
    error: string | null
  }
  system: {
    timestamp: string
    uptime: number
    memoryUsage: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
      arrayBuffers: number
    }
  }
}

export function usePlatformMetrics() {
  return useQuery<PlatformMetrics>({
    queryKey: ['admin', 'platform', 'metrics'],
    queryFn: () => adminApi.getPlatformMetrics(),
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}