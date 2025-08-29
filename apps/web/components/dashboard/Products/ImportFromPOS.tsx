import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { getPOSIntegrations, type POSIntegration } from '@/lib/api/pos'
import {
  bulkCreateProductsFromPOS,
  getCategories,
  getPOSProducts,
  getProductMappings,
  type Category,
  type POSProduct,
  type ProductMappingResponse,
} from '@/lib/api/products'
import { useAuth } from '@/lib/auth/auth-context'
import {
  PRODUCT_CONTAINER_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  getServingUnitOptions,
} from '@/lib/constants/product-options'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import type { ProductContainer } from '@happy-bar/types'
import { AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const ImportFromPOS = ({ onComplete }: { onComplete: () => void }) => {
  const [integrations, setIntegrations] = useState<POSIntegration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<string>('')
  const [posProducts, setPosProducts] = useState<POSProduct[]>([])
  const [mappings, setMappings] = useState<ProductMappingResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false)
  const [selectedPOSProducts, setSelectedPOSProducts] = useState<string[]>([])
  const [defaultUnit, setDefaultUnit] = useState<string>('count')
  const [defaultUnitSize, setDefaultUnitSize] = useState<number>(1)
  const [defaultCaseSize, setDefaultCaseSize] = useState<number>(1)
  const [defaultContainer, setDefaultContainer] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [posProductCategoryFilter, setPosProductCategoryFilter] =
    useState<string>('')
  const [posProductSortBy, setPosProductSortBy] = useState<string>('name')
  const [defaultServingUnit, setDefaultServingUnit] = useState<string>('')
  const [defaultServingSize, setDefaultServingSize] = useState<
    number | undefined
  >()
  const [availableProductSlots, setAvailableProductSlots] = useState<number>(0)
  const [unlimitedProducts, setUnlimitedProducts] = useState(false)
  const [checkingLimits, setCheckingLimits] = useState(false)

  const { user } = useAuth()
  const { getFeatureBalance, isFeatureUnlimited } = useAutumnFeatures()

  // For billing users, get balance from customer data
  // For non-billing users, we'll use the check endpoint in checkAvailableSlots
  const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)
  const availableProductBalance = hasBillingAccess
    ? getFeatureBalance('products')
    : 0
  const unlimited = hasBillingAccess ? isFeatureUnlimited('products') : false

  const fetchIntegrations = async () => {
    try {
      const response = await getPOSIntegrations()
      setIntegrations(response.integrations)
      if (response.integrations.length > 0 && response.integrations[0]) {
        setSelectedIntegration(response.integrations[0].id)
      }
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch integrations',
      })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await getCategories()
      setCategories(response.categories)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch categories',
      })
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { suppliersApi } = await import('@/lib/api/suppliers')
      const suppliers = await suppliersApi.getSuppliers({ active: true })
      setSuppliers(suppliers)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch suppliers',
      })
    }
  }

  const fetchPOSProducts = async () => {
    if (!selectedIntegration) return

    try {
      setLoading(true)
      const response = await getPOSProducts({
        integrationId: selectedIntegration,
      })
      setPosProducts(response.posProducts)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch POS products',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMappings = async () => {
    if (!selectedIntegration) return

    try {
      const response = await getProductMappings({
        integrationId: selectedIntegration,
      })
      setMappings(response.mappings)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch mappings',
      })
    }
  }

  // Check available product slots when dialog opens
  const checkAvailableSlots = async () => {
    setCheckingLimits(true)
    try {
      if (hasBillingAccess) {
        // For billing users, use the balance from customer data
        setAvailableProductSlots(availableProductBalance)
        setUnlimitedProducts(unlimited)
      } else {
        // For non-billing users, use the check endpoint
        // We'll assume they have some basic limit - this could be improved
        // by having the check endpoint return balance information
        setAvailableProductSlots(10) // Default reasonable limit
        setUnlimitedProducts(false)
      }
    } catch (error) {
      console.warn('Failed to check product limits:', error)
      setAvailableProductSlots(0)
      setUnlimitedProducts(false)
    } finally {
      setCheckingLimits(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  useEffect(() => {
    if (isBulkCreateDialogOpen && selectedIntegration) {
      fetchCategories()
      fetchSuppliers()
      fetchPOSProducts()
      fetchMappings()
    }
  }, [isBulkCreateDialogOpen, selectedIntegration])

  const handleBulkCreateProducts = async () => {
    if (!selectedIntegration || selectedPOSProducts.length === 0) return

    try {
      setLoading(true)
      // If serving unit is "container", use the actual container type
      const actualServingUnit =
        defaultServingUnit === 'container'
          ? defaultContainer || undefined
          : defaultServingUnit || undefined

      const response = await bulkCreateProductsFromPOS({
        integrationId: selectedIntegration,
        posProductIds: selectedPOSProducts,
        defaultUnit,
        defaultUnitSize,
        defaultCaseSize,
        defaultContainer: defaultContainer || undefined,
        categoryId: selectedCategoryId || undefined,
        defaultServingUnit: actualServingUnit,
        defaultServingSize: defaultServingSize || undefined,
      })

      // Assign supplier to all created products if selected
      if (selectedSupplierId && response.products?.length > 0) {
        try {
          const { suppliersApi } = await import('@/lib/api/suppliers')
          for (const product of response.products) {
            await suppliersApi.addProductToSupplier(selectedSupplierId, {
              productId: product.id,
              orderingUnit: 'UNIT',
              costPerUnit: 0, // Default cost, user can update later
              minimumOrder: 1,
              isPreferred: true,
            })
          }
        } catch (supplierError) {
          console.warn('Failed to assign supplier to products:', supplierError)
          toast.warning('Products created but supplier assignment failed', {
            description:
              'You can manually assign suppliers to the products later',
          })
        }
      }

      let description = `Created ${response.created} products and ${response.mapped} mappings`
      if (response.errors > 0) {
        description += `. ${response.errors} errors occurred.`
      }
      if (selectedSupplierId && response.products?.length > 0) {
        const supplier = suppliers.find((s) => s.id === selectedSupplierId)
        description += ` All products assigned to ${supplier?.name || 'selected supplier'}.`
      }

      // Check if we hit the plan limit
      if (
        !unlimitedProducts &&
        selectedPOSProducts.length >= availableProductSlots &&
        availableProductSlots > 0
      ) {
        description +=
          ' You&apos;ve reached your plan&apos;s product limit (${availableProductSlots}). Upgrade to create more products.'
      }

      toast.success('Import Complete', {
        description,
      })

      if (response.errorMessages.length > 0) {
        console.warn('Bulk creation errors:', response.errorMessages)
      }

      setIsBulkCreateDialogOpen(false)
      setSelectedPOSProducts([])
      setDefaultUnitSize(1)
      setDefaultCaseSize(1)
      setDefaultContainer('')
      setSelectedCategoryId('')
      setPosProductCategoryFilter('')
      setPosProductSortBy('name')
      setDefaultServingUnit('')
      setDefaultServingSize(undefined)
      setSelectedSupplierId('')
      onComplete()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to import products',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPOSProduct = (productId: string, selected: boolean) => {
    if (selected) {
      // Check if adding this product would exceed the limit
      if (
        !unlimitedProducts &&
        selectedPOSProducts.length >= availableProductSlots
      ) {
        toast.error('Plan Limit Reached', {
          description: `You can only create ${availableProductSlots} products with your current plan. Upgrade to create more products.`,
        })
        return
      }
      setSelectedPOSProducts((prev) => [...prev, productId])
    } else {
      setSelectedPOSProducts((prev) => prev.filter((id) => id !== productId))
    }
  }

  const unmappedPOSProducts = posProducts.filter(
    (posProduct) =>
      !mappings.some((mapping) => mapping.posProductId === posProduct.id)
  )

  // Filter and sort unmapped POS products by category for bulk creation
  const filteredUnmappedPOSProducts = unmappedPOSProducts
    .filter((product) => {
      if (!posProductCategoryFilter) return true
      return product.category
        ?.toLowerCase()
        .includes(posProductCategoryFilter.toLowerCase())
    })
    .sort((a, b) => {
      switch (posProductSortBy) {
        case 'category':
          const aCat = a.category || ''
          const bCat = b.category || ''
          if (aCat !== bCat) {
            return aCat.localeCompare(bCat)
          }
          // If categories are the same, sort by name
          return a.name.localeCompare(b.name)
        case 'price':
          const aPrice = a.price || 0
          const bPrice = b.price || 0
          if (aPrice !== bPrice) {
            return bPrice - aPrice // Descending price
          }
          return a.name.localeCompare(b.name)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const handleSelectAllPOSProducts = (selected: boolean) => {
    if (selected) {
      // Limit selection to available slots
      const maxToSelect = unlimitedProducts
        ? filteredUnmappedPOSProducts.length + 1
        : Math.min(filteredUnmappedPOSProducts.length, availableProductSlots)
      const toSelect = filteredUnmappedPOSProducts
        .slice(0, maxToSelect)
        .map((p) => p.id)
      setSelectedPOSProducts(toSelect)

      if (
        !unlimitedProducts &&
        filteredUnmappedPOSProducts.length > availableProductSlots
      ) {
        toast.warning('Plan Limit Applied', {
          description: `Selected ${maxToSelect} of ${filteredUnmappedPOSProducts.length} products. Upgrade your plan to select more.`,
        })
      }
    } else {
      setSelectedPOSProducts([])
    }
  }

  // Get unique categories from POS products for filtering
  const posProductCategories = Array.from(
    new Set(
      posProducts
        .map((product) => product.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort()

  return !!integrations?.length ? (
    <Dialog
      open={isBulkCreateDialogOpen}
      onOpenChange={setIsBulkCreateDialogOpen}
    >
      <DialogTrigger asChild>
        <Button
          onClick={checkAvailableSlots}
          disabled={loading}
          loading={loading}
        >
          <Plus className='size-4 mr-2' />
          Import from POS
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Import products from POS</DialogTitle>
          <DialogDescription>
            Select POS products to create as internal products with automatic
            mapping
          </DialogDescription>
          {checkingLimits ? (
            <div className='flex items-center gap-2 p-3 bg-muted rounded-lg'>
              <div className='animate-spin rounded-full size-4 border-b-2 border-primary'></div>
              <span className='text-sm'>Checking plan limits...</span>
            </div>
          ) : unlimitedProducts ? null : availableProductSlots === 0 ? (
            <div className='flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <AlertTriangle className='size-4 text-red-500' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-red-800'>
                  Plan Limit Reached
                </p>
                <p className='text-xs text-red-600'>
                  You&apos;ve reached your product limit.
                  <Link
                    href='/pricing'
                    className='underline hover:no-underline'
                  >
                    Upgrade your plan
                  </Link>{' '}
                  to create more products.
                </p>
              </div>
            </div>
          ) : (
            <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg'>
              <Badge
                variant='secondary'
                className='bg-green-100 text-green-800'
              >
                {availableProductSlots} products available
              </Badge>
              <span className='text-xs text-green-600'>
                You can create up to {availableProductSlots} more products with
                your current plan
              </span>
            </div>
          )}
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-1'>
            <Select
              value={selectedIntegration}
              onValueChange={setSelectedIntegration}
            >
              <SelectTrigger className='w-[300px]'>
                <SelectValue placeholder='Select integration' />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.name} ({integration.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='default-unit'>Default Unit</Label>
              <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                <SelectTrigger>
                  <SelectValue placeholder='Select default unit' />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='unit-size'>Unit Size</Label>
              <Input
                id='unit-size'
                type='number'
                min='0.01'
                step='0.01'
                value={defaultUnitSize}
                onChange={(e) =>
                  setDefaultUnitSize(parseFloat(e.target.value) || 1)
                }
                placeholder='1'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='default-container'>
                Default Container (Optional)
              </Label>
              <Select
                value={defaultContainer || '__none__'}
                onValueChange={(value) =>
                  setDefaultContainer(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select container type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>No container</SelectItem>
                  {PRODUCT_CONTAINER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='case-size'>Case Size</Label>
              <Input
                id='case-size'
                type='number'
                min='1'
                step='1'
                value={defaultCaseSize}
                onChange={(e) =>
                  setDefaultCaseSize(parseInt(e.target.value) || 1)
                }
                placeholder='1'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='serving-unit'>Default Serving Unit</Label>
              <Select
                value={defaultServingUnit || '__none__'}
                onValueChange={(value) =>
                  setDefaultServingUnit(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select serving unit' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>No serving unit</SelectItem>
                  {getServingUnitOptions(
                    defaultContainer as ProductContainer | null
                  ).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='serving-size'>Default Serving Size</Label>
              <Input
                id='serving-size'
                type='number'
                min='0.01'
                step='0.01'
                value={defaultServingSize || ''}
                onChange={(e) =>
                  setDefaultServingSize(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder='e.g., 1.5 for 1.5oz shot'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='category'>Category (Optional)</Label>
              <Select
                value={selectedCategoryId || '__default__'}
                onValueChange={(value) =>
                  setSelectedCategoryId(value === '__default__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select category or leave blank for default' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__default__'>
                    No category (use default)
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='supplier'>Default Supplier (Optional)</Label>
              <Select
                value={selectedSupplierId || '__none__'}
                onValueChange={(value) =>
                  setSelectedSupplierId(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='No supplier assigned' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>
                    No supplier (assign later)
                  </SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                All imported products will be assigned to this supplier
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>
                Select POS Products ({selectedPOSProducts.length} of{' '}
                {!unlimitedProducts ? availableProductSlots : 'Unlimited'}{' '}
                selected)
                {posProductCategoryFilter && (
                  <span className='text-muted-foreground font-normal'>
                    {' '}
                    • {filteredUnmappedPOSProducts.length} of{' '}
                    {unmappedPOSProducts.length} shown
                  </span>
                )}
              </Label>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  handleSelectAllPOSProducts(selectedPOSProducts.length === 0)
                }
                disabled={!unlimitedProducts && availableProductSlots === 0}
              >
                {selectedPOSProducts.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Category Filter and Sort */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='pos-category-filter'>Filter by Category</Label>
                <Select
                  value={posProductCategoryFilter || '__all__'}
                  onValueChange={(value) =>
                    setPosProductCategoryFilter(
                      value === '__all__' ? '' : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='All categories' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>All categories</SelectItem>
                    {posProductCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='pos-sort-by'>Sort by</Label>
                <Select
                  value={posProductSortBy}
                  onValueChange={setPosProductSortBy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Sort by' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='name'>Name (A-Z)</SelectItem>
                    <SelectItem value='category'>Category</SelectItem>
                    <SelectItem value='price'>Price (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='max-h-[300px] overflow-y-auto border rounded-lg'>
              {filteredUnmappedPOSProducts.length === 0 ? (
                <div className='p-4 text-center text-muted-foreground'>
                  {posProductCategoryFilter
                    ? `No unmapped POS products in "${posProductCategoryFilter}" category`
                    : 'No unmapped POS products available'}
                </div>
              ) : (
                <div className='space-y-1 p-2'>
                  {filteredUnmappedPOSProducts.map((product) => (
                    <div
                      key={product.id}
                      className='flex items-center space-x-2 p-2 hover:bg-muted rounded'
                    >
                      <input
                        type='checkbox'
                        checked={selectedPOSProducts.includes(product.id)}
                        onChange={(e) =>
                          handleSelectPOSProduct(product.id, e.target.checked)
                        }
                        disabled={
                          !unlimitedProducts &&
                          !selectedPOSProducts.includes(product.id) &&
                          selectedPOSProducts.length >= availableProductSlots
                        }
                        className='rounded'
                      />
                      <div className='flex-1'>
                        <div className='font-medium'>{product.name}</div>
                        <div className='text-sm text-muted-foreground'>
                          {product.sku && `SKU: ${product.sku} • `}
                          {product.category &&
                            `Category: ${product.category} • `}
                          {product.servingUnit &&
                            product.servingSize &&
                            `${product.servingSize} ${product.servingUnit} • `}
                          {product.price && `$${product.price.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleBulkCreateProducts}
            disabled={
              loading ||
              selectedPOSProducts.length === 0 ||
              (!unlimitedProducts && availableProductSlots === 0) ||
              checkingLimits
            }
          >
            {loading
              ? 'Creating...'
              : !unlimitedProducts && availableProductSlots === 0
                ? 'Plan Limit Reached'
                : `Create ${selectedPOSProducts.length} Products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null
}

export default ImportFromPOS
