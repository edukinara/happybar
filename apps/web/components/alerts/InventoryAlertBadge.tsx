'use client'

import { Badge } from '@/components/ui/badge'
import { alertsApi } from '@/lib/api/alerts'
import { inventoryApi } from '@/lib/api/inventory'
import { useEffect, useState } from 'react'

interface InventoryAlertBadgeProps {
  className?: string
}

export function InventoryAlertBadge({ className }: InventoryAlertBadgeProps) {
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [hasCritical, setHasCritical] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlertCounts()

    // Refresh every 30 seconds
    const interval = setInterval(loadAlertCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAlertCounts = async () => {
    try {
      const [alertSummary, inventory] = await Promise.all([
        alertsApi.getSummary(),
        inventoryApi.getInventoryLevels(),
      ])

      // Count low stock items
      const lowStockItems = inventory.filter(
        (item) => item.currentQuantity < item.minimumQuantity
      )

      // Count critical items (out of stock)
      const criticalItems = inventory.filter(
        (item) => item.currentQuantity <= 0
      )

      const varianceAlerts = alertSummary.activeAlerts || 0
      const criticalVarianceAlerts = alertSummary.criticalAlerts || 0

      setTotalAlerts(lowStockItems.length + varianceAlerts)
      setHasCritical(criticalItems.length > 0 || criticalVarianceAlerts > 0)
    } catch (error) {
      console.warn('Failed to load inventory alert counts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || totalAlerts === 0) {
    return null
  }

  return (
    <Badge
      variant={hasCritical ? 'destructive' : 'secondary'}
      className={`text-[11px] ${className} px-1.5`}
    >
      {totalAlerts > 99 ? '99+' : totalAlerts}
    </Badge>
  )
}
