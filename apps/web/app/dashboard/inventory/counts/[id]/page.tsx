'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComp } from '@/components/ui/calendar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { inventoryApi } from '@/lib/api/inventory'
import { getProducts } from '@/lib/api/products'
import {
  CountType,
  InventoryCountStatus,
  type CountArea,
  type InventoryCountItem,
  type InventoryCountType,
  type InventoryProduct,
} from '@happy-bar/types'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronDownIcon,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  MapPin,
  Package,
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
  const [customCompletionOpen, setCustomCompletionOpen] = useState(false)
  const [customCompletionDate, setCustomCompletionDate] = useState<
    Date | undefined
  >(count?.completedAt ? new Date(count.completedAt) : new Date())
  const [customCompletionTime, setCustomCompletionTime] = useState('00:00:00')
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

  const countId = params.id as string

  useEffect(() => {
    if (countId) {
      fetchCount()
      fetchProducts()
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

  const fetchProducts = async () => {
    try {
      const response = await getProducts()
      setProducts(response.products)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const handleApproveCount = async (customDate?: string) => {
    if (!count || approving) return

    try {
      setApproving(true)
      setError(null) // Clear any previous errors

      const updateData: {
        status: InventoryCountStatus
        customCompletedAt?: string
      } = {
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
      setCustomCompletionDate(new Date())
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
      ? new Date(count.completedAt)
      : new Date()
    setCustomCompletionDate(defaultDate)
    setCustomCompletionTime(
      `${defaultDate.getUTCHours()}:${defaultDate.getUTCMinutes()}:${defaultDate.getUTCSeconds()}`
    )
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

  const toggleAreaExpansion = (areaId: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(areaId)) {
        newSet.delete(areaId)
      } else {
        newSet.add(areaId)
      }
      return newSet
    })
  }

  const getProductById = (productId: string) => {
    return products.find((p) => p.id === productId)
  }

  const calculateAreaTotals = (area: CountArea) => {
    let totalItems = 0
    let totalValue = 0

    if (area.items) {
      area.items.forEach((item: InventoryCountItem) => {
        totalItems += item.totalQuantity
        const product = getProductById(item.productId)
        if (product) {
          totalValue += item.totalQuantity * product.costPerUnit
        }
      })
    }

    return { totalItems, totalValue }
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
            <Dialog
              open={showApprovalDialog}
              onOpenChange={setShowApprovalDialog}
            >
              <DialogTrigger asChild>
                <Button onClick={handleOpenApprovalDialog} disabled={approving}>
                  <CheckCircle className='size-4 mr-2' />
                  Approve & Apply to Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                  <DialogTitle>Approve Inventory Count</DialogTitle>
                  <DialogDescription>
                    Approving this count will immediately update your inventory
                    levels based on the count results. You can optionally
                    specify a custom completion date/time.
                  </DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  {error && (
                    <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                      {error}
                    </div>
                  )}
                  <div className='flex flex-col items-start gap-2'>
                    <Label htmlFor='completion-date'>Completed At</Label>
                    <div className='flex gap-2'>
                      <div className='flex flex-col gap-3'>
                        <Popover
                          open={customCompletionOpen}
                          onOpenChange={setCustomCompletionOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              id='date-picker'
                              className='w-32 justify-between font-normal'
                            >
                              {customCompletionDate
                                ? customCompletionDate.toLocaleDateString()
                                : 'Select date'}
                              <ChevronDownIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-auto overflow-hidden p-0'
                            align='start'
                          >
                            <CalendarComp
                              mode='single'
                              selected={customCompletionDate}
                              captionLayout='dropdown'
                              onSelect={(date) => {
                                setCustomCompletionDate(date)
                                setCustomCompletionOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className='flex flex-col gap-3'>
                        <Input
                          type='time'
                          id='time-picker'
                          step='1'
                          value={customCompletionTime}
                          onChange={(t) =>
                            setCustomCompletionTime(t.target.value)
                          }
                          className='bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                        />
                      </div>
                    </div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      This will be used as the count completion time for
                      reporting. If earlier than the start time, the start time
                      will be adjusted.
                    </p>
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
                    onClick={() =>
                      handleApproveCount(
                        new Date(
                          `${customCompletionDate?.toISOString().slice(0, 11)}${customCompletionTime}`
                        ).toISOString()
                      )
                    }
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
        <Card className='gap-2'>
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

        <Card className='gap-2'>
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

        <Card className='gap-2'>
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

        <Card className='gap-2'>
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

      {/* Count Overview Tabs */}
      <Tabs defaultValue='areas' className='space-y-4'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='areas'>Count Areas</TabsTrigger>
          <TabsTrigger
            value='details'
            disabled={
              count.status !== InventoryCountStatus.COMPLETED &&
              count.status !== InventoryCountStatus.APPROVED
            }
          >
            Count Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value='areas' className='grid gap-6 md:grid-cols-2'>
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
              <CardTitle>Count Summary</CardTitle>
              <CardDescription>Summary and metadata</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Count Type</span>
                  <span className='text-sm'>
                    {getCountTypeLabel(count.type)}
                  </span>
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
        </TabsContent>

        <TabsContent value='details' className='space-y-6'>
          {(count.status === InventoryCountStatus.COMPLETED ||
            count.status === InventoryCountStatus.APPROVED) &&
            count.areas && (
              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Count Results</CardTitle>
                    <CardDescription>
                      View all counted items by area
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {count.areas.map((area, index) => {
                      const isExpanded = expandedAreas.has(area.id)
                      const { totalItems, totalValue } =
                        calculateAreaTotals(area)

                      return (
                        <div key={area.id} className='mb-6'>
                          <button
                            onClick={() => toggleAreaExpansion(area.id)}
                            className='w-full text-left'
                          >
                            <div className='flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors'>
                              <div className='flex items-center gap-3'>
                                {isExpanded ? (
                                  <ChevronDown className='size-5' />
                                ) : (
                                  <ChevronRight className='size-5' />
                                )}
                                <div className='w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold'>
                                  {index + 1}
                                </div>
                                <div>
                                  <div className='font-medium text-lg'>
                                    {area.name}
                                  </div>
                                  <div className='text-sm text-muted-foreground'>
                                    {area.items?.length || 0} unique items •
                                    {totalItems.toFixed(2)} total units • $
                                    {totalValue.toFixed(2)} value
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  area.status === 'COMPLETED'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {area.status}
                              </Badge>
                            </div>
                          </button>

                          {isExpanded &&
                            area.items &&
                            area.items.length > 0 && (
                              <div className='mt-4 pl-4'>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className='w-[40px]'></TableHead>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead className='text-right'>
                                        Full Units
                                      </TableHead>
                                      <TableHead className='text-right'>
                                        Partial
                                      </TableHead>
                                      <TableHead className='text-right'>
                                        Total Qty
                                      </TableHead>
                                      <TableHead className='text-right'>
                                        Unit Cost
                                      </TableHead>
                                      <TableHead className='text-right'>
                                        Total Value
                                      </TableHead>
                                      <TableHead>Notes</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {area.items.map((item) => {
                                      const product = getProductById(
                                        item.productId
                                      )
                                      const totalValue = product
                                        ? item.totalQuantity *
                                          product.costPerUnit
                                        : 0

                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell>
                                            <Package className='size-4 text-muted-foreground' />
                                          </TableCell>
                                          <TableCell className='font-medium'>
                                            {product?.name || 'Unknown Product'}
                                          </TableCell>
                                          <TableCell>
                                            {product?.category?.name || '-'}
                                          </TableCell>
                                          <TableCell className='text-right'>
                                            {item.fullUnits}
                                          </TableCell>
                                          <TableCell className='text-right'>
                                            {item.partialUnit.toFixed(1)}
                                          </TableCell>
                                          <TableCell className='text-right font-medium'>
                                            {item.totalQuantity.toFixed(2)}
                                          </TableCell>
                                          <TableCell className='text-right'>
                                            $
                                            {product?.costPerUnit.toFixed(2) ||
                                              '0.00'}
                                          </TableCell>
                                          <TableCell className='text-right font-medium'>
                                            ${totalValue.toFixed(2)}
                                          </TableCell>
                                          <TableCell className='max-w-[200px] truncate'>
                                            {item.notes || '-'}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Count Summary</CardTitle>
                    <CardDescription>
                      Overall totals across all areas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Total Areas
                        </p>
                        <p className='text-2xl font-bold'>
                          {count.areas.length}
                        </p>
                      </div>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Unique Items
                        </p>
                        <p className='text-2xl font-bold'>
                          {count.areas.reduce(
                            (acc, area) => acc + (area.items?.length || 0),
                            0
                          )}
                        </p>
                      </div>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Total Units
                        </p>
                        <p className='text-2xl font-bold'>
                          {count.areas
                            .reduce((acc, area) => {
                              const { totalItems } = calculateAreaTotals(area)
                              return acc + totalItems
                            }, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Total Value
                        </p>
                        <p className='text-2xl font-bold'>
                          $
                          {count.areas
                            .reduce((acc, area) => {
                              const { totalValue } = calculateAreaTotals(area)
                              return acc + totalValue
                            }, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
