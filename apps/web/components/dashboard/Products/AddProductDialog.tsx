'use client'

import { HappyBarLoader } from '@/components/HappyBarLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { inventoryApi } from '@/lib/api/inventory'
import { suppliersApi, type Supplier } from '@/lib/api/suppliers'
import {
  PRODUCT_CONTAINER_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
} from '@/lib/constants/product-options'
import { useCategories } from '@/lib/queries'
import { ProductUnit, type CatalogProduct } from '@happy-bar/types'
import { Building2, Plus, Save, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import CatalogSearch from './CatalogSearch'

interface ProductSupplier {
  supplierId: string
  supplierName: string
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  orderingUnit: 'UNIT' | 'CASE'
  isPreferred: boolean
}

interface AddProductDialogProps {
  onComplete: () => void
}

export default function AddProductDialog({
  onComplete,
}: AddProductDialogProps) {
  const { showError } = useAlertDialog()
  const [open, setOpen] = useState(false)
  const { data: categories } = useCategories()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>(
    []
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    upc: '',
    categoryId: '',
    unit: ProductUnit.ML,
    container: 'bottle',
    unitSize: 750,
    caseSize: 12,
    costPerUnit: 0,
    costPerCase: 0,
    sellPrice: 0,
    alcoholContent: 0,
    image: '',
  })

  useEffect(() => {
    if (open) {
      fetchInitialData()
    }
  }, [open])

  const reset = () => {
    // Reset form
    setFormData({
      name: '',
      sku: '',
      upc: '',
      categoryId: '',
      unit: ProductUnit.ML,
      container: 'bottle',
      unitSize: 750,
      caseSize: 12,
      costPerUnit: 0,
      costPerCase: 0,
      sellPrice: 0,
      alcoholContent: 0,
      image: '',
    })
    setProductSuppliers([])
    setSelectedSupplierId('')
    setShowSupplierForm(false)
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [suppliersData] = await Promise.all([
        suppliersApi.getSuppliers({ active: true }),
      ])

      setSuppliers(suppliersData)
    } catch (error) {
      console.warn('Failed to fetch initial data:', error)
    } finally {
      setLoading(false)
    }
  }

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
        costPerCase: formData.costPerCase || undefined,
        sellPrice: formData.sellPrice || undefined,
        alcoholContent: formData.alcoholContent || undefined,
        sku: formData.sku || undefined,
        upc: formData.upc || undefined,
        container: formData.container.toLowerCase() || undefined,
        // Include suppliers in the product creation request
        suppliers: productSuppliers.length > 0 ? productSuppliers.map((supplier, index) => ({
          supplierId: supplier.supplierId,
          orderingUnit: supplier.orderingUnit,
          costPerUnit: supplier.costPerUnit,
          costPerCase: supplier.costPerCase || undefined,
          minimumOrder: supplier.minimumOrder,
          packSize: formData.caseSize || undefined,
          isPreferred: index === 0, // First supplier is preferred
          leadTimeDays: 3, // Default lead time
        })) : undefined,
      }

      const createdProduct = await inventoryApi.createProduct(data)
      
      console.log('Product created successfully with suppliers:', {
        id: createdProduct.id,
        name: createdProduct.name,
        suppliersCount: createdProduct.suppliers?.length || 0
      })
      
      if (productSuppliers.length > 0) {
        toast.success(`Product and ${productSuppliers.length} supplier${productSuppliers.length === 1 ? '' : 's'} created successfully!`)
      } else {
        toast.success('Product created successfully!')
      }

      reset()

      setOpen(false)
      onComplete()
    } catch (error) {
      console.warn('Failed to create product:', error)
      showError('Failed to create product. Please try again.')
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

  const addSupplierToProduct = () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier')
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) return

    // Check if supplier already added
    if (productSuppliers.some((ps) => ps.supplierId === selectedSupplierId)) {
      toast.error('Supplier already added to this product')
      return
    }

    const newProductSupplier: ProductSupplier = {
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      costPerUnit: formData.costPerUnit,
      costPerCase: formData.costPerCase || undefined,
      minimumOrder: 1,
      orderingUnit: 'UNIT',
      isPreferred: productSuppliers.length === 0, // First supplier is preferred by default
    }

    setProductSuppliers([...productSuppliers, newProductSupplier])
    setSelectedSupplierId('')
    setShowSupplierForm(false)
    toast.success(`Added ${supplier.name} as supplier`)
  }

  const removeSupplierFromProduct = (supplierId: string) => {
    setProductSuppliers(
      productSuppliers.filter((ps) => ps.supplierId !== supplierId)
    )
  }

  const updateProductSupplier = (
    supplierId: string,
    field: keyof ProductSupplier,
    value: any
  ) => {
    setProductSuppliers(
      productSuppliers.map((ps) =>
        ps.supplierId === supplierId ? { ...ps, [field]: value } : ps
      )
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset()
        setOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button className='btn-brand-primary'>
          <Plus className='mr-2 size-4' />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className='md:min-w-2xl  max-h-[85vh] p-3'>
        <DialogHeader className='p-2'>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product for your inventory
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[calc(85vh-120px)] pr-4'>
          {loading ? (
            <div className='flex items-center justify-center py-4'>
              <HappyBarLoader />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-6 p-2'>
              {/* Catalog Search */}
              <div className='space-y-2'>
                <Label>Search Product Catalog</Label>
                <CatalogSearch
                  onSelect={handleCatalogSelect}
                  placeholder='Search catalog to auto-fill product details...'
                  className='w-full'
                />
                <p className='text-xs text-muted-foreground'>
                  Search the product catalog to quickly fill in product details
                </p>
              </div>

              {/* Basic Information */}
              <div className='space-y-4'>
                <h3 className='text-sm font-semibold'>Basic Information</h3>
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
                  <div className='flex-1 space-y-2'>
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

                    <div className='grid grid-cols-2 gap-4'>
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
                      onChange={(e) =>
                        handleInputChange('image', e.target.value)
                      }
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
                        {categories?.categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Unit & Packaging */}
              <div className='space-y-4'>
                <h3 className='text-sm font-semibold'>Unit & Packaging</h3>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='unit'>Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) =>
                        handleInputChange('unit', value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select unit' />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_UNIT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.label}>
                            {option.label}
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
                        {PRODUCT_CONTAINER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.label}>
                            {option.label}
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
              </div>

              {/* Pricing */}
              <div className='space-y-4'>
                <h3 className='text-sm font-semibold'>Pricing</h3>

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
                  <Label htmlFor='sellPrice'>Sell Price</Label>
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
                  />
                </div>
              </div>

              {/* Suppliers */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>Suppliers</h3>
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

                {suppliers.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    No suppliers available. Create suppliers first to assign
                    them to products.
                  </p>
                ) : (
                  <>
                    {/* Current Suppliers */}
                    {productSuppliers.length > 0 && (
                      <div className='space-y-2'>
                        {productSuppliers.map((supplier) => (
                          <div
                            key={supplier.supplierId}
                            className='border rounded-lg p-3 space-y-3'
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
                                  removeSupplierFromProduct(supplier.supplierId)
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
                                      supplier.supplierId,
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
                                      supplier.supplierId,
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
                                      supplier.supplierId,
                                      'minimumOrder',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className='h-8'
                                />
                              </div>
                              <div>
                                <Label className='text-xs'>Order By</Label>
                                <Select
                                  value={supplier.orderingUnit}
                                  onValueChange={(value) =>
                                    updateProductSupplier(
                                      supplier.supplierId,
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
                            </div>

                            <div className='flex items-center space-x-2'>
                              <Switch
                                id={`preferred-${supplier.supplierId}`}
                                checked={supplier.isPreferred}
                                onCheckedChange={(checked) =>
                                  updateProductSupplier(
                                    supplier.supplierId,
                                    'isPreferred',
                                    checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`preferred-${supplier.supplierId}`}
                                className='text-xs'
                              >
                                Preferred supplier
                              </Label>
                            </div>
                          </div>
                        ))}
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
                                <SelectItem
                                  key={supplier.id}
                                  value={supplier.id}
                                >
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
              </div>

              {/* Actions */}
              <div className='flex justify-end gap-4 pt-4 border-t'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={saving}>
                  <Save className='size-4 mr-2' />
                  {saving ? 'Creating...' : 'Create Product'}
                </Button>
              </div>
            </form>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
