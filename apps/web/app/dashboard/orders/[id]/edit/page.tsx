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
import { Textarea } from '@/components/ui/textarea'
import { inventoryApi } from '@/lib/api/inventory'
import { useOrder, useUpdateOrder } from '@/lib/queries'
import {
  ArrowLeft,
  Building2,
  Calculator,
  Package,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku?: string
  costPerUnit: number
  unit: string
  category: {
    id: string
    name: string
  }
  suppliers?: ProductSupplier[]
}

interface ProductSupplier {
  id: string
  supplierId: string
  supplierName: string
  supplierSku?: string
  orderingUnit: 'UNIT' | 'CASE'
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  minimumOrderUnit?: 'UNIT' | 'CASE'
  packSize?: number
  leadTimeDays: number
  isPreferred: boolean
}

interface OrderItem {
  id?: string
  productId: string
  product?: Product
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
  orderingUnit: 'UNIT' | 'CASE'
}

export default function EditOrderPage() {
  const params = useParams()
  const orderId = params.id as string
  const router = useRouter()

  // Use query hooks
  const { data: orderResponse, isLoading: loading, error } = useOrder(orderId)
  const updateOrderMutation = useUpdateOrder()

  const order = orderResponse?.data || null

  // State
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')

  // Load products when order is available
  useEffect(() => {
    if (order) {
      loadProducts()
    }
  }, [order])

  // Initialize form with order data
  useEffect(() => {
    if (order) {
      // Check if order is a draft
      if (order.status !== 'DRAFT') {
        toast.error('Only draft orders can be edited')
        router.push(`/dashboard/orders/${orderId}`)
        return
      }

      setExpectedDate(
        order.expectedDate
          ? new Date(order.expectedDate).toISOString().split('T')[0]
          : ''
      )
      setNotes(order.notes || '')

      // Convert order items to editable format
      const items: OrderItem[] = order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku || undefined,
          costPerUnit: item.product.costPerUnit,
          unit: item.product.unit || 'unit',
          category: item.product.category,
        },
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        orderingUnit: item.orderingUnit,
      }))
      setOrderItems(items)
    }
  }, [order, orderId, router])

  const loadProducts = async () => {
    if (!order) return

    try {
      setProductsLoading(true)
      // Load suppliers, products, and product-supplier relationships in parallel
      const [inventoryResponse, productSuppliers] = await Promise.all([
        inventoryApi.getInventoryLevels(),
        (async () => {
          const { suppliersApi } = await import('@/lib/api/suppliers')
          return suppliersApi.getProductSuppliers()
        })(),
      ])

      // Extract products that are available from this order's supplier
      const uniqueProducts = inventoryResponse.reduce(
        (acc: Product[], item) => {
          const existingProduct = acc.find((p) => p.id === item.product.id)
          if (!existingProduct) {
            // Find suppliers for this product
            const suppliers = productSuppliers
              .filter((ps) => ps.productId === item.product.id)
              .map((ps) => ({
                id: ps.id,
                supplierId: ps.supplierId,
                supplierName: ps.supplier?.name || '',
                supplierSku: ps.supplierSku,
                orderingUnit: ps.orderingUnit,
                costPerUnit: ps.costPerUnit,
                costPerCase: ps.costPerCase,
                minimumOrder: ps.minimumOrder,
                minimumOrderUnit: ps.minimumOrderUnit,
                packSize: ps.packSize,
                leadTimeDays: ps.leadTimeDays,
                isPreferred: ps.isPreferred,
              }))

            // Only include products that have suppliers matching this order's supplier
            const hasMatchingSupplier = suppliers.some(
              (supplier) => supplier.supplierId === order.supplier.id
            )

            if (hasMatchingSupplier) {
              acc.push({
                id: item.product.id,
                name: item.product.name,
                sku: item.product.sku ?? undefined,
                costPerUnit: item.product.costPerUnit,
                unit: item.product.unit || 'unit',
                category: item.product.category,
                suppliers,
              })
            }
          }
          return acc
        },
        []
      )
      setProducts(uniqueProducts)
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    } finally {
      setProductsLoading(false)
    }
  }

  const addOrderItem = () => {
    if (!order) return

    const selectedProduct = products.find((p) => p.id === selectedProductId)
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }

    // Check if product already exists in order
    if (orderItems.some((item) => item.productId === selectedProductId)) {
      toast.error('Product already added to order')
      return
    }

    // Find the supplier configuration for this product and the order's supplier
    const supplierConfig = selectedProduct.suppliers?.find(
      (supplier) => supplier.supplierId === order.supplier.id
    )

    if (!supplierConfig) {
      toast.error('Product not available from this supplier')
      return
    }

    // Use the appropriate cost based on ordering unit preference
    const unitCost =
      supplierConfig.orderingUnit === 'CASE' && supplierConfig.costPerCase
        ? supplierConfig.costPerCase
        : supplierConfig.costPerUnit

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      product: selectedProduct,
      quantityOrdered: supplierConfig.minimumOrder || 1,
      quantityReceived: 0,
      unitCost: unitCost,
      totalCost: (supplierConfig.minimumOrder || 1) * unitCost,
      orderingUnit: supplierConfig.orderingUnit,
    }

    setOrderItems([...orderItems, newItem])
    setSelectedProductId('')
  }

  const updateOrderItem = (
    index: number,
    field: keyof OrderItem,
    value: unknown
  ) => {
    const updatedItems = [...orderItems]
    const currentItem = updatedItems[index]
    if (!currentItem) return

    // Update the field
    updatedItems[index] = {
      ...currentItem,
      [field]: value,
    }

    // Always recalculate total cost
    updatedItems[index].totalCost =
      updatedItems[index].quantityOrdered * updatedItems[index].unitCost

    setOrderItems(updatedItems)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.totalCost, 0)
  }

  const saveOrder = async (sendOrder = false) => {
    if (!order) return

    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order')
      return
    }

    try {
      // Prepare update data
      const updateData = {
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        status: sendOrder ? 'SENT' as const : 'DRAFT' as const,
        items: orderItems.map((item) => ({
          id: item.id, // Include ID for existing items
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit,
        })),
      }

      // Update the order
      await new Promise<void>((resolve, reject) => {
        updateOrderMutation.mutate(
          { id: orderId, data: updateData },
          {
            onSuccess: () => {
              toast.success(
                sendOrder
                  ? 'Order updated and sent successfully!'
                  : 'Order updated successfully!'
              )
              resolve()
            },
            onError: (error) => {
              console.error('Failed to update order:', error)
              reject(error)
            },
          }
        )
      })

      router.push('/dashboard/orders')
    } catch (error) {
      console.error('Failed to save order:', error)
      toast.error('Failed to save order')
    }
  }

  if (loading || productsLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Package className='h-12 w-12 mx-auto mb-4 text-gray-300 animate-pulse' />
          <p className='text-muted-foreground'>Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Package className='h-12 w-12 mx-auto mb-4 text-red-300' />
          <h2 className='text-xl font-semibold mb-2'>Order not found</h2>
          <p className='text-muted-foreground mb-4'>
            The order you're looking for doesn't exist or has been deleted.
          </p>
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
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Edit Order #{order.orderNumber}
          </h1>
          <p className='text-muted-foreground'>
            Modify draft order details and items
          </p>
        </div>
        <Button variant='outline' asChild>
          <Link href='/dashboard/orders'>
            <ArrowLeft className='size-4 mr-2' />
            Cancel
          </Link>
        </Button>
      </div>

      {/* Order Form */}
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Order Details */}
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Update order information
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <label className='text-sm font-medium mb-2 block'>
                    Supplier
                  </label>
                  <div className='flex items-center gap-2 p-2 border rounded-md bg-muted'>
                    <Building2 className='size-4 text-muted-foreground' />
                    <span className='font-medium'>{order.supplier.name}</span>
                  </div>
                </div>
                <div>
                  <label className='text-sm font-medium mb-2 block'>
                    Expected Delivery Date
                  </label>
                  <Input
                    type='date'
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className='text-sm font-medium mb-2 block'>Notes</label>
                <Textarea
                  placeholder='Add any special instructions or notes for this order...'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Manage products in this order</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Item Form */}
              <div className='flex gap-2 mb-6'>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue placeholder='Select product to add' />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter(
                        (product) =>
                          !orderItems.some(
                            (item) => item.productId === product.id
                          )
                      )
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className='flex items-center justify-between w-full'>
                            <span>{product.name}</span>
                            <Badge variant='secondary' className='ml-2'>
                              {product.category.name}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addOrderItem} disabled={!selectedProductId}>
                  <Plus className='size-4 mr-2' />
                  Add
                </Button>
              </div>

              {/* Order Items Table */}
              {orderItems.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <h3 className='text-lg font-medium mb-2'>No items in order</h3>
                  <p className='text-sm'>Add products to update your order</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity & Unit</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {item.product?.name}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {item.product?.sku && `SKU: ${item.product.sku} • `}
                              {item.product?.category.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Input
                              type='number'
                              min='1'
                              step='1'
                              value={item.quantityOrdered}
                              onChange={(e) =>
                                updateOrderItem(
                                  index,
                                  'quantityOrdered',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className='w-20'
                            />
                            <Select
                              value={item.orderingUnit}
                              onValueChange={(value) =>
                                updateOrderItem(
                                  index,
                                  'orderingUnit',
                                  value as 'UNIT' | 'CASE'
                                )
                              }
                            >
                              <SelectTrigger className='w-20'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='UNIT'>Unit</SelectItem>
                                <SelectItem value='CASE'>Case</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            min='0.01'
                            step='0.01'
                            value={item.unitCost}
                            onChange={(e) =>
                              updateOrderItem(
                                index,
                                'unitCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-24'
                          />
                        </TableCell>
                        <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => removeOrderItem(index)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className='sticky top-6'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calculator className='size-5' />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>Status:</span>
                  <Badge className='bg-gray-100 text-gray-800'>Draft</Badge>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Items:</span>
                  <span>{orderItems.length}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Total Quantity:</span>
                  <span>
                    {orderItems
                      .reduce((sum, item) => sum + item.quantityOrdered, 0)
                      .toFixed(2)}
                  </span>
                </div>
                <div className='border-t pt-2'>
                  <div className='flex justify-between font-semibold'>
                    <span>Total Amount:</span>
                    <span>${getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className='space-y-2 pt-4 border-t'>
                <Button
                  className='w-full'
                  onClick={() => saveOrder(false)}
                  disabled={updateOrderMutation.isPending || orderItems.length === 0}
                >
                  <Save className='size-4 mr-2' />
                  {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                  className='w-full'
                  variant='outline'
                  onClick={() => saveOrder(true)}
                  disabled={updateOrderMutation.isPending || orderItems.length === 0}
                >
                  <Send className='size-4 mr-2' />
                  {updateOrderMutation.isPending ? 'Saving...' : 'Save & Send Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}