'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { posApi } from '@/lib/api/pos'
import type { POSSyncStatus } from '@happy-bar/types'
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MenuGroupSelector } from './menu-group-selector'

interface POSIntegration {
  id: string
  name: string
  type: string
  isActive: boolean
  lastSyncAt?: string
  syncStatus: POSSyncStatus
  syncErrors?: string[]
  selectedGroupGuids?: string[]
  createdAt: string
  updatedAt: string
}

interface SyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: POSIntegration | null
  onSyncComplete: () => void
}

export function SyncDialog({
  open,
  onOpenChange,
  integration,
  onSyncComplete,
}: SyncDialogProps) {
  const [selectedGroupGuids, setSelectedGroupGuids] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    productsSync: { created: number; updated: number; errors: number }
    errors?: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved group preferences when integration changes
  useEffect(() => {
    if (integration?.selectedGroupGuids) {
      setSelectedGroupGuids(integration.selectedGroupGuids)
    } else {
      setSelectedGroupGuids([])
    }
  }, [integration])

  const handleSelectionChange = (groupGuids: string[]) => {
    setSelectedGroupGuids(groupGuids)
  }

  const handleClose = () => {
    // Reset state when closing
    setSyncResult(null)
    setError(null)
    // Don't reset selectedGroupGuids - keep the saved preferences
    onOpenChange(false)
  }

  const handleSync = async (groupGuids: string[]) => {
    if (!integration) return

    try {
      setIsLoading(true)
      setError(null)
      setSyncResult(null)

      // Save group preferences first
      await posApi.updateSelectedGroups(integration.id, groupGuids)

      // Then sync using those preferences
      const result = await posApi.syncData({
        integrationId: integration.id,
        syncSales: false, // Only sync products for now
        selectedGroupGuids: groupGuids.length > 0 ? groupGuids : undefined,
      })

      setSyncResult(result)
      onSyncComplete()
    } catch (err) {
      console.warn('Sync failed:', err)
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!integration) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Sync Products from {integration.name}</DialogTitle>
          <DialogDescription>
            Choose which menu groups to sync. These settings will be saved as
            your default preferences for this integration.
          </DialogDescription>
          {selectedGroupGuids.length > 0 && (
            <div className='flex items-center gap-2 mt-2'>
              <Badge variant='secondary'>
                {selectedGroupGuids.length} group(s) selected
              </Badge>
              <span className='text-sm text-muted-foreground'>
                Only products from selected groups will be synced
              </span>
            </div>
          )}
        </DialogHeader>

        <div className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertTriangle className='size-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {syncResult ? (
            <Alert>
              <CheckCircle className='size-4' />
              <AlertDescription>
                <div className='space-y-1'>
                  <div className='font-medium'>
                    Sync completed successfully!
                  </div>
                  <div className='text-sm'>
                    Products: {syncResult.productsSync.created} created,{' '}
                    {syncResult.productsSync.updated} updated
                    {syncResult.productsSync.errors > 0 && (
                      <span className='text-destructive'>
                        , {syncResult.productsSync.errors} errors
                      </span>
                    )}
                  </div>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className='text-sm text-destructive'>
                      Errors: {syncResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <MenuGroupSelector
              integrationId={integration.id}
              selectedGroupGuids={selectedGroupGuids}
              onSelectionChange={handleSelectionChange}
              onSync={handleSync}
              isLoading={isLoading}
              disabled={false}
            />
          )}

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={handleClose}
              disabled={isLoading}
            >
              {syncResult ? 'Close' : 'Cancel'}
            </Button>
            {syncResult && (
              <Button
                onClick={() => {
                  setSyncResult(null)
                  setError(null)
                }}
                disabled={isLoading}
              >
                <RefreshCw className='size-4 mr-2' />
                Sync Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
