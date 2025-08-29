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
} from '@/components/ui/dialog'
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
import { ordersApi, type CreateOrderRequest } from '@/lib/api/orders'
import {
  Building2,
  Calculator,
  Package,
  Plus,
  Save,
  Send,
  ShoppingCart,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  productId: string
  product?: Product
  supplierId: string
  supplierName: string
  quantityOrdered: number
  unitCost: number
  totalCost: number
  orderingUnit?: 'UNIT' | 'CASE'
  minimumOrder?: number
}

export default function NewOrderPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Order form state
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [splitMode, setSplitMode] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      // Load suppliers, products, and product-supplier relationships in parallel
      const [inventoryResponse, productSuppliers] = await Promise.all([
        inventoryApi.getInventoryLevels(),
        (async () => {
          const { suppliersApi } = await import('@/lib/api/suppliers')
          return suppliersApi.getProductSuppliers()
        })(),
      ])

      // Extract unique products from inventory with supplier info
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
          return acc
        },
        []
      )
      setProducts(uniqueProducts)
    } catch (error) {
      console.error('Failed to load initial data:', error)
      toast.error('Failed to load suppliers and products')
    } finally {
      setLoading(false)
    }
  }

  const addOrderItem = () => {
    const selectedProduct = products.find((p) => p.id === selectedProductId)
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }

    if (!selectedProduct.suppliers || selectedProduct.suppliers.length === 0) {
      toast.error('No suppliers configured for this product')
      return
    }

    // If only one supplier, add directly
    if (selectedProduct.suppliers.length === 1) {
      const supplier = selectedProduct.suppliers[0]!
      // Use the appropriate cost based on ordering unit preference
      const unitCost =
        supplier.orderingUnit === 'CASE' && supplier.costPerCase
          ? supplier.costPerCase
          : supplier.costPerUnit

      const newItem: OrderItem = {
        productId: selectedProduct.id,
        product: selectedProduct,
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        quantityOrdered: supplier.minimumOrder || 1,
        unitCost: unitCost,
        totalCost: (supplier.minimumOrder || 1) * unitCost,
        orderingUnit: supplier.orderingUnit,
        minimumOrder: supplier.minimumOrder,
      }

      setOrderItems([...orderItems, newItem])
      setSelectedProductId('')
      return
    }

    // Multiple suppliers - show selection mode
    setSplitMode(true)
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

    // If ordering unit changed, update the unit cost based on the new unit
    if (field === 'orderingUnit') {
      const product = products.find((p) => p.id === currentItem.productId)
      const supplier = product?.suppliers?.find(
        (s) => s.supplierId === currentItem.supplierId
      )

      if (supplier) {
        const newUnitCost =
          value === 'CASE' && supplier.costPerCase
            ? supplier.costPerCase
            : supplier.costPerUnit
        updatedItems[index].unitCost = newUnitCost
      }
    }

    // Always recalculate total cost
    updatedItems[index].totalCost =
      updatedItems[index].quantityOrdered * updatedItems[index].unitCost

    setOrderItems(updatedItems)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const addSupplierToOrder = (productId: string, supplierId: string) => {
    const selectedProduct = products.find((p) => p.id === productId)
    const supplier = selectedProduct?.suppliers?.find(
      (s) => s.supplierId === supplierId
    )

    if (!selectedProduct || !supplier) {
      toast.error('Invalid product or supplier selection')
      return
    }

    // Use the appropriate cost based on ordering unit preference
    const unitCost =
      supplier.orderingUnit === 'CASE' && supplier.costPerCase
        ? supplier.costPerCase
        : supplier.costPerUnit

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      product: selectedProduct,
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      quantityOrdered: supplier.minimumOrder || 1,
      unitCost: unitCost,
      totalCost: (supplier.minimumOrder || 1) * unitCost,
      orderingUnit: supplier.orderingUnit,
      minimumOrder: supplier.minimumOrder,
    }

    setOrderItems([...orderItems, newItem])
  }

  const getOrdersBySupplier = () => {
    const ordersBySupplier = new Map<string, OrderItem[]>()

    orderItems.forEach((item) => {
      const supplierId = item.supplierId
      if (!ordersBySupplier.has(supplierId)) {
        ordersBySupplier.set(supplierId, [])
      }
      ordersBySupplier.get(supplierId)!.push(item)
    })

    return ordersBySupplier
  }

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.totalCost, 0)
  }

  const saveOrders = async (sendOrder = false) => {
    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order')
      return
    }

    try {
      setSaving(true)
      const ordersBySupplier = getOrdersBySupplier()
      const createdOrders = []

      // Create separate orders for each supplier
      for (const [supplierId, items] of ordersBySupplier) {
        const orderData: CreateOrderRequest = {
          supplierId,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            orderingUnit: item.orderingUnit,
          })),
        }

        const response = await ordersApi.createOrder(orderData)
        createdOrders.push(response.data)

        if (sendOrder) {
          // Send the order immediately
          await ordersApi.sendOrder(response.data.id)
        }
      }

      const action = sendOrder ? 'created and sent' : 'saved as draft'
      if (createdOrders.length === 1) {
        toast.success(`Order ${action} successfully!`)
      } else {
        toast.success(`${createdOrders.length} orders ${action} successfully!`)
      }

      router.push('/dashboard/orders')
    } catch (error) {
      console.error('Failed to save orders:', error)
      toast.error('Failed to save orders')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Package className='h-12 w-12 mx-auto mb-4 text-gray-300 animate-pulse' />
          <p className='text-muted-foreground'>Loading order form...</p>
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
            Create New Order
          </h1>
          <p className='text-muted-foreground'>
            Create a new supplier order for inventory replenishment
          </p>
        </div>
        <Button variant='outline' asChild>
          <Link href='/dashboard/orders'>Cancel</Link>
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
                Basic information about this order
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Show order splitting notice if multiple suppliers */}
              {getOrdersBySupplier().size > 1 && (
                <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <div className='flex items-center gap-2 text-blue-800'>
                    <Users className='size-4' />
                    <span className='font-medium'>Order Splitting Active</span>
                  </div>
                  <p className='text-sm text-blue-700 mt-1'>
                    Items will be split into {getOrdersBySupplier().size}{' '}
                    separate orders based on suppliers
                  </p>
                </div>
              )}

              <div className='grid gap-4 sm:grid-cols-2'>
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
              <CardDescription>Add products to this order</CardDescription>
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
                    {products.map((product) => (
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
                  <ShoppingCart className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <h3 className='text-lg font-medium mb-2'>No items added</h3>
                  <p className='text-sm'>Add products to create your order</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity & Unit</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={`${item.productId}-${item.supplierId}`}>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {item.product?.name}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {item.product?.sku &&
                                `SKU: ${item.product.sku} • `}
                              {item.product?.category.name}
                              {item.orderingUnit && (
                                <Badge variant='outline' className='ml-2'>
                                  Order by {item.orderingUnit}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Building2 className='size-4 text-muted-foreground' />
                            <span className='font-medium'>
                              {item.supplierName}
                            </span>
                          </div>
                          {item.minimumOrder && (
                            <div className='text-xs text-muted-foreground mt-1'>
                              Min: {item.minimumOrder}{' '}
                              {item.orderingUnit?.toLowerCase()}
                            </div>
                          )}
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
                              value={item.orderingUnit || 'UNIT'}
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
                  onClick={() => saveOrders(false)}
                  disabled={saving || orderItems.length === 0}
                >
                  <Save className='size-4 mr-2' />
                  {saving
                    ? 'Saving...'
                    : getOrdersBySupplier().size > 1
                      ? 'Save Orders as Draft'
                      : 'Save as Draft'}
                </Button>

                <Button
                  className='w-full'
                  variant='outline'
                  onClick={() => saveOrders(true)}
                  disabled={saving || orderItems.length === 0}
                >
                  <Send className='size-4 mr-2' />
                  {saving
                    ? 'Saving...'
                    : getOrdersBySupplier().size > 1
                      ? 'Save & Send Orders'
                      : 'Save & Send Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Supplier Selection Dialog */}
      <Dialog open={splitMode} onOpenChange={setSplitMode}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Select Supplier</DialogTitle>
            <DialogDescription>
              This product is available from multiple suppliers. Choose which
              suppliers to add to your order.
            </DialogDescription>
          </DialogHeader>

          {selectedProductId && (
            <div className='space-y-4'>
              {/* Product Info */}
              <div className='p-3 bg-gray-50 rounded-lg'>
                <div className='font-medium'>
                  {products.find((p) => p.id === selectedProductId)?.name}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {
                    products.find((p) => p.id === selectedProductId)?.category
                      .name
                  }
                </div>
              </div>

              {/* Available Suppliers */}
              <div className='space-y-3'>
                <h4 className='font-medium'>Available Suppliers:</h4>
                {products
                  .find((p) => p.id === selectedProductId)
                  ?.suppliers?.map((supplier) => (
                    <div
                      key={supplier.supplierId}
                      className='border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <Building2 className='size-4 text-muted-foreground' />
                            <span className='font-medium'>
                              {supplier.supplierName}
                            </span>
                            {supplier.isPreferred && (
                              <Badge variant='secondary'>Preferred</Badge>
                            )}
                          </div>
                          <div className='grid gap-1 mt-2 text-sm text-muted-foreground'>
                            <div>
                              Price: ${supplier.costPerUnit.toFixed(2)}/
                              {supplier.orderingUnit.toLowerCase()}
                            </div>
                            <div>
                              Min Order: {supplier.minimumOrder}{' '}
                              {supplier.minimumOrderUnit ||
                                supplier.orderingUnit}
                            </div>
                            <div>Lead Time: {supplier.leadTimeDays} days</div>
                            {supplier.supplierSku && (
                              <div>Supplier SKU: {supplier.supplierSku}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            addSupplierToOrder(
                              selectedProductId,
                              supplier.supplierId
                            )
                            setSplitMode(false)
                            setSelectedProductId('')
                          }}
                          disabled={orderItems.some(
                            (item) =>
                              item.productId === selectedProductId &&
                              item.supplierId === supplier.supplierId
                          )}
                        >
                          {orderItems.some(
                            (item) =>
                              item.productId === selectedProductId &&
                              item.supplierId === supplier.supplierId
                          )
                            ? 'Already Added'
                            : 'Add to Order'}
                        </Button>
                      </div>
                    </div>
                  )) || []}
              </div>

              {/* Add All Button */}
              <div className='flex gap-2 pt-4 border-t'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setSplitMode(false)
                    setSelectedProductId('')
                  }}
                  className='flex-1'
                >
                  <X className='size-4 mr-2' />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const product = products.find(
                      (p) => p.id === selectedProductId
                    )
                    product?.suppliers?.forEach((supplier) => {
                      const alreadyAdded = orderItems.some(
                        (item) =>
                          item.productId === selectedProductId &&
                          item.supplierId === supplier.supplierId
                      )
                      if (!alreadyAdded) {
                        addSupplierToOrder(
                          selectedProductId,
                          supplier.supplierId
                        )
                      }
                    })
                    setSplitMode(false)
                    setSelectedProductId('')
                  }}
                  className='flex-1'
                >
                  <Plus className='size-4 mr-2' />
                  Add All Suppliers
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
