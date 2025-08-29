'use client'

import { HappBarLoader } from '@/components/HappyBarLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { auditLogsApi, type AuditLog } from '@/lib/api/audit-logs'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Filter,
  HelpCircle,
  Package,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface AuditLogStats {
  totalLogs: number
  logsByType: Record<string, number>
  logsBySource: Record<string, number>
  recentActivity: number
}

export default function AuditLogsCard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadAuditLogs()
    loadStats()
  }, [])

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (
        (eventTypeFilter && eventTypeFilter !== 'all') ||
        (sourceFilter && sourceFilter !== 'all') ||
        searchTerm ||
        (dateRange && dateRange !== 'all')
      ) {
        applyFilters()
      } else {
        loadAuditLogs()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [eventTypeFilter, sourceFilter, searchTerm, dateRange])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      const data = await auditLogsApi.getAuditLogs({ limit: 100 })
      setLogs(data)
    } catch (error) {
      console.warn('Failed to load audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await auditLogsApi.getAuditLogStats()
      setStats(data)
    } catch (error) {
      console.warn('Failed to load audit log stats:', error)
    }
  }

  const applyFilters = async () => {
    try {
      setIsFiltering(true)

      let startDate: string | undefined
      if (dateRange && dateRange !== 'all') {
        const date = new Date()
        switch (dateRange) {
          case '24h':
            date.setHours(date.getHours() - 24)
            break
          case '7d':
            date.setDate(date.getDate() - 7)
            break
          case '30d':
            date.setDate(date.getDate() - 30)
            break
        }
        startDate = date.toISOString()
      }

      const data = await auditLogsApi.getAuditLogs({
        eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        startDate,
        limit: 100,
      })

      // Filter by search term on the frontend
      let filteredData = data
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        filteredData = data.filter(
          (log) =>
            log.product?.name?.toLowerCase().includes(term) ||
            log.recipe?.name?.toLowerCase().includes(term) ||
            log.externalOrderId?.toLowerCase().includes(term) ||
            JSON.stringify(log.eventData).toLowerCase().includes(term)
        )
      }

      setLogs(filteredData)
    } catch (error) {
      console.warn('Failed to apply filters:', error)
      toast.error('Failed to apply filters')
    } finally {
      setIsFiltering(false)
    }
  }

  const handleCleanup = async () => {
    if (
      !confirm(
        'Are you sure you want to clean up old audit logs? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      setCleaningUp(true)
      const result = await auditLogsApi.cleanupAuditLogs()
      toast.success(result.message)
      await loadAuditLogs()
      await loadStats()
    } catch (error) {
      console.warn('Failed to cleanup audit logs:', error)
      toast.error('Failed to cleanup audit logs')
    } finally {
      setCleaningUp(false)
    }
  }

  const clearFilters = () => {
    setEventTypeFilter('all')
    setSourceFilter('all')
    setSearchTerm('')
    setDateRange('all')
    loadAuditLogs()
  }

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'inventory_over_depletion':
        return <AlertTriangle className='size-4 text-red-500' />
      case 'unit_conversion':
        return <RefreshCw className='size-4 text-blue-500' />
      case 'inventory_adjustment':
        return <Package className='size-4 text-purple-500' />
      default:
        return <FileText className='size-4 text-gray-500' />
    }
  }

  const getSourceIcon = (source?: string) => {
    if (!source) return <FileText className='size-3 text-gray-400' />

    if (source.includes('webhook'))
      return <Zap className='size-3 text-green-500' />
    if (source.includes('cron') || source.includes('sync'))
      return <Shield className='size-3 text-blue-500' />
    return <Package className='size-3 text-purple-500' />
  }

  const formatEventData = (eventData: Record<string, any>) => {
    // Create a readable summary of the event data
    if (eventData.productName) {
      let summary = eventData.productName
      if (eventData.originalQuantity !== undefined) {
        summary += ` (${+Number(eventData.originalQuantity)?.toFixed(2)} → ${+Number(eventData.resultingQuantity)?.toFixed(2) || 'N/A'})`
      }
      if (
        eventData.fromAmount !== undefined &&
        eventData.toAmount !== undefined
      ) {
        summary += ` (${eventData.fromAmount} ${eventData.fromUnit} → ${+Number(eventData.toAmount)?.toFixed(2)} units)`
      }
      return summary
    }
    return JSON.stringify(eventData).slice(0, 100) + '...'
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <ChevronDown className='size-4' />
            ) : (
              <ChevronRight className='size-4' />
            )}
          </Button>
          <div>
            <CardTitle className='flex items-center'>
              <Database className='mr-2 size-5' />
              Audit Logs
            </CardTitle>
            <CardDescription>
              View and manage inventory audit logs for compliance and debugging.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {expanded ? (
          <>
            {/* Statistics */}
            {stats && (
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div className='p-4 border rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <FileText className='size-4 text-gray-500' />
                    <span className='text-sm font-medium'>Total Logs</span>
                  </div>
                  <p className='text-2xl font-bold mt-1'>{stats.totalLogs}</p>
                  <p className='text-xs text-muted-foreground'>Last 30 days</p>
                </div>

                <div className='p-4 border rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <Clock className='size-4 text-blue-500' />
                    <span className='text-sm font-medium'>Recent Activity</span>
                  </div>
                  <p className='text-2xl font-bold mt-1'>
                    {stats.recentActivity}
                  </p>
                  <p className='text-xs text-muted-foreground'>Last 7 days</p>
                </div>

                <div className='p-4 border rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <AlertTriangle className='size-4 text-red-500' />
                    <span className='text-sm font-medium'>Over-Depletion</span>
                  </div>
                  <p className='text-2xl font-bold mt-1'>
                    {stats.logsByType.inventory_over_depletion || 0}
                  </p>
                  <p className='text-xs text-muted-foreground'>Events logged</p>
                </div>

                <div className='p-4 border rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <RefreshCw className='size-4 text-blue-500' />
                    <span className='text-sm font-medium'>Conversions</span>
                  </div>
                  <p className='text-2xl font-bold mt-1'>
                    {stats.logsByType.unit_conversion || 0}
                  </p>
                  <p className='text-xs text-muted-foreground'>Events logged</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Filters */}
            <div className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Filter className='size-4' />
                <h3 className='font-medium'>Filters</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='size-4 text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='max-w-xs'>
                        Filter audit logs by event type, source, date range, or
                        search for specific products/orders.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <Label>Event Type</Label>
                  <Select
                    value={eventTypeFilter}
                    onValueChange={setEventTypeFilter}
                  >
                    <SelectTrigger className='mt-1'>
                      <SelectValue placeholder='All events' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All events</SelectItem>
                      <SelectItem value='inventory_over_depletion'>
                        Over-Depletion
                      </SelectItem>
                      <SelectItem value='unit_conversion'>
                        Unit Conversion
                      </SelectItem>
                      <SelectItem value='inventory_adjustment'>
                        Adjustment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Source</Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className='mt-1'>
                      <SelectValue placeholder='All sources' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All sources</SelectItem>
                      <SelectItem value='pos_webhook'>POS Webhooks</SelectItem>
                      <SelectItem value='pos_cron_sync'>POS Sync</SelectItem>
                      <SelectItem value='manual'>Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className='mt-1'>
                      <SelectValue placeholder='All time' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All time</SelectItem>
                      <SelectItem value='24h'>Last 24 hours</SelectItem>
                      <SelectItem value='7d'>Last 7 days</SelectItem>
                      <SelectItem value='30d'>Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Search</Label>
                  <div className='relative mt-1'>
                    <Search className='absolute left-2 top-2.5 size-4 text-muted-foreground' />
                    <Input
                      placeholder='Product, order ID...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pl-8'
                    />
                  </div>
                </div>
              </div>

              <div className='flex space-x-2'>
                <Button variant='outline' size='sm' onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant='outline' size='sm' onClick={loadAuditLogs}>
                  <RefreshCw className='mr-2 size-4' />
                  Refresh
                </Button>
              </div>
            </div>

            <Separator />

            {/* Audit Logs Table */}
            <div>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-medium'>Audit Log Entries</h3>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleCleanup}
                    disabled={cleaningUp}
                  >
                    <Trash2 className='mr-2 size-4' />
                    {cleaningUp ? 'Cleaning...' : 'Cleanup Old Logs'}
                  </Button>
                </div>
              </div>

              {loading || isFiltering ? (
                <div className='flex items-center justify-center py-8'>
                  <HappBarLoader text='Loading audit logs...' />
                </div>
              ) : logs.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <FileText className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <p>No audit logs found</p>
                  <p className='text-sm'>
                    Try adjusting your filters or check back later
                  </p>
                </div>
              ) : (
                <div className='border rounded-lg'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[100px]'>Time</TableHead>
                        <TableHead className='w-[120px]'>Event</TableHead>
                        <TableHead className='w-[100px]'>Source</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className='w-[100px]'>Order ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className='font-mono text-sm'>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {new Date(log.createdAt).toLocaleString(
                                    undefined,
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {new Date(log.createdAt).toLocaleString()}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center space-x-2'>
                              {getEventIcon(log.eventType)}
                              <Badge variant='outline' className='text-xs'>
                                {formatEventType(log.eventType)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center space-x-1'>
                              {getSourceIcon(log.source)}
                              <span className='text-sm text-muted-foreground'>
                                {log.source
                                  ?.replace(/^pos_/, '')
                                  .replace(/_/g, ' ') || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className='text-left'>
                                  <div className='max-w-md truncate'>
                                    {formatEventData(log.eventData)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className='max-w-sm'>
                                  <pre className='text-xs whitespace-pre-wrap'>
                                    {JSON.stringify(log.eventData, null, 2)}
                                  </pre>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className='font-mono text-xs'>
                            {log.externalOrderId ? (
                              <Badge variant='secondary' className='text-xs'>
                                {log.externalOrderId.slice(-8)}
                              </Badge>
                            ) : (
                              <span className='text-muted-foreground'>-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
