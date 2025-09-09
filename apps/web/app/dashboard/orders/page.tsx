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
import { useOrders, useUpdateOrder, type OrderStatus } from '@/lib/queries'
import {
  AlertCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
  })

  // Use query hooks for data fetching
  const { data: ordersResponse, isLoading: loading, error } = useOrders({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    limit: pagination.limit,
    offset: pagination.offset,
  })
  
  const updateOrderMutation = useUpdateOrder()
  
  const orders = ordersResponse?.data || []
  const totalOrders = ordersResponse?.pagination?.total || 0

  // Calculate stats from current orders data
  const stats = useMemo(() => {
    const totalSpend = orders.reduce(
      (sum, order) =>
        order.status !== 'CANCELLED' ? sum + order.totalAmount : sum,
      0
    )
    const pendingOrders = orders.filter((order) =>
      ['SENT', 'PARTIALLY_RECEIVED'].includes(order.status)
    ).length
    const draftOrders = orders.filter(
      (order) => order.status === 'DRAFT'
    ).length

    return {
      totalOrders,
      totalSpend,
      pendingOrders,
      draftOrders,
    }
  }, [orders, totalOrders])

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    updateOrderMutation.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`)
        },
        onError: () => {
          toast.error('Failed to update order status')
        },
      }
    )
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='size-8 animate-spin mr-2' />
        <span>Loading orders...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>Failed to load orders</h2>
          <p className='text-muted-foreground'>Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen brand-gradient relative'>
      {/* Floating orbs */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='brand-orb-primary w-96 h-96 absolute -top-20 -left-20 animate-float' />
        <div className='brand-orb-accent w-80 h-80 absolute top-60 -right-20 animate-float-reverse' />
        <div className='brand-orb-primary w-64 h-64 absolute bottom-40 left-1/3 animate-float' />
      </div>

      <div className='relative z-10 p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
              Order Management
            </h1>
            <p className='text-muted-foreground'>
              Create, track, and manage supplier orders
            </p>
          </div>
          <div className='flex gap-2'>
            <Button asChild variant='outline'>
              <Link href='/dashboard/orders/suggestions'>
                <TrendingUp className='size-4 mr-2 brand-icon-primary' />
                Reorder Suggestions
              </Link>
            </Button>
            <Button asChild className='btn-brand-primary'>
              <Link href='/dashboard/orders/new'>
                <Plus className='size-4 mr-2' />
                New Order
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Orders
              </CardTitle>
              <Package className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalOrders}</div>
              <p className='text-xs text-muted-foreground'>All time</p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Spend</CardTitle>
              <DollarSign className='size-4 brand-icon-accent' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                $
                {stats.totalSpend.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className='text-xs text-muted-foreground'>
                Excluding cancelled
              </p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Pending Orders
              </CardTitle>
              <Clock className='size-4 brand-icon-accent' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-orange-600'>
                {stats.pendingOrders}
              </div>
              <p className='text-xs text-muted-foreground'>Awaiting receipt</p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Draft Orders
              </CardTitle>
              <AlertCircle className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-600'>
                {stats.draftOrders}
              </div>
              <p className='text-xs text-muted-foreground'>Need to be sent</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Manage your supplier orders and track delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-4 mb-6'>
              <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  placeholder='Search orders...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as OrderStatus | 'ALL')
                }
              >
                <SelectTrigger className='w-48'>
                  <Filter className='size-4 mr-2' />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All Statuses</SelectItem>
                  <SelectItem value='DRAFT'>Draft</SelectItem>
                  <SelectItem value='SENT'>Sent</SelectItem>
                  <SelectItem value='PARTIALLY_RECEIVED'>
                    Partially Received
                  </SelectItem>
                  <SelectItem value='RECEIVED'>Received</SelectItem>
                  <SelectItem value='CANCELLED'>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredOrders.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                <h3 className='text-lg font-medium mb-2'>No orders found</h3>
                <p className='text-sm mb-4'>
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first order to get started'}
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
                  <Button asChild className='btn-brand-primary'>
                    <Link href='/dashboard/orders/new'>
                      <Plus className='size-4 mr-2' />
                      Create First Order
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className='hover:bg-muted/50'>
                      <TableCell className='font-medium'>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{order.supplier.name}</TableCell>
                      <TableCell>
                        <Badge className={ORDER_STATUS_COLORS[order.status]}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {order.expectedDate
                          ? new Date(order.expectedDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>
                        $
                        {order.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Button size='sm' variant='outline' asChild>
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Eye className='size-4 mr-1' />
                              {order.status === 'SENT' ||
                              order.status === 'PARTIALLY_RECEIVED'
                                ? 'Receive Items'
                                : 'View'}
                            </Link>
                          </Button>

                          {order.status === 'DRAFT' && (
                            <>
                              <Button size='sm' variant='outline' asChild>
                                <Link href={`/dashboard/orders/${order.id}/edit`}>
                                  <Edit className='size-4 mr-1' />
                                  Edit
                                </Link>
                              </Button>
                              <Button
                                size='sm'
                                onClick={() =>
                                  handleStatusChange(order.id, 'SENT')
                                }
                                className='btn-brand-primary'
                              >
                                <Send className='size-4 mr-1' />
                                Send
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {totalOrders > pagination.limit && (
              <div className='flex items-center justify-between mt-6'>
                <p className='text-sm text-muted-foreground'>
                  Showing {pagination.offset + 1} to{' '}
                  {Math.min(
                    pagination.offset + pagination.limit,
                    totalOrders
                  )}{' '}
                  of {totalOrders} orders
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={pagination.offset === 0}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: Math.max(0, prev.offset - prev.limit),
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={
                      pagination.offset + pagination.limit >= totalOrders
                    }
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: prev.offset + prev.limit,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
