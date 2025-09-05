'use client'

import CatalogSearch from '@/components/dashboard/Products/CatalogSearch'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { categoriesApi } from '@/lib/api/categories'
import { inventoryApi } from '@/lib/api/inventory'
import { suppliersApi, type Supplier } from '@/lib/api/suppliers'
import { useProducts, useUpdateProduct } from '@/lib/queries'
import type {
  CatalogProduct,
  InventoryProduct,
  ProductContainer,
  ProductUnit,
} from '@happy-bar/types'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Plus,
  Save,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface ProductSupplier {
  id: string
  supplierId: string
  supplierName: string
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  minimumOrderUnit?: 'UNIT' | 'CASE'
  packSize?: number
  orderingUnit: 'UNIT' | 'CASE'
  isPreferred: boolean
}

export default function EditProductPage() {
  const { showError } = useAlertDialog()
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const { isStale: _ } = useProducts()
  const { mutateAsync: updateProduct } = useUpdateProduct()

  const [product, setProduct] = useState<InventoryProduct | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    upc: '',
    categoryId: '',
    unit: '',
    container: '',
    unitSize: 1,
    caseSize: 1,
    costPerUnit: 0,
    costPerCase: 0,
    sellPrice: 0,
    alcoholContent: 0,
    image: '',
    // supplierId: '',
  })

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [productData, categoriesData, suppliersData, productSuppliersData] =
        await Promise.all([
          inventoryApi.getProduct(productId),
          categoriesApi.getCategories(),
          suppliersApi.getSuppliers({ active: true, excludeProducts: true }),
          suppliersApi.getProductSuppliers({ productId }),
        ])

      setProduct(productData)
      setCategories(categoriesData)
      setSuppliers(suppliersData)
      setFormData({
        name: productData.name,
        sku: productData.sku || '',
        upc: productData.upc || '',
        categoryId: productData.categoryId,
        unit: productData.unit,
        container: productData.container || '',
        unitSize: productData.unitSize,
        caseSize: productData.caseSize,
        costPerUnit: productData.costPerUnit,
        costPerCase: productData.costPerCase || 0,
        sellPrice: productData.sellPrice || 0,
        alcoholContent: productData.alcoholContent || 0,
        image: productData.image || '',
      })

      const currentSuppliers = productSuppliersData.map((ps) => ({
        id: ps.id,
        supplierId: ps.supplierId,
        supplierName: ps.supplier?.name || 'Unknown',
        costPerUnit: ps.costPerUnit,
        costPerCase: ps.costPerCase,
        minimumOrder: ps.minimumOrder,
        minimumOrderUnit: ps.minimumOrderUnit,
        packSize: ps.packSize,
        orderingUnit: ps.orderingUnit,
        isPreferred: ps.isPreferred,
      }))
      setProductSuppliers(currentSuppliers)
    } catch (error) {
      console.warn('Failed to fetch initial data:', error)
      toast.error('Failed to load product data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) {
      fetchInitialData()
    }
  }, [productId])

  const handleCatalogSelect = (catalogProduct: CatalogProduct) => {
    // Auto-fill form with catalog product data
    setFormData((prev) => ({
      ...prev,
      name: catalogProduct.name,
      upc: catalogProduct.upc || prev.upc,
      categoryId: catalogProduct.categoryId || prev.categoryId,
      unit: catalogProduct.unit || prev.unit,
      container: catalogProduct.container || prev.container,
      unitSize: catalogProduct.unitSize || prev.unitSize,
      caseSize: catalogProduct.caseSize || prev.caseSize,
      costPerUnit: catalogProduct.costPerUnit || prev.costPerUnit,
      costPerCase: catalogProduct.costPerCase || prev.costPerCase,
      image: catalogProduct.image || prev.image,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)

      const data = {
        ...formData,
        unit: (formData.unit as ProductUnit) || undefined,
        container: (formData.container as ProductContainer) || undefined,
        costPerUnit: formData.costPerUnit || undefined,
        costPerCase: formData.costPerCase || undefined,
        sellPrice: formData.sellPrice || undefined,
        alcoholContent: formData.alcoholContent || undefined,
        // supplierId: formData.supplierId || undefined,
        sku: formData.sku || undefined,
        upc: formData.upc || undefined,
      }

      // await inventoryApi.updateProduct(productId, data)
      await updateProduct({
        id: productId,
        data,
      })
      toast.success('Product updated successfully')
      router.push('/dashboard/products')
    } catch (error) {
      console.warn('Failed to update product:', error)
      showError('Failed to update product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const addSupplierToProduct = async () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier')
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) return

    if (productSuppliers.some((ps) => ps.supplierId === selectedSupplierId)) {
      toast.error('Supplier already added to this product')
      return
    }

    try {
      const responseData = await suppliersApi.addProductToSupplier(
        selectedSupplierId,
        {
          productId,
          orderingUnit: 'UNIT',
          costPerUnit: formData.costPerUnit,
          costPerCase: formData.costPerCase || undefined,
          packSize: formData.caseSize || undefined,
          minimumOrder: 1,
          isPreferred: productSuppliers.length === 0,
        }
      )

      const newProductSupplier: ProductSupplier = {
        id: responseData.id,
        supplierId: selectedSupplierId,
        supplierName: supplier.name,
        costPerUnit: formData.costPerUnit,
        costPerCase: formData.costPerCase || undefined,
        packSize: formData.caseSize || undefined,
        minimumOrder: 1,
        orderingUnit: 'UNIT',
        isPreferred: productSuppliers.length === 0,
      }

      setProductSuppliers([...productSuppliers, newProductSupplier])
      setSelectedSupplierId('')
      setShowSupplierForm(false)
      toast.success(`Added ${supplier.name} as supplier`)
    } catch (error) {
      console.warn('Failed to add supplier:', error)
      toast.error((error as Error).message || 'Failed to add supplier')
    }
  }

  const removeSupplierFromProduct = async (productSupplierId: string) => {
    try {
      const productSupplier = productSuppliers.find(
        (ps) => ps.id === productSupplierId
      )
      if (!productSupplier) return

      await suppliersApi.removeProductFromSupplier(
        productSupplier.supplierId,
        productId
      )
      setProductSuppliers(
        productSuppliers.filter((ps) => ps.id !== productSupplierId)
      )
      toast.success('Supplier removed from product')
    } catch (error) {
      console.warn('Failed to remove supplier:', error)
      toast.error((error as Error).message || 'Failed to remove supplier')
    }
  }

  const updateProductSupplier = async (
    productSupplierId: string,
    field: keyof ProductSupplier,
    value: unknown
  ) => {
    try {
      const productSupplier = productSuppliers.find(
        (ps) => ps.id === productSupplierId
      )
      if (!productSupplier) return

      const updatedData = { [field]: value }
      await suppliersApi.updateProductSupplier(
        productSupplier.supplierId,
        productId,
        updatedData
      )

      setProductSuppliers(
        productSuppliers.map((ps) =>
          ps.id === productSupplierId ? { ...ps, [field]: value } : ps
        )
      )
    } catch (error) {
      console.warn('Failed to update supplier:', error)
      toast.error((error as Error).message || 'Failed to update supplier')
    }
  }

  const units = [
    'ml',
    'L',
    'fl oz',
    'gal',
    'g',
    'kg',
    'lb',
    'count',
    'cl',
    'oz',
  ]

  const containers = [
    'can',
    'bottle',
    'keg',
    'box',
    'bag',
    'carton',
    'unit',
    'firkin',
    'cask',
    'growler',
    'mini keg',
    'pouch',
    'jar',
    'beer ball',
    'reserved',
    'decanter',
    'cartridge',
    'fiasco',
    'bucket',
    'glass',
  ]

  const isMapped = !!product?.mappings?.length
  const isPOSLinked = isMapped

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p>Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertTriangle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>Product not found</h2>
          <p className='text-muted-foreground mb-4'>
            The product you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href='/dashboard/products'>Back to Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/dashboard/products'>
            <ArrowLeft className='size-4 mr-2' />
            Back to Products
          </Link>
        </Button>
        <div className='flex-1'>
          <h1 className='text-3xl font-bold tracking-tight'>Edit Product</h1>
          <p className='text-muted-foreground'>
            Update product information and pricing
          </p>
        </div>
        {isPOSLinked && <Badge variant='secondary'>POS Linked</Badge>}
      </div>

      {/* POS Warning */}
      {isPOSLinked && (
        <Card className='border-yellow-200 bg-yellow-50'>
          <CardContent className='py-0'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='size-5 text-yellow-600 mt-0.5' />
              <div>
                <h3 className='font-medium text-yellow-800'>
                  POS-Linked Product
                </h3>
                <p className='text-sm text-yellow-700 mt-0.5'>
                  This product is linked to your POS system. Sell price will be
                  automatically synced from POS and cannot be edited manually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catalog Search */}
      <Card>
        <CardContent className='pt-6'>
          <div className='space-y-2'>
            <Label>Update from Product Catalog</Label>
            <CatalogSearch
              onSelect={handleCatalogSelect}
              placeholder='Search catalog to update product details...'
              className='w-full'
            />
            <p className='text-xs text-muted-foreground'>
              Search the product catalog to update this product&apos;s details
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                General product details and identification
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div
                className={`flex gap-4 ${formData.image ? 'items-end' : ''}`}
              >
                {/* Product Image Display - Left Side */}
                {formData.image && (
                  <div className='relative w-24 h-34 overflow-hidden'>
                    <Image
                      src={formData.image}
                      alt={formData.name || 'Product image'}
                      fill
                      className='object-contain'
                      sizes='128px'
                      onError={(_e) => {
                        console.warn(
                          `Failed to load product image: ${formData.image}`
                        )
                      }}
                    />
                  </div>
                )}

                {/* Form Fields - Right Side */}
                <div className='flex-1 space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Product Name *</Label>
                    <Input
                      id='name'
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange('name', e.target.value)
                      }
                      placeholder='e.g., Budweiser Beer'
                      required
                    />
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='sku'>SKU</Label>
                      <Input
                        id='sku'
                        value={formData.sku}
                        onChange={(e) =>
                          handleInputChange('sku', e.target.value)
                        }
                        placeholder='e.g., BUD-001'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='upc'>UPC/Barcode</Label>
                      <Input
                        id='upc'
                        value={formData.upc}
                        onChange={(e) =>
                          handleInputChange('upc', e.target.value)
                        }
                        placeholder='e.g., 123456789012'
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='space-y-2 flex-1'>
                  <Label htmlFor='image'>Image URL</Label>
                  <Input
                    id='image'
                    value={formData.image}
                    onChange={(e) => handleInputChange('image', e.target.value)}
                    placeholder='https://example.com/product-image.jpg'
                    type='url'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Optional: URL to product image
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='category'>Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      handleInputChange('categoryId', value)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a category' />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit & Packaging */}
          <Card>
            <CardHeader>
              <CardTitle>Unit & Packaging</CardTitle>
              <CardDescription>
                How the product is measured and packaged
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='unit'>Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleInputChange('unit', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select unit' />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='container'>Container</Label>
                  <Select
                    value={formData.container}
                    onValueChange={(value) =>
                      handleInputChange('container', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select container' />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map((container) => (
                        <SelectItem key={container} value={container}>
                          {container}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='unitSize'>Unit Size</Label>
                  <Input
                    id='unitSize'
                    type='number'
                    step='0.01'
                    min='0.01'
                    value={formData.unitSize}
                    onChange={(e) =>
                      handleInputChange(
                        'unitSize',
                        parseFloat(e.target.value) || 1
                      )
                    }
                    placeholder='1'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='caseSize'>Case Size</Label>
                  <Input
                    id='caseSize'
                    type='number'
                    min='1'
                    value={formData.caseSize}
                    onChange={(e) =>
                      handleInputChange(
                        'caseSize',
                        parseInt(e.target.value) || 1
                      )
                    }
                    placeholder='24'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='alcoholContent'>Alcohol Content (%)</Label>
                <Input
                  id='alcoholContent'
                  type='number'
                  step='0.1'
                  min='0'
                  max='100'
                  value={formData.alcoholContent}
                  onChange={(e) =>
                    handleInputChange(
                      'alcoholContent',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder='5.0'
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Cost and selling price information
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='costPerUnit'>Cost Per Unit *</Label>
                <Input
                  id='costPerUnit'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.costPerUnit}
                  onChange={(e) =>
                    handleInputChange(
                      'costPerUnit',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder='2.50'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='costPerCase'>Cost Per Case</Label>
                <Input
                  id='costPerCase'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.costPerCase}
                  onChange={(e) =>
                    handleInputChange(
                      'costPerCase',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder='60.00'
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  Leave empty to calculate based on unit cost × case size
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='sellPrice'>
                  Sell Price
                  {isPOSLinked && (
                    <Badge variant='outline' className='ml-2 text-xs'>
                      POS Synced
                    </Badge>
                  )}
                </Label>
                <Input
                  id='sellPrice'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.sellPrice}
                  onChange={(e) =>
                    handleInputChange(
                      'sellPrice',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder='5.00'
                  disabled={isPOSLinked}
                />
                {isPOSLinked && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    This price is automatically synced from your POS system
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suppliers */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Suppliers</CardTitle>
                  <CardDescription>
                    Manage suppliers and ordering preferences for this product
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setShowSupplierForm(true)}
                  disabled={suppliers.length === 0}
                >
                  <Plus className='size-4 mr-2' />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {suppliers.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No suppliers available. Create suppliers first to assign them
                  to products.
                </p>
              ) : (
                <>
                  {/* Current Suppliers */}
                  {productSuppliers.length > 0 && (
                    <div className='space-y-3'>
                      {productSuppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className='border rounded-lg p-4 space-y-3'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <Building2 className='size-4' />
                              <span className='font-medium'>
                                {supplier.supplierName}
                              </span>
                              {supplier.isPreferred && (
                                <Badge variant='secondary'>Preferred</Badge>
                              )}
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                removeSupplierFromProduct(supplier.id)
                              }
                            >
                              <X className='size-4' />
                            </Button>
                          </div>

                          <div className='grid grid-cols-2 gap-3'>
                            <div>
                              <Label className='text-xs'>Cost per Unit</Label>
                              <Input
                                type='number'
                                step='0.01'
                                value={supplier.costPerUnit}
                                onChange={(e) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'costPerUnit',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className='h-8'
                              />
                            </div>
                            <div>
                              <Label className='text-xs'>Cost per Case</Label>
                              <Input
                                type='number'
                                step='0.01'
                                value={supplier.costPerCase || ''}
                                onChange={(e) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'costPerCase',
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder='Optional'
                                className='h-8'
                              />
                            </div>
                            <div>
                              <Label className='text-xs'>Min Order</Label>
                              <Input
                                type='number'
                                min='1'
                                value={supplier.minimumOrder}
                                onChange={(e) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'minimumOrder',
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className='h-8'
                              />
                            </div>
                            <div>
                              <Label className='text-xs'>Pack Size</Label>
                              <Input
                                type='number'
                                min='1'
                                value={supplier.packSize || ''}
                                onChange={(e) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'packSize',
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder='Optional'
                                className='h-8'
                              />
                            </div>
                            <div>
                              <Label className='text-xs'>Order By</Label>
                              <Select
                                value={supplier.orderingUnit}
                                onValueChange={(value) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'orderingUnit',
                                    value as 'UNIT' | 'CASE'
                                  )
                                }
                              >
                                <SelectTrigger className='h-8'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='UNIT'>Unit</SelectItem>
                                  <SelectItem value='CASE'>Case</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className='text-xs'>Min Order Unit</Label>
                              <Select
                                value={supplier.minimumOrderUnit || 'UNIT'}
                                onValueChange={(value) =>
                                  updateProductSupplier(
                                    supplier.id,
                                    'minimumOrderUnit',
                                    value as 'UNIT' | 'CASE'
                                  )
                                }
                              >
                                <SelectTrigger className='h-8'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='UNIT'>Unit</SelectItem>
                                  <SelectItem value='CASE'>Case</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className='flex items-center space-x-2'>
                            <Switch
                              id={`preferred-${supplier.id}`}
                              checked={supplier.isPreferred}
                              onCheckedChange={(checked) =>
                                updateProductSupplier(
                                  supplier.id,
                                  'isPreferred',
                                  checked
                                )
                              }
                            />
                            <Label
                              htmlFor={`preferred-${supplier.id}`}
                              className='text-xs'
                            >
                              Preferred supplier
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {productSuppliers.length === 0 && (
                    <div className='text-center py-8 text-muted-foreground'>
                      <Building2 className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                      <h3 className='text-lg font-medium mb-2'>
                        No suppliers assigned
                      </h3>
                      <p className='text-sm'>
                        Add suppliers to enable ordering for this product
                      </p>
                    </div>
                  )}

                  {/* Add Supplier Form */}
                  {showSupplierForm && (
                    <div className='border rounded-lg p-3 space-y-3 bg-gray-50'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-sm font-medium'>
                          Select Supplier
                        </Label>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => setShowSupplierForm(false)}
                        >
                          <X className='size-4' />
                        </Button>
                      </div>
                      <Select
                        value={selectedSupplierId}
                        onValueChange={setSelectedSupplierId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Choose a supplier' />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers
                            .filter(
                              (s) =>
                                !productSuppliers.some(
                                  (ps) => ps.supplierId === s.id
                                )
                            )
                            .map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          onClick={addSupplierToProduct}
                          disabled={!selectedSupplierId}
                        >
                          Add Supplier
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-4 mt-6'>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/products'>Cancel</Link>
          </Button>
          <Button type='submit' disabled={saving}>
            <Save className='size-4 mr-2' />
            {saving ? 'Updating...' : 'Update Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
