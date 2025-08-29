'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  alertsApi,
  type AlertNotification,
  type AlertSummary,
} from '@/lib/api/alerts'
import type { UsageAnalysisResponse } from '@/lib/api/inventory'
import { AlertTriangle, Bell, Eye, RefreshCw, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface UsageAlertsIntegrationProps {
  usageData?: UsageAnalysisResponse
  onEvaluateAlerts?: () => void
}

export function UsageAlertsIntegration({
  usageData,
  onEvaluateAlerts,
}: UsageAlertsIntegrationProps) {
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const [alertsData, summaryData] = await Promise.all([
        alertsApi.getNotifications(10),
        alertsApi.getSummary(),
      ])
      setAlerts(alertsData)
      setSummary(summaryData)
    } catch (error) {
      console.warn('Failed to load variance alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateAlerts = async () => {
    try {
      setEvaluating(true)
      const result = await alertsApi.evaluateAlerts()
      toast.info('Evaluation Complete', {
        description: result.message,
      })
      // Refresh alerts after evaluation
      await loadAlerts()
      // Call parent callback if provided
      if (onEvaluateAlerts) {
        onEvaluateAlerts()
      }
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to evaluate variance alerts',
      })
    } finally {
      setEvaluating(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'MEDIUM':
        return 'bg-yellow-500 text-white'
      case 'LOW':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'USAGE_VARIANCE':
        return '📊'
      case 'EFFICIENCY_LOW':
        return '⚠️'
      case 'OVERUSE_DETECTED':
        return '🚨'
      default:
        return '🔔'
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'USAGE_VARIANCE':
        return 'Usage Variance'
      case 'EFFICIENCY_LOW':
        return 'Low Efficiency'
      case 'OVERUSE_DETECTED':
        return 'Overuse Detected'
      default:
        return type
    }
  }

  return (
    <div className='space-y-4'>
      {/* Alert Summary Banner */}
      {summary && summary.activeAlerts > 0 && (
        <Card className='border-orange-200 bg-orange-50'>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <AlertTriangle className='size-6 text-orange-600' />
                <div>
                  <h3 className='font-semibold text-orange-900'>
                    {summary.activeAlerts} Active Variance Alert
                    {summary.activeAlerts !== 1 ? 's' : ''}
                  </h3>
                  <p className='text-sm text-orange-700'>
                    {summary.criticalAlerts > 0 && (
                      <span className='font-medium'>
                        {summary.criticalAlerts} critical •{' '}
                      </span>
                    )}
                    Based on your current usage analysis data
                  </p>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleEvaluateAlerts}
                  disabled={evaluating}
                  className='border-orange-200 text-orange-700 hover:bg-orange-100'
                >
                  {evaluating ? (
                    <RefreshCw className='size-4 mr-2 animate-spin' />
                  ) : (
                    <RefreshCw className='size-4 mr-2' />
                  )}
                  Re-evaluate
                </Button>
                <Button size='sm' asChild>
                  <Link href='/dashboard/alerts'>
                    <Eye className='size-4 mr-2' />
                    View All
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Alerts List */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Bell className='size-5' />
              <CardTitle>Variance Alerts</CardTitle>
              {summary && (
                <Badge variant='secondary' className='ml-2'>
                  {summary.activeAlerts} active
                </Badge>
              )}
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleEvaluateAlerts}
                disabled={evaluating}
              >
                {evaluating ? (
                  <RefreshCw className='size-4 mr-2 animate-spin' />
                ) : (
                  <RefreshCw className='size-4 mr-2' />
                )}
                Evaluate Now
              </Button>
              <Button variant='outline' size='sm' asChild>
                <Link href='/dashboard/settings'>
                  <Settings className='size-4 mr-2' />
                  Configure
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8 text-muted-foreground'>
              <RefreshCw className='size-4 animate-spin mr-2' />
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <Bell className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <h3 className='text-lg font-medium mb-2'>No Variance Alerts</h3>
              <p className='text-sm mb-4'>
                No variance issues detected in your current usage analysis.
              </p>
              <Button
                variant='outline'
                onClick={handleEvaluateAlerts}
                disabled={evaluating}
              >
                {evaluating ? (
                  <RefreshCw className='size-4 mr-2 animate-spin' />
                ) : (
                  <RefreshCw className='size-4 mr-2' />
                )}
                Check for Issues
              </Button>
            </div>
          ) : (
            <div className='space-y-3'>
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className='flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50'
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-xl'>{getAlertIcon(alert.type)}</span>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          {getAlertTypeLabel(alert.type)}
                        </span>
                      </div>
                      <div className='font-medium'>
                        {alert.productName || 'Unknown Product'}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        Created {new Date(alert.createdAt).toLocaleDateString()}
                        {alert.costImpact && (
                          <span className='ml-2 font-medium text-red-600'>
                            ${Math.abs(alert.costImpact).toFixed(2)} impact
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant='ghost' size='sm' asChild>
                    <Link href='/dashboard/alerts'>
                      <Eye className='size-4' />
                    </Link>
                  </Button>
                </div>
              ))}

              {alerts.length > 5 && (
                <div className='text-center pt-3 border-t'>
                  <Button variant='outline' asChild>
                    <Link href='/dashboard/alerts'>
                      View all {alerts.length} alerts
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration with Usage Data */}
      {usageData && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='size-5 text-orange-500' />
              Alert Insights from Usage Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2'>
              {/* Top Wasters with Alert Potential */}
              <div className='space-y-3'>
                <h4 className='font-medium text-sm'>
                  Products at Risk (Low Efficiency)
                </h4>
                {usageData.topWasters?.slice(0, 3).map((item) => (
                  <div
                    key={item.productId}
                    className='flex items-center justify-between p-2 bg-red-50 rounded'
                  >
                    <div>
                      <div className='font-medium text-sm'>
                        {item.productName}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {item.efficiency.toFixed(1)}% efficiency
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-medium text-red-600'>
                        Alert Risk:{' '}
                        {item.efficiency < 70
                          ? 'HIGH'
                          : item.efficiency < 85
                            ? 'MEDIUM'
                            : 'LOW'}
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>

              {/* Top Overusers with Alert Potential */}
              <div className='space-y-3'>
                <h4 className='font-medium text-sm'>
                  Overuse Detection Candidates
                </h4>
                {usageData.topOverusers?.slice(0, 3).map((item) => (
                  <div
                    key={item.productId}
                    className='flex items-center justify-between p-2 bg-orange-50 rounded'
                  >
                    <div>
                      <div className='font-medium text-sm'>
                        {item.productName}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        +{item.variancePercent.toFixed(1)}% variance
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-medium text-orange-600'>
                        Alert Risk:{' '}
                        {Math.abs(item.variancePercent) > 20
                          ? 'HIGH'
                          : 'MEDIUM'}
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>

            <div className='mt-4 p-3 bg-blue-50 rounded-lg'>
              <div className='flex items-start gap-2'>
                <AlertTriangle className='size-4 text-blue-600 mt-0.5' />
                <div className='text-sm text-blue-800'>
                  <strong>Pro Tip:</strong> Configure automated alerts in
                  settings to catch these issues as they happen. Current
                  thresholds detect variances above 15% and efficiency below
                  70%.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
