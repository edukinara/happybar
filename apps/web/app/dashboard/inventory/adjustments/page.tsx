'use client'

import { LocationFilter } from '@/components/dashboard/LocationFilter'
import { HappBarLoader } from '@/components/HappyBarLoader'
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
import { inventoryApi } from '@/lib/api/inventory'
import type {
  AdjustmentReason,
  InventoryItemWithBasicProduct,
  StockMovement,
} from '@happy-bar/types'
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  MinusCircle,
  PlusCircle,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<InventoryItemWithBasicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Form state for creating adjustments
  const [formData, setFormData] = useState({
    productId: '',
    locationId: '',
    adjustment: 0,
    reason: 'CORRECTION' as AdjustmentReason,
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [selectedLocationId, pagination.page])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [adjustmentsData, productsData] = await Promise.all([
        inventoryApi.getAdjustments({
          locationId: selectedLocationId,
          page: pagination.page,
          limit: pagination.limit,
        }),
        inventoryApi.getInventoryProducts(),
      ])

      // Filter for adjustment movements only
      const adjustmentMovements = adjustmentsData.movements.filter(
        (movement) =>
          movement.type === 'ADJUSTMENT_IN' ||
          movement.type === 'ADJUSTMENT_OUT'
      )

      setAdjustments(adjustmentMovements)
      setPagination(adjustmentsData.pagination)
      setProducts(productsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load adjustments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.productId ||
      !formData.locationId ||
      formData.adjustment === 0
    ) {
      toast.error('Please fill in all required fields')
      return
    }
    const productId = products.find(
      (product) => product.id === formData.productId
    )?.productId
    if (!productId) {
      toast.error('Product not found')
      return
    }

    try {
      setSubmitting(true)
      await inventoryApi.createAdjustment({
        ...formData,
        productId,
      })

      toast.success('Adjustment created successfully')
      setShowCreateDialog(false)
      setFormData({
        productId: '',
        locationId: '',
        adjustment: 0,
        reason: 'CORRECTION' as AdjustmentReason,
        notes: '',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to create adjustment:', error)
      toast.error('Failed to create adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const getAdjustmentStats = () => {
    const totalAdjustments = adjustments.length
    const netImpact = adjustments.reduce((sum, adj) => {
      const value = adj.quantity * (adj.product?.costPerUnit || 0)
      return sum + (adj.type === 'ADJUSTMENT_IN' ? value : -value)
    }, 0)

    const reasons = adjustments.reduce(
      (acc, adj) => {
        const reason = adj.reason || 'OTHER'
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const commonReason =
      Object.entries(reasons).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

    return {
      total: totalAdjustments,
      netImpact,
      commonReason,
    }
  }

  const stats = getAdjustmentStats()

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappBarLoader />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Inventory Adjustments
          </h1>
          <p className='text-muted-foreground'>
            Track and manage inventory adjustments for damage, loss,
            corrections, and found items.
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className='mr-2 size-4' />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[525px]'>
            <DialogHeader>
              <DialogTitle>Create Inventory Adjustment</DialogTitle>
              <DialogDescription>
                Adjust inventory levels for damage, loss, corrections, or found
                items.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdjustment} className='space-y-4'>
              <div className='gap-0'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='product'>Product *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, productId: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select product' />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='location'>Location *</Label>
                    <LocationFilter
                      selectedLocationId={formData.locationId}
                      onLocationChange={(locationId) =>
                        setFormData({
                          ...formData,
                          locationId: locationId || '',
                        })
                      }
                      placeholder='Select location'
                    />
                  </div>
                </div>
                {formData.productId && (
                  <p className='text-secondary font-semibold text-sm px-3'>
                    {' '}
                    Current Qty:{' '}
                    {
                      +(
                        products.find(
                          (product) => product.id === formData.productId
                        )?.currentQuantity || 0
                      )?.toFixed(2)
                    }
                  </p>
                )}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='adjustment'>Adjustment Quantity *</Label>
                  <Input
                    id='adjustment'
                    type='number'
                    step='0.1'
                    value={formData.adjustment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adjustment: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder='Enter + for increase, - for decrease'
                    required
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    Use positive numbers to increase inventory, negative to
                    decrease
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='reason'>Reason *</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value: AdjustmentReason) =>
                      setFormData({ ...formData, reason: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DAMAGE'>Damage</SelectItem>
                      <SelectItem value='LOSS'>Loss/Theft</SelectItem>
                      <SelectItem value='FOUND'>Found Items</SelectItem>
                      <SelectItem value='CORRECTION'>
                        Count Correction
                      </SelectItem>
                      <SelectItem value='OTHER'>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='notes'>Notes</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder='Optional notes about this adjustment...'
                  rows={3}
                />
              </div>

              <div className='flex justify-end space-x-2 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={submitting}
                  loading={submitting}
                >
                  Create Adjustment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Adjustments
            </CardTitle>
            <Settings className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
            <p className='text-xs text-muted-foreground'>
              {selectedLocationId
                ? 'In selected location'
                : 'Across all locations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Net Impact</CardTitle>
            {stats.netImpact >= 0 ? (
              <TrendingUp className='size-4 text-green-600' />
            ) : (
              <TrendingDown className='size-4 text-red-600' />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              ${Math.abs(stats.netImpact).toFixed(2)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {stats.netImpact >= 0 ? 'Net gain' : 'Net loss'} in inventory
              value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Common Reason</CardTitle>
            <AlertTriangle className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.commonReason}</div>
            <p className='text-xs text-muted-foreground'>
              Most frequent adjustment type
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Recent Adjustments</CardTitle>
              <CardDescription>
                History of all inventory adjustments
              </CardDescription>
            </div>
            <LocationFilter
              selectedLocationId={selectedLocationId}
              onLocationChange={setSelectedLocationId}
              placeholder='Filter by location'
            />
          </div>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No Adjustments Found
              </h3>
              <p className='text-muted-foreground mb-4'>
                {selectedLocationId
                  ? 'No adjustments found for the selected location.'
                  : 'No inventory adjustments have been made yet.'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusCircle className='mr-2 size-4' />
                Create First Adjustment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => {
                  const isIncrease = adjustment.type === 'ADJUSTMENT_IN'
                  const value =
                    adjustment.quantity * (adjustment.product?.costPerUnit || 0)

                  return (
                    <TableRow key={adjustment.id}>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <CalendarDays className='size-4 text-muted-foreground' />
                          <span className='text-sm'>
                            {new Date(
                              adjustment.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className='font-medium'>
                            {adjustment.product?.name}
                          </div>
                          {adjustment.product?.sku && (
                            <div className='text-sm text-muted-foreground'>
                              SKU: {adjustment.product.sku}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm'>
                          {adjustment.fromLocation?.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          {isIncrease ? (
                            <PlusCircle className='size-4 text-green-600' />
                          ) : (
                            <MinusCircle className='size-4 text-red-600' />
                          )}
                          <span
                            className={
                              isIncrease ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {isIncrease ? 'Increase' : 'Decrease'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {isIncrease ? '+' : '-'}
                          {adjustment.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {isIncrease ? '+' : '-'}${value.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='capitalize text-sm'>
                          {adjustment.reason?.toLowerCase().replace('_', ' ') ||
                            'Other'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <User className='size-4 text-muted-foreground' />
                          <span className='text-sm'>
                            {adjustment.user?.name || adjustment.user?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm text-muted-foreground'>
                          {adjustment.notes || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className='flex items-center justify-between space-x-2 py-4'>
              <div className='text-sm text-muted-foreground'>
                Showing page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </div>
              <div className='space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.max(1, p.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.totalPages, p.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
