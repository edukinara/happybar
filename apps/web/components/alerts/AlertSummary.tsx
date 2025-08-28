'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  alertsApi,
  type AlertNotification,
  type AlertSummary,
} from '@/lib/api/alerts'
import { AlertTriangle, Bell, CheckCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HappBarLoader } from '../HappyBarLoader'

interface AlertSummaryProps {
  locationId?: string
  className?: string
}

export function AlertSummaryCard({ locationId, className }: AlertSummaryProps) {
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSummary()
  }, [locationId])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const [summaryData, notificationsData] = await Promise.all([
        alertsApi.getSummary(),
        alertsApi.getNotifications(5),
      ])
      setSummary(summaryData)
      setNotifications(notificationsData)
    } catch (err) {
      console.warn('Failed to load alert summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bell className='h-5 w-5' />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-4'>
            <HappBarLoader />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bell className='h-5 w-5' />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center text-red-600 py-4'>
            <AlertTriangle className='h-8 w-8 mx-auto mb-2' />
            <p className='text-sm'>{error}</p>
            <Button
              variant='outline'
              size='sm'
              onClick={loadSummary}
              className='mt-2'
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Bell className='h-5 w-5' />
            <CardTitle>
              {locationId ? 'Location Alerts' : 'Alert Summary'}
            </CardTitle>
          </div>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/dashboard/alerts'>
              <Settings className='h-4 w-4' />
            </Link>
          </Button>
        </div>
        <CardDescription>
          {locationId
            ? 'Recent alerts for this location'
            : 'Recent inventory alerts across all locations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!summary || summary.activeAlerts === 0 ? (
          <div className='text-center py-6'>
            <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-3' />
            <h3 className='text-lg font-medium text-green-600 mb-1'>
              All Clear!
            </h3>
            <p className='text-sm text-muted-foreground'>
              {locationId
                ? 'No active variance alerts for this location'
                : 'No active variance alerts at this time'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Summary Stats */}
            <div className='grid grid-cols-3 gap-3 text-center'>
              <div>
                <div className='text-2xl font-bold'>{summary.activeAlerts}</div>
                <div className='text-xs text-muted-foreground'>Active</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-red-600'>
                  {summary.criticalAlerts}
                </div>
                <div className='text-xs text-muted-foreground'>Critical</div>
              </div>
              <div>
                <div className='text-2xl font-bold'>{summary.recentAlerts}</div>
                <div className='text-xs text-muted-foreground'>Recent</div>
              </div>
            </div>

            {/* Recent Alert Notifications */}
            {notifications.length > 0 && (
              <div className='space-y-2'>
                <h4 className='text-sm font-medium'>Recent Variance Alerts</h4>
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className='flex items-center justify-between p-2 bg-muted/50 rounded-lg'
                  >
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant='outline'
                          className={getSeverityColor(notification.severity)}
                        >
                          {notification.severity}
                        </Badge>
                        <span className='text-sm font-medium truncate'>
                          {notification.productName || 'Unknown Product'}
                        </span>
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {notification.type.replace('_', ' ').toLowerCase()} •{' '}
                        {new Date(notification.createdAt).toLocaleDateString()}
                        {notification.costImpact && (
                          <span className='ml-2 text-red-600'>
                            ${Math.abs(notification.costImpact).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length > 3 && (
                  <div className='text-xs text-muted-foreground text-center'>
                    +{notifications.length - 3} more alerts
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className='pt-2'>
              <Button variant='outline' asChild className='w-full'>
                <Link href='/dashboard/alerts'>
                  <AlertTriangle className='mr-2 h-4 w-4' />
                  View All Alerts
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
