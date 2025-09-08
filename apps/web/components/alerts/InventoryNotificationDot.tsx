'use client'

import { alertsApi } from '@/lib/api/alerts'
import { inventoryApi } from '@/lib/api/inventory'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface InventoryNotificationDotProps {
  className?: string
}

export function InventoryNotificationDot({
  className,
}: InventoryNotificationDotProps) {
  const [hasAlerts, setHasAlerts] = useState(false)
  const [hasCritical, setHasCritical] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlertStatus()

    // Refresh every 30 seconds
    const interval = setInterval(loadAlertStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAlertStatus = async () => {
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

      const totalAlerts = lowStockItems.length + varianceAlerts
      const hasCriticalAlerts =
        criticalItems.length > 0 || criticalVarianceAlerts > 0

      setHasAlerts(totalAlerts > 0)
      setHasCritical(hasCriticalAlerts)
    } catch (error) {
      console.warn('Failed to load inventory alert status:', error)
      setHasAlerts(false)
      setHasCritical(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !hasAlerts) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute -top-1 -right-1 size-1.5 rounded-full ',
        hasCritical ? 'bg-destructive animate-pulse' : 'bg-orange-500',
        className
      )}
      aria-label={
        hasCritical ? 'Critical inventory alerts' : 'Inventory alerts'
      }
    />
  )
}
