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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { inventoryApi } from '@/lib/api/inventory'
import {
  CountType,
  InventoryCountStatus,
  type InventoryCountType,
} from '@happy-bar/types'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  MapPin,
  Play,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function InventoryCountDetailPage() {
  const { showSuccess } = useAlertDialog()
  const params = useParams()
  const [count, setCount] = useState<InventoryCountType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [customCompletionDate, setCustomCompletionDate] = useState('')

  const countId = params.id as string

  useEffect(() => {
    if (countId) {
      fetchCount()
    }
  }, [countId])

  const fetchCount = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await inventoryApi.getInventoryCount(countId)
      setCount(data)
    } catch (err) {
      console.error('Failed to fetch inventory count:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch inventory count'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCount = async (customDate?: string) => {
    if (!count || approving) return

    try {
      setApproving(true)
      setError(null) // Clear any previous errors

      const updateData: any = {
        status: InventoryCountStatus.APPROVED,
      }

      // Add custom completion date if provided
      if (customDate) {
        updateData.customCompletedAt = customDate
      }

      await inventoryApi.updateInventoryCount(count.id, updateData)

      // Show success message
      showSuccess(
        'Your inventory levels have been updated based on the count results.',
        'Count approved successfully!'
      )

      // Close dialog and refresh data
      setShowApprovalDialog(false)
      setCustomCompletionDate('')
      await fetchCount()
    } catch (err) {
      console.error('Failed to approve count:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve count')
    } finally {
      setApproving(false)
    }
  }

  const handleOpenApprovalDialog = () => {
    // Set default date to the count's completion time or now
    const defaultDate = count?.completedAt
      ? new Date(count.completedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
    setCustomCompletionDate(defaultDate)
    setShowApprovalDialog(true)
  }

  const getStatusColor = (status: InventoryCountStatus) => {
    switch (status) {
      case InventoryCountStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case InventoryCountStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case InventoryCountStatus.COMPLETED:
        return 'bg-yellow-100 text-yellow-800'
      case InventoryCountStatus.APPROVED:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCountTypeLabel = (type: CountType) => {
    switch (type) {
      case CountType.FULL:
        return 'Full Count'
      case CountType.SPOT:
        return 'Spot Check'
      case CountType.CYCLE:
        return 'Cycle Count'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p>Loading inventory count...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='text-red-500 mb-4'>
            <ClipboardCheck className='h-12 w-12 mx-auto mb-2' />
            <h2 className='text-xl font-semibold'>Failed to load count</h2>
          </div>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchCount}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!count) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <ClipboardCheck className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>Count not found</h2>
          <p className='text-muted-foreground mb-4'>
            The inventory count you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href='/dashboard/inventory/counts'>Back to Counts</Link>
          </Button>
        </div>
      </div>
    )
  }

  const progressPercent = count.areas
    ? (count.areas.filter((a) => a.status === 'COMPLETED').length /
        count.areas.length) *
      100
    : 0

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/dashboard/inventory/counts'>
              <ArrowLeft className='size-4 mr-2' />
              Back to Counts
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>{count.name}</h1>
            <div className='flex items-center gap-4 text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <MapPin className='size-4' />
                {count.location?.name}
              </div>
              <div className='flex items-center gap-1'>
                <Calendar className='size-4' />
                Started{' '}
                {formatDistanceToNow(new Date(count.startedAt), {
                  addSuffix: true,
                })}
              </div>
              <Badge className={getStatusColor(count.status)}>
                {count.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          {count.status === InventoryCountStatus.DRAFT && (
            <Button asChild>
              <Link href={`/dashboard/inventory/counts/${count.id}/count`}>
                <Play className='size-4 mr-2' />
                Start Counting
              </Link>
            </Button>
          )}
          {count.status === InventoryCountStatus.IN_PROGRESS && (
            <Button asChild>
              <Link href={`/dashboard/inventory/counts/${count.id}/count`}>
                Continue Counting
              </Link>
            </Button>
          )}
          {count.status === InventoryCountStatus.COMPLETED && (
            <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenApprovalDialog}
                  disabled={approving}
                >
                  <CheckCircle className='size-4 mr-2' />
                  Approve & Apply to Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                  <DialogTitle>Approve Inventory Count</DialogTitle>
                  <DialogDescription>
                    Approving this count will immediately update your inventory levels based on the count results.
                    You can optionally specify a custom completion date/time.
                  </DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  {error && (
                    <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                      {error}
                    </div>
                  )}
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='completion-date' className='text-right col-span-1'>
                      Completed At
                    </Label>
                    <div className='col-span-3'>
                      <Input
                        id='completion-date'
                        type='datetime-local'
                        value={customCompletionDate}
                        onChange={(e) => setCustomCompletionDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 16)}
                      />
                      <p className='text-xs text-muted-foreground mt-1'>
                        This will be used as the count completion time for reporting.
                        If earlier than the start time, the start time will be adjusted.
                      </p>
                    </div>
                  </div>
                </div>
                <div className='flex justify-end gap-3'>
                  <Button
                    variant='outline'
                    onClick={() => setShowApprovalDialog(false)}
                    disabled={approving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApproveCount(customCompletionDate)}
                    disabled={approving || !customCompletionDate}
                    loading={approving}
                  >
                    <CheckCircle className='size-4 mr-2' />
                    {approving ? 'Approving...' : 'Approve & Apply'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {count.status === InventoryCountStatus.APPROVED && (
            <div className='flex items-center gap-2 text-green-600'>
              <CheckCircle className='size-5' />
              <span className='font-medium'>Count Approved & Applied</span>
            </div>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Progress</CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {Math.round(progressPercent)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              {count.areas?.filter((a) => a.status === 'COMPLETED').length || 0}{' '}
              of {count.areas?.length || 0} areas
            </p>
            <Progress value={progressPercent} className='mt-2' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Items Counted</CardTitle>
            <ClipboardCheck className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{count.itemsCounted}</div>
            <p className='text-xs text-muted-foreground'>
              {getCountTypeLabel(count.type)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Value</CardTitle>
            <DollarSign className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              $
              {count.totalValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
            <p className='text-xs text-muted-foreground'>
              Current inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Variance</CardTitle>
            <BarChart3 className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>N/A</div>
            <p className='text-xs text-muted-foreground'>
              Available after completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Count Areas */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Count Areas</CardTitle>
            <CardDescription>Progress by storage area</CardDescription>
          </CardHeader>
          <CardContent>
            {count.areas && count.areas.length > 0 ? (
              <div className='space-y-4'>
                {count.areas.map((area, index) => (
                  <div
                    key={area.id}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold'>
                        {index + 1}
                      </div>
                      <div>
                        <div className='font-medium'>{area.name}</div>
                        <div className='text-sm text-muted-foreground'>
                          {area.items?.length || 0} items
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        area.status === 'COMPLETED' ? 'default' : 'secondary'
                      }
                    >
                      {area.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                <ClipboardCheck className='size-8 mx-auto mb-2' />
                <p>No areas configured yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Count Details</CardTitle>
            <CardDescription>Summary and metadata</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium'>Count Type</span>
                <span className='text-sm'>{getCountTypeLabel(count.type)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium'>Location</span>
                <span className='text-sm'>{count.location?.name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium'>Started</span>
                <span className='text-sm'>
                  {new Date(count.startedAt).toLocaleDateString()}
                </span>
              </div>
              {count.completedAt && (
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Completed</span>
                  <span className='text-sm'>
                    {new Date(count.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {count.approvedAt && (
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Approved</span>
                  <span className='text-sm'>
                    {new Date(count.approvedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {count.notes && (
              <>
                <Separator />
                <div>
                  <div className='text-sm font-medium mb-2'>Notes</div>
                  <div className='text-sm text-muted-foreground'>
                    {count.notes}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
