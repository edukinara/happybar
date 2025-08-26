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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { posSalesSyncApi, type SyncStatusIntegration } from '@/lib/api/pos-sales-sync'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function SalesSyncCard() {
  const [integrations, setIntegrations] = useState<SyncStatusIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Set<string>>(new Set())
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [showManualSyncDialog, setShowManualSyncDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<SyncStatusIntegration | null>(null)
  const [manualSyncOptions, setManualSyncOptions] = useState({
    startDate: '',
    endDate: '',
    forced: false
  })

  useEffect(() => {
    fetchSyncStatus()
  }, [])

  const fetchSyncStatus = async () => {
    try {
      setLoading(true)
      const data = await posSalesSyncApi.getSyncStatus()
      setIntegrations(data.integrations)
    } catch (error) {
      console.warn('Failed to fetch sync status:', error)
      toast.error('Failed to load sync status')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncIntegration = async (integration: SyncStatusIntegration, forced = false) => {
    setSyncing(prev => new Set(prev).add(integration.id))
    
    try {
      const result = await posSalesSyncApi.syncIntegration(integration.id, {
        forced
      })
      
      if (result.success) {
        toast.success(`Sync completed: ${result.newSales} new sales processed`)
      } else {
        toast.error(`Sync failed: ${result.errors} errors occurred`)
      }
      
      // Refresh status
      await fetchSyncStatus()
    } catch (error) {
      console.warn('Sync failed:', error)
      toast.error('Sync failed')
    } finally {
      setSyncing(prev => {
        const newSet = new Set(prev)
        newSet.delete(integration.id)
        return newSet
      })
    }
  }

  const handleBulkSync = async (forced = false) => {
    setBulkSyncing(true)
    
    try {
      const result = await posSalesSyncApi.syncAllIntegrations({ forced })
      
      if (result.success) {
        const totalNewSales = result.results.reduce((sum, r) => sum + r.newSales, 0)
        toast.success(`Bulk sync completed: ${totalNewSales} new sales across ${result.successCount} integrations`)
      } else {
        toast.error(`Bulk sync partial failure: ${result.errorCount}/${result.totalIntegrations} integrations failed`)
      }
      
      // Refresh status
      await fetchSyncStatus()
    } catch (error) {
      console.warn('Bulk sync failed:', error)
      toast.error('Bulk sync failed')
    } finally {
      setBulkSyncing(false)
    }
  }

  const handleManualSync = async () => {
    if (!selectedIntegration) return
    
    setSyncing(prev => new Set(prev).add(selectedIntegration.id))
    
    try {
      const result = await posSalesSyncApi.syncIntegration(selectedIntegration.id, {
        startDate: manualSyncOptions.startDate || undefined,
        endDate: manualSyncOptions.endDate || undefined,
        forced: manualSyncOptions.forced
      })
      
      if (result.success) {
        toast.success(`Manual sync completed: ${result.newSales} new sales processed`)
      } else {
        toast.error(`Manual sync failed: ${result.errors} errors occurred`)
      }
      
      setShowManualSyncDialog(false)
      setSelectedIntegration(null)
      setManualSyncOptions({ startDate: '', endDate: '', forced: false })
      
      // Refresh status
      await fetchSyncStatus()
    } catch (error) {
      console.warn('Manual sync failed:', error)
      toast.error('Manual sync failed')
    } finally {
      setSyncing(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedIntegration.id)
        return newSet
      })
    }
  }

  const getSyncStatusBadge = (status: SyncStatusIntegration['syncStatus']) => {
    const statusMap = {
      NEVER_SYNCED: { label: 'Never Synced', color: 'bg-gray-100 text-gray-800' },
      SYNCING: { label: 'Syncing...', color: 'bg-blue-100 text-blue-800' },
      SUCCESS: { label: 'Success', color: 'bg-green-100 text-green-800' },
      FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      PARTIAL_SUCCESS: { label: 'Partial Success', color: 'bg-yellow-100 text-yellow-800' },
    }

    const config = statusMap[status] || statusMap.NEVER_SYNCED
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getSyncIcon = (status: SyncStatusIntegration['syncStatus']) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'FAILED':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'SYNCING':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      case 'PARTIAL_SUCCESS':
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Database className='mr-2 h-5 w-5' />
            POS Sales Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin' />
            <span className='ml-2'>Loading sync status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <div>
            <CardTitle className='flex items-center'>
              <Database className='mr-2 h-5 w-5' />
              POS Sales Sync
            </CardTitle>
            <CardDescription>
              Automatically pull sales data from your POS systems to keep inventory synchronized.
            </CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => handleBulkSync(false)}
              disabled={bulkSyncing || integrations.length === 0}
            >
              {bulkSyncing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Sync All
            </Button>
            <Button
              variant='outline'
              onClick={() => handleBulkSync(true)}
              disabled={bulkSyncing || integrations.length === 0}
            >
              {bulkSyncing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Play className='mr-2 h-4 w-4' />
              )}
              Force Sync All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <Database className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <h3 className='text-lg font-medium mb-2'>No POS Integrations</h3>
              <p className='mb-4'>
                Set up a POS integration first to enable sales data synchronization.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead className='w-[200px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <div className='flex items-center'>
                        {getSyncIcon(integration.syncStatus)}
                        <div className='ml-3'>
                          <div className='font-medium'>{integration.name}</div>
                          <div className='text-sm text-muted-foreground capitalize'>
                            {integration.type.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSyncStatusBadge(integration.syncStatus)}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {integration.lastSyncAt ? (
                        <div>
                          <div>{new Date(integration.lastSyncAt).toLocaleDateString()}</div>
                          <div className='text-xs'>
                            {new Date(integration.lastSyncAt).toLocaleTimeString()}
                          </div>
                          {integration.daysSinceLastSync !== null && integration.daysSinceLastSync > 1 && (
                            <div className='text-xs text-amber-600'>
                              {integration.daysSinceLastSync} days ago
                            </div>
                          )}
                        </div>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      {integration.hasErrors ? (
                        <Badge variant='destructive' className='text-xs'>
                          {integration.errorCount} errors
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground'>None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-1'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleSyncIntegration(integration, false)}
                          disabled={syncing.has(integration.id)}
                          title='Incremental Sync'
                        >
                          {syncing.has(integration.id) ? (
                            <Loader2 className='h-3 w-3 animate-spin' />
                          ) : (
                            <RefreshCw className='h-3 w-3' />
                          )}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSelectedIntegration(integration)
                            setShowManualSyncDialog(true)
                          }}
                          disabled={syncing.has(integration.id)}
                          title='Manual Sync with Options'
                        >
                          <Calendar className='h-3 w-3' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Sync Dialog */}
      <Dialog open={showManualSyncDialog} onOpenChange={setShowManualSyncDialog}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Manual Sales Sync</DialogTitle>
            <DialogDescription>
              Configure custom sync options for {selectedIntegration?.name}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='start-date'>Start Date (Optional)</Label>
              <Input
                id='start-date'
                type='datetime-local'
                value={manualSyncOptions.startDate}
                onChange={(e) =>
                  setManualSyncOptions(prev => ({ ...prev, startDate: e.target.value }))
                }
              />
              <p className='text-xs text-muted-foreground'>
                Leave empty to sync from last sync time
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='end-date'>End Date (Optional)</Label>
              <Input
                id='end-date'
                type='datetime-local'
                value={manualSyncOptions.endDate}
                onChange={(e) =>
                  setManualSyncOptions(prev => ({ ...prev, endDate: e.target.value }))
                }
              />
              <p className='text-xs text-muted-foreground'>
                Leave empty to sync until now
              </p>
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                id='forced'
                checked={manualSyncOptions.forced}
                onCheckedChange={(checked) =>
                  setManualSyncOptions(prev => ({ ...prev, forced: checked }))
                }
              />
              <Label htmlFor='forced' className='text-sm'>
                Force sync (ignore last sync time)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowManualSyncDialog(false)
                setSelectedIntegration(null)
                setManualSyncOptions({ startDate: '', endDate: '', forced: false })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSync}
              disabled={!selectedIntegration || syncing.has(selectedIntegration.id)}
            >
              {selectedIntegration && syncing.has(selectedIntegration.id) ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Play className='mr-2 h-4 w-4' />
              )}
              Start Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}