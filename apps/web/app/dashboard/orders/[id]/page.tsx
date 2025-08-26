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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ordersApi, type Order, type OrderStatus } from '@/lib/api/orders'
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
  CONFIRMED: 'bg-green-100 text-green-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadOrder()
  }, [params.id])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const response = await ordersApi.getOrder(orderId)
      setOrder(response.data)
      setNotes(response.data.notes || '')
    } catch (error) {
      console.error('Failed to load order:', error)
      toast.error('Failed to load order')
      router.push('/dashboard/orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return

    try {
      setUpdating(true)
      const updates: Partial<Order> = { status: newStatus }

      if (newStatus === 'RECEIVED') {
        updates.receivedDate = new Date().toISOString()
      }

      await ordersApi.updateOrder(order.id, updates)
      toast.success(`Order ${newStatus.toLowerCase()}`)
      loadOrder()
    } catch (_error) {
      toast.error('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const saveNotes = async () => {
    if (!order) return

    try {
      setUpdating(true)
      await ordersApi.updateOrder(order.id, { notes })
      toast.success('Notes updated')
      setEditing(false)
      loadOrder()
    } catch (_error) {
      toast.error('Failed to update notes')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusActions = () => {
    if (!order) return []

    const actions = []

    switch (order.status) {
      case 'DRAFT':
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
        actions.push({
          label: 'Confirm',
          icon: Check,
          action: () => updateOrderStatus('CONFIRMED'),
          variant: 'default' as const,
        })
        actions.push({
          label: 'Cancel',
          icon: X,
          action: () => updateOrderStatus('CANCELLED'),
          variant: 'destructive' as const,
        })
        break

      case 'CONFIRMED':
      case 'PARTIALLY_RECEIVED':
        actions.push({
          label: 'Mark as Received',
          icon: Package,
          action: () => updateOrderStatus('RECEIVED'),
          variant: 'default' as const,
        })
        break
    }

    return actions
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='h-8 w-8 animate-spin mr-2' />
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
              <ArrowLeft className='h-4 w-4 mr-2' />
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
              <ArrowLeft className='h-4 w-4 mr-2' />
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
              <action.icon className='h-4 w-4 mr-2' />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2 space-y-6'>
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {order.items.length} item{order.items.length === 1 ? '' : 's'}{' '}
                in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity Ordered</TableHead>
                    <TableHead>Quantity Received</TableHead>
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
                        <span
                          className={
                            item.quantityReceived < item.quantityOrdered
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }
                        >
                          {item.quantityReceived.toFixed(2)}
                        </span>
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
                    <FileText className='h-5 w-5' />
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
                    <Edit3 className='h-4 w-4 mr-2' />
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
                      <Save className='h-4 w-4 mr-2' />
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
        <div className='space-y-6'>
          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='h-5 w-5' />
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
                <DollarSign className='h-5 w-5' />
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
                <Calendar className='h-5 w-5' />
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
