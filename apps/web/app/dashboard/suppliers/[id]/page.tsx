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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { inventoryApi } from '@/lib/api/inventory'
import {
  suppliersApi,
  type ProductSupplier,
  type Supplier,
} from '@/lib/api/suppliers'
import {
  ArrowLeft,
  Building2,
  Clock,
  Edit,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Save,
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
  caseSize: number
  costPerUnit: number
  costPerCase?: number
  container: string | null
  category: {
    id: string
    name: string
  }
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SupplierDetailPage() {
  const prms = useParams()
  const supplierId = prms.id as string
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductSupplier | null>(
    null
  )

  // Add/Edit product form state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [supplierSku, setSupplierSku] = useState('')
  const [orderingUnit, setOrderingUnit] = useState<'UNIT' | 'CASE'>('UNIT')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [costPerCase, setCostPerCase] = useState('')
  const [minimumOrder, setMinimumOrder] = useState('1')
  const [minimumOrderUnit, setMinimumOrderUnit] = useState<'UNIT' | 'CASE'>(
    'UNIT'
  )
  const [packSize, setPackSize] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('3')
  const [isPreferred, setIsPreferred] = useState(false)

  useEffect(() => {
    loadSupplier()
    loadProducts()
  }, [supplierId])

  const loadSupplier = async () => {
    try {
      setLoading(true)
      const supplier = await suppliersApi.getSupplier(supplierId)
      setSupplier(supplier)
    } catch (error) {
      console.error('Failed to load supplier:', error)
      toast.error('Failed to load supplier')
      router.push('/dashboard/suppliers')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const inventory = await inventoryApi.getInventoryLevels()
      const uniqueProducts = inventory.reduce((acc: Product[], item) => {
        const existingProduct = acc.find((p) => p.id === item.product.id)
        if (!existingProduct) {
          acc.push({
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku ?? undefined,
            caseSize: item.product.caseSize || 1,
            costPerUnit: item.product.costPerUnit,
            costPerCase: item.product.costPerCase ?? undefined,
            container: item.product.container || 'unit',
            category: item.product.category,
          })
        }
        return acc
      }, [])
      setAllProducts(uniqueProducts)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  const handleAddProduct = async () => {
    if (!selectedProductId || !costPerUnit) {
      toast.error('Please select a product and enter pricing')
      return
    }

    try {
      await suppliersApi.addProductToSupplier(supplierId, {
        productId: selectedProductId,
        supplierSku,
        orderingUnit,
        costPerUnit: parseFloat(costPerUnit),
        costPerCase: costPerCase ? parseFloat(costPerCase) : undefined,
        minimumOrder: parseInt(minimumOrder),
        minimumOrderUnit,
        packSize: packSize ? parseInt(packSize) : undefined,
        leadTimeDays: parseInt(leadTimeDays),
        isPreferred,
      })

      toast.success('Product added to supplier catalog')
      loadSupplier()
      resetForm()
      setShowAddProduct(false)
    } catch (error) {
      toast.error(
        (error as unknown as Error).message || 'Failed to add product'
      )
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    try {
      await suppliersApi.updateProductSupplier(
        supplierId,
        editingProduct.productId,
        {
          supplierSku,
          orderingUnit,
          costPerUnit: parseFloat(costPerUnit),
          costPerCase: costPerCase ? parseFloat(costPerCase) : undefined,
          minimumOrder: parseInt(minimumOrder),
          minimumOrderUnit,
          packSize: packSize ? parseInt(packSize) : undefined,
          leadTimeDays: parseInt(leadTimeDays),
          isPreferred,
        }
      )

      toast.success('Product updated')
      loadSupplier()
      setEditingProduct(null)
      resetForm()
    } catch (error) {
      toast.error(
        (error as unknown as Error).message || 'Failed to update product'
      )
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Remove this product from the supplier catalog?')) return

    try {
      await suppliersApi.removeProductFromSupplier(supplierId, productId)
      toast.success('Product removed from catalog')
      loadSupplier()
    } catch (error) {
      toast.error(
        (error as unknown as Error).message || 'Failed to remove product'
      )
    }
  }

  const resetForm = () => {
    setSelectedProductId('')
    setSupplierSku('')
    setOrderingUnit('UNIT')
    setCostPerUnit('')
    setCostPerCase('')
    setMinimumOrder('1')
    setMinimumOrderUnit('UNIT')
    setPackSize('')
    setLeadTimeDays('3')
    setIsPreferred(false)
  }

  const startEditProduct = (productSupplier: ProductSupplier) => {
    setEditingProduct(productSupplier)
    setSelectedProductId(productSupplier.productId)
    setSupplierSku(productSupplier.supplierSku || '')
    setOrderingUnit(productSupplier.orderingUnit)
    setCostPerUnit(productSupplier.costPerUnit.toString())
    setCostPerCase(productSupplier.costPerCase?.toString() || '')
    setMinimumOrder(productSupplier.minimumOrder.toString())
    setMinimumOrderUnit(productSupplier.minimumOrderUnit || 'UNIT')
    setPackSize(productSupplier.packSize?.toString() || '')
    setLeadTimeDays(productSupplier.leadTimeDays.toString())
    setIsPreferred(productSupplier.isPreferred)
  }

  const formatSchedule = (
    days: number[],
    timeStart?: string,
    timeEnd?: string
  ) => {
    if (days.length === 0) return 'Not specified'
    const dayNames = days.map((day) => DAYS_OF_WEEK[day]).join(', ')
    const timeWindow =
      timeStart && timeEnd ? ` (${timeStart} - ${timeEnd})` : ''
    return dayNames + timeWindow
  }

  useEffect(() => {
    if (selectedProductId) {
      const prod = allProducts.find((p) => p.id === selectedProductId)
      if (prod?.costPerCase) {
        setCostPerCase(prod.costPerCase.toString())
        setCostPerUnit(prod.costPerUnit.toString())
      }
    }
  }, [selectedProductId])

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='h-8 w-8 animate-spin mr-2' />
        <span>Loading supplier...</span>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Building2 className='h-12 w-12 mx-auto mb-4 text-gray-300' />
          <h3 className='text-lg font-medium mb-2'>Supplier not found</h3>
          <Button asChild>
            <Link href='/dashboard/suppliers'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back to Suppliers
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const availableProducts = allProducts.filter(
    (product) => !supplier.products?.some((sp) => sp.productId === product.id)
  )

  const selectedProduct = editingProduct
    ? editingProduct.product
    : allProducts.find((p) => p.id === selectedProductId)

  const primaryContact = supplier.contacts?.find((c) => c.isPrimary)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' asChild>
            <Link href='/dashboard/suppliers'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              {supplier.name}
            </h1>
            <p className='text-muted-foreground'>
              Supplier details and product catalog
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge
            variant={supplier.isActive ? 'default' : 'secondary'}
            className={supplier.isActive ? 'bg-green-100 text-green-800' : ''}
          >
            {supplier.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button asChild>
            <Link href={`/dashboard/suppliers/${supplier.id}/edit`}>
              <Edit className='h-4 w-4 mr-2' />
              Edit Supplier
            </Link>
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Supplier Info */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='h-5 w-5' />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {primaryContact ? (
                <div className='flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{primaryContact.email}</span>
                </div>
              ) : null}
              {primaryContact ? (
                <div className='flex items-center gap-2'>
                  <Phone className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{primaryContact.phone}</span>
                </div>
              ) : null}
              {supplier.address ? (
                <div className='flex items-start gap-2'>
                  <MapPin className='h-4 w-4 text-muted-foreground mt-0.5' />
                  <span className='text-sm'>{supplier.address}</span>
                </div>
              ) : null}
              {supplier.terms ? (
                <div className='pt-2 border-t'>
                  <p className='text-sm font-medium mb-1'>Terms</p>
                  <p className='text-sm text-muted-foreground'>
                    {supplier.terms}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Order Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <p className='text-sm font-medium mb-1'>Order Cutoff</p>
                <p className='text-sm text-muted-foreground'>
                  {supplier.orderCutoffDays.length > 0
                    ? `${supplier.orderCutoffDays.map((d) => DAYS_OF_WEEK[d]).join(', ')}${
                        supplier.orderCutoffTime
                          ? ` at ${supplier.orderCutoffTime}`
                          : ''
                      }`
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className='text-sm font-medium mb-1'>Delivery Days</p>
                <p className='text-sm text-muted-foreground'>
                  {formatSchedule(
                    supplier.deliveryDays,
                    supplier.deliveryTimeStart,
                    supplier.deliveryTimeEnd
                  )}
                </p>
              </div>
              {supplier.minimumOrderValue ? (
                <div>
                  <p className='text-sm font-medium mb-1'>Minimum Order</p>
                  <p className='text-sm text-muted-foreground'>
                    ${supplier.minimumOrderValue.toFixed(2)}
                  </p>
                </div>
              ) : null}
              {supplier.deliveryFee && supplier.deliveryFee > 0 ? (
                <div>
                  <p className='text-sm font-medium mb-1'>Delivery Fee</p>
                  <p className='text-sm text-muted-foreground'>
                    ${supplier.deliveryFee.toFixed(2)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='h-5 w-5' />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-sm'>Products:</span>
                <span className='font-medium'>{supplier._count?.products}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm'>Total Orders:</span>
                <span className='font-medium'>{supplier._count?.orders}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Catalog */}
        <div className='lg:col-span-2'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Product Catalog</CardTitle>
                  <CardDescription>
                    Products available from this supplier with ordering
                    preferences
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {supplier.products?.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <h3 className='text-lg font-medium mb-2'>No products yet</h3>
                  <p className='text-sm mb-4'>
                    Add products to this supplier&apos;s catalog to enable
                    ordering
                  </p>
                  <Button onClick={() => setShowAddProduct(true)}>
                    <Plus className='h-4 w-4 mr-2' />
                    Add First Product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier SKU</TableHead>
                      <TableHead>Order By</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Min Order</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.products?.map((productSupplier) => (
                      <TableRow key={productSupplier.id}>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {productSupplier.product?.name}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {productSupplier.product?.sku &&
                                `SKU: ${productSupplier.product?.sku} • `}
                              {productSupplier.product?.category?.name}
                              {productSupplier.isPreferred && (
                                <Badge variant='secondary' className='ml-2'>
                                  Preferred
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {productSupplier.supplierSku || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>
                            {productSupplier.orderingUnit}
                          </Badge>
                          {productSupplier.packSize && (
                            <div className='text-xs text-muted-foreground mt-1'>
                              {productSupplier.packSize} units/pack
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              ${productSupplier.costPerUnit.toFixed(2)}/
                              {productSupplier.orderingUnit.toLowerCase()}
                            </div>
                            {productSupplier.costPerCase && (
                              <div className='text-sm text-muted-foreground'>
                                ${productSupplier.costPerCase.toFixed(2)}/case
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {productSupplier.minimumOrder}{' '}
                          {productSupplier.minimumOrderUnit ||
                            productSupplier.orderingUnit}
                        </TableCell>
                        <TableCell>
                          {productSupplier.leadTimeDays} day
                          {productSupplier.leadTimeDays !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => startEditProduct(productSupplier)}
                            >
                              <Edit className='h-4 w-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() =>
                                handleRemoveProduct(productSupplier.productId)
                              }
                            >
                              <Trash2 className='h-4 w-4' />
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
        </div>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog
        open={showAddProduct || !!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddProduct(false)
            setEditingProduct(null)
            resetForm()
          }
        }}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? 'Edit Product Settings'
                : 'Add Product to Catalog'}
            </DialogTitle>
            <DialogDescription>
              Configure ordering preferences for this product from{' '}
              {supplier.name}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Product Selection */}
            {!editingProduct && (
              <div>
                <Label>Product</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select a product' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
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
              </div>
            )}

            {/* Show case size info if product selected */}
            {selectedProduct && selectedProduct.caseSize > 1 && (
              <div className='p-3 bg-blue-50 rounded-lg text-sm'>
                <p className='font-medium text-blue-900'>
                  Product Information:
                </p>
                <p className='text-blue-700'>
                  Case size: {selectedProduct.caseSize}{' '}
                  {selectedProduct.container}s per case
                </p>
                {selectedProduct.costPerCase && (
                  <p className='text-blue-700'>
                    Standard case cost: $
                    {selectedProduct.costPerCase.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className='grid gap-4 sm:grid-cols-2'>
              {/* Supplier SKU */}
              <div>
                <Label>Supplier SKU (Optional)</Label>
                <Input
                  value={supplierSku}
                  onChange={(e) => setSupplierSku(e.target.value)}
                  placeholder={'Supplier&apos;s product code'}
                />
              </div>

              {/* Ordering Unit */}
              <div>
                <Label>Order By</Label>
                <Select
                  value={orderingUnit}
                  onValueChange={(value) =>
                    setOrderingUnit(value as 'UNIT' | 'CASE')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='UNIT'>Individual Unit</SelectItem>
                    {selectedProduct && selectedProduct.caseSize > 1 ? (
                      <SelectItem value='CASE'>
                        Case ({selectedProduct.caseSize} units)
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Per Unit */}
              <div>
                <Label>
                  Cost per {orderingUnit === 'CASE' ? 'Case' : 'Unit'}
                </Label>
                <Input
                  type='number'
                  step='0.01'
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder='0.00'
                />
              </div>

              {/* Cost Per Case (if ordering by unit) */}
              {orderingUnit === 'UNIT' &&
              selectedProduct &&
              selectedProduct.caseSize > 1 ? (
                <div>
                  <Label>Cost per Case (Optional)</Label>
                  <Input
                    type='number'
                    step='0.01'
                    value={costPerCase}
                    onChange={(e) => setCostPerCase(e.target.value)}
                    placeholder='0.00'
                  />
                </div>
              ) : null}

              {/* Minimum Order */}
              <div>
                <Label>Minimum Order Quantity</Label>
                <div className='flex gap-2'>
                  <Input
                    type='number'
                    min='1'
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    placeholder='1'
                    className='flex-1'
                  />
                  <Select
                    value={minimumOrderUnit}
                    onValueChange={(value) =>
                      setMinimumOrderUnit(value as 'UNIT' | 'CASE')
                    }
                  >
                    <SelectTrigger className='w-24'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='UNIT'>Units</SelectItem>
                      {selectedProduct && selectedProduct.caseSize > 1 && (
                        <SelectItem value='CASE'>Cases</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pack Size */}
              {orderingUnit === 'UNIT' ? (
                <div>
                  <Label>Pack Size (Optional)</Label>
                  <Input
                    type='number'
                    min='1'
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder='Units per pack'
                  />
                </div>
              ) : null}

              {/* Lead Time */}
              <div>
                <Label>Lead Time (Days)</Label>
                <Input
                  type='number'
                  min='0'
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder='3'
                />
              </div>
            </div>

            {/* Preferred Supplier */}
            <div className='flex items-center space-x-2'>
              <Switch
                id='preferred'
                checked={isPreferred}
                onCheckedChange={setIsPreferred}
              />
              <Label htmlFor='preferred'>
                Mark as preferred supplier for this product
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowAddProduct(false)
                setEditingProduct(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
            >
              <Save className='h-4 w-4 mr-2' />
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
