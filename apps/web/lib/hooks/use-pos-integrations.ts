'use client'

import { posApi } from '@/lib/api/pos'
import type { POSSyncStatus } from '@happy-bar/types'
import { useEffect, useState } from 'react'

interface POSIntegration {
  id: string
  name: string
  type: string
  isActive: boolean
  lastSyncAt?: string
  syncStatus: POSSyncStatus
  syncErrors?: string[]
  createdAt: string
  updatedAt: string
}

interface UsePOSIntegrationsReturn {
  integrations: POSIntegration[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePOSIntegrations(): UsePOSIntegrationsReturn {
  const [integrations, setIntegrations] = useState<POSIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await posApi.getIntegrations()
      setIntegrations(data)
    } catch (err) {
      console.error('Failed to fetch POS integrations:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch POS integrations'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  return {
    integrations,
    loading,
    error,
    refetch: fetchIntegrations,
  }
}
