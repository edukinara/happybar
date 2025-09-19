'use client'

import { useAlertDialog } from '@/hooks/use-alert-dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useOrder, useUpdateOrder, type OrderStatus } from '@/lib/queries'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Edit3,
  FileText,
  Package,
  RefreshCw,
  Save,
  Send,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const router = useRouter()
  const { showConfirm } = useAlertDialog()

  // Use our query hooks
  const { data: orderResponse, isLoading: loading, error } = useOrder(orderId)
  const updateOrderMutation = useUpdateOrder()

  // Local UI state
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [receivingMode, setReceivingMode] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number>
  >({})
  const [receivedUnits, setReceivedUnits] = useState<
    Record<string, 'UNIT' | 'CASE'>
  >({})

  const order = orderResponse?.data || null
  const updating = updateOrderMutation.isPending

  // Initialize notes and quantities when order loads
  useEffect(() => {
    if (order) {
      setNotes(order.notes || '')

      // Initialize received quantities and units
      const quantities: Record<string, number> = {}
      const units: Record<string, 'UNIT' | 'CASE'> = {}
      order.items.forEach((item) => {
        quantities[item.id] = item.quantityReceived
        units[item.id] = item.orderingUnit
      })
      setReceivedQuantities(quantities)
      setReceivedUnits(units)
    }
  }, [order])

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error('Failed to load order')
      router.push('/dashboard/orders')
    }
  }, [error, router])

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return

    const updates: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'RECEIVED') {
      updates.receivedDate = new Date().toISOString()
    }

    updateOrderMutation.mutate({ id: order.id, data: updates })
  }

  const saveNotes = async () => {
    if (!order) return

    updateOrderMutation.mutate(
      { id: order.id, data: { notes } },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('Notes saved')
        },
      }
    )
  }

  const convertToOrderingUnit = (
    quantity: number,
    fromUnit: 'UNIT' | 'CASE',
    toUnit: 'UNIT' | 'CASE',
    caseSize: number
  ) => {
    if (fromUnit === toUnit) return quantity

    if (fromUnit === 'UNIT' && toUnit === 'CASE') {
      return quantity / caseSize
    } else if (fromUnit === 'CASE' && toUnit === 'UNIT') {
      return quantity * caseSize
    }

    return quantity
  }

  const markOrderAsReceived = async () => {
    if (!order) return

    // Build items array with updated received quantities, converted to ordering unit
    const items = order.items.map((item) => {
      const receivedQty = receivedQuantities[item.id] || 0
      const receivedUnit = receivedUnits[item.id] || item.orderingUnit

      // Convert received quantity to match the ordering unit for storage
      const convertedQuantity = convertToOrderingUnit(
        receivedQty,
        receivedUnit,
        item.orderingUnit,
        item.product.caseSize
      )

      return {
        id: item.id,
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: convertedQuantity,
        unitCost: item.unitCost,
      }
    })

    // Update order with received quantities and mark as RECEIVED
    updateOrderMutation.mutate(
      {
        id: order.id,
        data: {
          items,
          status: 'RECEIVED' as OrderStatus,
          receivedDate: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setReceivingMode(false)
        },
      }
    )
  }

  const getStatusActions = () => {
    if (!order) return []

    const actions = []

    switch (order.status) {
      case 'DRAFT':
        actions.push({
          label: 'Edit Order',
          icon: Edit3,
          action: () => router.push(`/dashboard/orders/${order.id}/edit`),
          variant: 'outline' as const,
        })
        actions.push({
          label: 'Send Order',
          icon: Send,
          action: () => updateOrderStatus('SENT'),
          variant: 'default' as const,
        })
        actions.push({
          label: 'Cancel',
          icon: X,
          action: () => updateOrderStatus('CANCELLED'),
          variant: 'destructive' as const,
        })
        break

      case 'SENT':
        // No action buttons for SENT status - handled by the receiving mode
        break

      case 'PARTIALLY_RECEIVED':
        actions.push({
          label: 'Close Order',
          icon: Check,
          action: () => {
            showConfirm(
              'Are you sure you want to close this order? This will mark it as complete even though not all items were received.',
              () => updateOrderStatus('RECEIVED'),
              'Close Order',
              'Close Order'
            )
          },
          variant: 'default' as const,
        })
        break
    }

    return actions
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='size-8 animate-spin mr-2' />
        <span>Loading order...</span>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
          <h3 className='text-lg font-medium mb-2'>Order not found</h3>
          <Button asChild>
            <Link href='/dashboard/orders'>
              <ArrowLeft className='size-4 mr-2' />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' asChild>
            <Link href='/dashboard/orders'>
              <ArrowLeft className='size-4 mr-2' />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Order {order.orderNumber}
            </h1>
            <p className='text-muted-foreground'>
              Created {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Badge className={ORDER_STATUS_COLORS[order.status]}>
            {order.status.replace('_', ' ')}
          </Badge>
          {getStatusActions().map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              onClick={action.action}
              disabled={updating}
            >
              <action.icon className='size-4 mr-2' />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className='grid gap-6 lg:grid-cols-7'>
        <div className='lg:col-span-5 space-y-6'>
          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>
                    {order.items.length} item
                    {order.items.length === 1 ? '' : 's'} in this order
                  </CardDescription>
                </div>
                {(order.status === 'SENT' ||
                  order.status === 'PARTIALLY_RECEIVED') &&
                  (receivingMode ? (
                    <div className='flex gap-2'>
                      <Button
                        onClick={markOrderAsReceived}
                        disabled={updating}
                        variant='default'
                      >
                        <Check className='size-4 mr-2' />
                        Mark as Received
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setReceivingMode(false)
                          // Reset quantities and units to current values
                          const quantities: Record<string, number> = {}
                          const units: Record<string, 'UNIT' | 'CASE'> = {}
                          order.items.forEach((item) => {
                            quantities[item.id] = item.quantityReceived
                            units[item.id] = item.orderingUnit
                          })
                          setReceivedQuantities(quantities)
                          setReceivedUnits(units)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        // Default received quantities to ordered quantities
                        const quantities: Record<string, number> = {}
                        const units: Record<string, 'UNIT' | 'CASE'> = {}
                        order.items.forEach((item) => {
                          // If already partially received, default to ordered quantity
                          quantities[item.id] =
                            item.quantityReceived > 0
                              ? item.quantityReceived
                              : item.quantityOrdered
                          units[item.id] = item.orderingUnit
                        })
                        setReceivedQuantities(quantities)
                        setReceivedUnits(units)
                        setReceivingMode(true)
                      }}
                      disabled={updating}
                      variant='default'
                    >
                      <Package className='size-4 mr-2' />
                      Update Received Quantities
                    </Button>
                  ))}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Ordered Unit</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className='font-medium'>{item.product.name}</div>
                          <div className='text-sm text-muted-foreground'>
                            {item.product.sku && `SKU: ${item.product.sku} • `}
                            {item.product.category.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantityOrdered.toFixed(2)}</TableCell>
                      <TableCell>
                        {receivingMode &&
                        (order.status === 'SENT' ||
                          order.status === 'PARTIALLY_RECEIVED') ? (
                          <div className='flex items-center gap-2'>
                            <Input
                              type='number'
                              min='0'
                              step='0.01'
                              value={receivedQuantities[item.id] || 0}
                              onChange={(e) => {
                                const value = Math.max(
                                  0,
                                  parseFloat(e.target.value) || 0
                                )
                                setReceivedQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: value,
                                }))
                              }}
                              className='w-20 h-8'
                            />
                            <Select
                              value={
                                receivedUnits[item.id] || item.orderingUnit
                              }
                              onValueChange={(value: 'UNIT' | 'CASE') => {
                                setReceivedUnits((prev) => ({
                                  ...prev,
                                  [item.id]: value,
                                }))
                              }}
                            >
                              <SelectTrigger className='w-22 h-8'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='UNIT'>Units</SelectItem>
                                <SelectItem value='CASE'>Cases</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span
                            className={
                              item.quantityReceived < item.quantityOrdered
                                ? 'text-orange-600'
                                : item.quantityReceived === item.quantityOrdered
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }
                          >
                            {item.quantityReceived.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='text-xs'>
                          {item.orderingUnit === 'CASE'
                            ? `Case (${item.product.caseSize})`
                            : 'Unit'}
                        </Badge>
                      </TableCell>
                      <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <FileText className='size-5' />
                    Notes
                  </CardTitle>
                  <CardDescription>
                    Additional information about this order
                  </CardDescription>
                </div>
                {!editing && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className='size-4 mr-2' />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className='space-y-4'>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='Add notes about this order...'
                    rows={4}
                  />
                  <div className='flex gap-2'>
                    <Button onClick={saveNotes} disabled={updating}>
                      <Save className='size-4 mr-2' />
                      Save
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setEditing(false)
                        setNotes(order.notes || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='text-sm'>
                  {order.notes || (
                    <span className='text-muted-foreground italic'>
                      No notes added
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='size-5' />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <div className='font-medium'>{order.supplier.name}</div>
                {order.supplier.contactEmail && (
                  <div className='text-sm text-muted-foreground'>
                    {order.supplier.contactEmail}
                  </div>
                )}
                {order.supplier.contactPhone && (
                  <div className='text-sm text-muted-foreground'>
                    {order.supplier.contactPhone}
                  </div>
                )}
              </div>
              {order.supplier.address && (
                <div className='text-sm text-muted-foreground'>
                  {order.supplier.address}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <DollarSign className='size-5' />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span>Items:</span>
                <span>{order.items.length}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span>Total Quantity:</span>
                <span>
                  {order.items
                    .reduce((sum, item) => sum + item.quantityOrdered, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className='border-t pt-2'>
                <div className='flex justify-between font-semibold'>
                  <span>Total Amount:</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='size-5' />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span>Order Date:</span>
                <span>{new Date(order.orderDate).toLocaleDateString()}</span>
              </div>
              {order.expectedDate && (
                <div className='flex justify-between text-sm'>
                  <span>Expected:</span>
                  <span>
                    {new Date(order.expectedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {order.receivedDate && (
                <div className='flex justify-between text-sm'>
                  <span>Received:</span>
                  <span>
                    {new Date(order.receivedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
