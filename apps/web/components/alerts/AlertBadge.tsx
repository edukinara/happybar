'use client'

import { Badge } from '@/components/ui/badge'
import { alertsApi, type AlertSummary } from '@/lib/api/alerts'
import { useEffect, useState } from 'react'

interface AlertBadgeProps {
  className?: string
}

export function AlertBadge({ className }: AlertBadgeProps) {
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()

    // Refresh every 30 seconds
    const interval = setInterval(loadSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSummary = async () => {
    try {
      setLoading(false)
      const data = await alertsApi.getSummary()
      setSummary(data)
    } catch (error) {
      console.warn('Failed to load alert summary for badge:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary || summary.activeAlerts === 0) {
    return null
  }

  return (
    <Badge
      variant={summary.criticalAlerts > 0 ? 'destructive' : 'secondary'}
      className={`text-xs ${className}`}
    >
      {summary.activeAlerts}
    </Badge>
  )
}
