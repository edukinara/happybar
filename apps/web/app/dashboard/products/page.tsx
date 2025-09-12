'use client'

import { LocationFilter } from '@/components/dashboard/LocationFilter'
import AddProductDialog from '@/components/dashboard/Products/AddProductDialog'
import BulkCatalogMatchingDialog from '@/components/dashboard/Products/BulkCatalogMatchingDialog'
import BulkSupplierDialog from '@/components/dashboard/Products/BulkSupplierDialog'
import ImportFromPOS from '@/components/dashboard/Products/ImportFromPOS'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { ProductsGate } from '@/components/subscription/feature-gate'
import { useProductUsageTracker } from '@/components/subscription/usage-tracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomPagination } from '@/components/ui/custom-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { bulkUpdateProducts } from '@/lib/api/products'
import {
  useCategories,
  useDeleteProduct,
  useProducts,
} from '@/lib/queries/products'
import type {
  CatalogProduct,
  InventoryProduct,
  ProductContainer,
} from '@happy-bar/types'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  DollarSign,
  Edit,
  Link2,
  ListPlus,
  MoreHorizontal,
  Package,
  Percent,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ProductsPage() {
  const { showDestructiveConfirm } = useAlertDialog()
  const [searchTerm, setSearchTerm] = useState('')
  const { data: categories, isFetching: fetchingCategories } = useCategories()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >()
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  )
  const [showBulkSupplierDialog, setShowBulkSupplierDialog] = useState(false)
  const [showBulkMatchingDialog, setShowBulkMatchingDialog] = useState(false)

  // Use hooks for data fetching and mutations
  const {
    data: products = { products: [] },
    isLoading: loading,
    error,
    refetch,
    isStale,
  } = useProducts()
  useEffect(() => {
    if (!loading && (isStale || !products?.products)) {
      refetch()
    }
  }, [loading, isStale, products?.products])
  const deleteProductMutation = useDeleteProduct()

  // Track product usage with new Autumn system
  const { setUsage } = useProductUsageTracker()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filter products based on search term and location
  const filteredProducts = products.products.filter((product) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Location filter
    const matchesLocation =
      !selectedLocationId ||
      product.inventoryItems?.some(
        (item) => item.locationId === selectedLocationId
      )

    // Category filter
    const matchesCategory =
      categoryFilter === 'all' || product?.categoryId === categoryFilter

    return matchesSearch && matchesLocation && matchesCategory
  })

  // Calculate pagination values
  const totalItems = filteredProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Update usage tracking when products change
  useEffect(() => {
    if (products.products.length > 0) {
      setUsage(products.products.length).catch(console.warn)
    }
  }, [products.products.length, setUsage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedLocationId])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const queryClient = useQueryClient()

  const handleDeleteProduct = (productId: string) => {
    showDestructiveConfirm(
      'Are you sure you want to delete this product? This action cannot be undone.',
      async () => {
        await deleteProductMutation
          .mutateAsync(productId)
          .then(() =>
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
          )
      },
      'Delete Product',
      'Delete'
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(paginatedProducts.map((p) => p.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts)
    if (checked) {
      newSelected.add(productId)
    } else {
      newSelected.delete(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleBulkMatchingComplete = async (
    matches: Array<{
      product: InventoryProduct
      selectedMatch: CatalogProduct | null
      status: 'matched' | 'skipped' | 'pending'
    }>
  ) => {
    const matchedProducts = matches.filter(
      (m) => m.status === 'matched' && m.selectedMatch
    )

    if (matchedProducts.length === 0) {
      toast.info('No products were matched')
      return
    }

    try {
      // Bulk Update matched products with catalog data
      await bulkUpdateProducts({
        updates: matchedProducts
          .filter((m) => !!m.selectedMatch)
          .map((match) => ({
            id: match.product.id,
            data: {
              name: match.selectedMatch!.name,
              unitSize: match.selectedMatch!.unitSize || match.product.unitSize,
              caseSize: match.selectedMatch!.caseSize || match.product.caseSize,
              container:
                (match.selectedMatch!.container as ProductContainer) ||
                match.product.container,
              categoryId:
                match.selectedMatch!.categoryId || match.product.categoryId,
              costPerUnit:
                match.selectedMatch!.costPerUnit || match.product.costPerUnit,
              costPerCase:
                match.selectedMatch!.costPerCase || match.product.costPerCase,
              image: match.selectedMatch!.image || match.product.image,
              upc: match.selectedMatch!.upc || match.product.upc,
            },
          })),
      })

      toast.success(
        `Successfully updated ${matchedProducts.length} products with catalog data`
      )

      // Clear selection after matching
      setSelectedProducts(new Set())
      // Refetch products to get updated data
      refetch()
    } catch (error) {
      console.error('Failed to update products:', error)
      toast.error('Failed to update some products. Please try again.')
    }
  }

  // Get selected product objects for the dialog
  const selectedProductObjects = (products?.products || []).filter(
    (p: InventoryProduct) => selectedProducts.has(p.id)
  )

  const isAllSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProducts.has(p.id))

  const getTotalQuantity = (product: InventoryProduct) => {
    // If filtering by location, only count quantity in that location
    if (selectedLocationId) {
      return product.inventoryItems
        .filter((item) => item.locationId === selectedLocationId)
        .reduce((sum, item) => sum + item.currentQuantity, 0)
    }
    return product.inventoryItems.reduce(
      (sum, item) => sum + item.currentQuantity,
      0
    )
  }

  const getLocationCount = (product: InventoryProduct) => {
    // If filtering by location, show 1 or 0 based on whether it exists in that location
    if (selectedLocationId) {
      return product.inventoryItems.some(
        (item) => item.locationId === selectedLocationId
      )
        ? 1
        : 0
    }
    return product.inventoryItems.length
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappyBarLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Failed to load products
          </h2>
          <p className='text-muted-foreground mb-4'>
            {error?.message || 'An error occurred while loading products'}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen relative'>
      {/* Animated background gradient */}
      <div className='fixed inset-0 brand-gradient -z-10' />

      {/* Floating orbs for visual interest */}
      <div className='fixed top-32 left-32 w-64 h-64 brand-orb-primary animate-float' />
      <div className='fixed bottom-32 right-32 w-64 h-64 brand-orb-accent animate-float-reverse' />

      <div className='space-y-6 relative z-10'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
              Products
            </h1>
            <p className='text-muted-foreground'>
              Manage your product catalog and pricing information.
            </p>
          </div>
          <div className='flex flex-row gap-2 flex-wrap justify-end'>
            <Button asChild variant='outline'>
              <Link href='/dashboard/products/mappings'>
                <Link2 className='mr-2 size-4' />
                Product Mapping
              </Link>
            </Button>
            <ProductsGate
              fallback={
                <Button disabled>
                  <Plus className='mr-2 size-4' />
                  Upgrade to manage more products
                </Button>
              }
            >
              <div className='flex flex-row gap-2 flex-wrap'>
                <ImportFromPOS onComplete={() => void refetch()} />
                <AddProductDialog onComplete={() => void refetch()} />
              </div>
            </ProductsGate>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid gap-4 md:grid-cols-3'>
          <Card className='brand-card'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Products
              </CardTitle>
              <Package className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold brand-text-gradient'>
                {totalItems}
              </div>
              <p className='text-xs text-muted-foreground'>
                {selectedLocationId
                  ? 'Products in selected location'
                  : 'Total products'}
              </p>
            </CardContent>
          </Card>

          <Card className='brand-card'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Avg Cost</CardTitle>
              <DollarSign className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold brand-text-gradient'>
                $
                {filteredProducts.length > 0
                  ? +(
                      filteredProducts.reduce(
                        (sum, p) => sum + p.costPerUnit,
                        0
                      ) / filteredProducts.length
                    ).toFixed(2)
                  : '0.00'}
              </div>
              <p className='text-xs text-muted-foreground'>
                Average cost per unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card className='brand-card'>
          <CardHeader>
            <CardTitle className='brand-text-gradient'>
              Product Catalog
            </CardTitle>
            <CardDescription>
              View and manage all products in your catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-2'>
                <Search className='size-4 text-muted-foreground' />
                <Input
                  placeholder='Search by product name, SKU, UPC, or category...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='max-w-sm'
                />
              </div>
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-2'>
                  {selectedProducts.size > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='outline'
                          disabled={selectedProducts.size === 0}
                        >
                          <ListPlus className='size-4 mr-2' />
                          Bulk Actions ({selectedProducts.size})
                          <ChevronDown className='size-4 ml-2' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={() => setShowBulkSupplierDialog(true)}
                        >
                          <Building2 className='size-4 mr-2' />
                          Assign to Supplier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setShowBulkMatchingDialog(true)
                          }}
                        >
                          <Search className='size-4 mr-2' />
                          Match with Catalog
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            showDestructiveConfirm(
                              `Are you sure you want to delete ${selectedProducts.size} products?`,
                              () => {
                                // TODO: Implement bulk delete
                                // console.log('Bulk delete:', Array.from(selectedProducts))
                              },
                              'Delete Products',
                              'Delete'
                            )
                          }}
                          className='text-destructive'
                        >
                          <Trash2 className='size-4 mr-2' />
                          Delete Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                    disabled={fetchingCategories}
                  >
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue placeholder='Filter by category' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Categories</SelectItem>
                      {categories?.categories
                        ?.filter((category) => !!category)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id!}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <LocationFilter
                    selectedLocationId={selectedLocationId}
                    onLocationChange={setSelectedLocationId}
                    placeholder='Filter by location'
                  />
                </div>
              </div>
            </div>

            {totalItems === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                {searchTerm
                  ? 'No products match your search.'
                  : 'No products found.'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[50px]'>
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label='Select all'
                        />
                      </TableHead>
                      <TableHead className='w-[34px]'></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Sell Price</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead>Alcohol</TableHead>
                      <TableHead className='w-[100px]'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => {
                      const totalQty = getTotalQuantity(product)
                      const locationCount = getLocationCount(product)

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={(checked) =>
                                handleSelectProduct(
                                  product.id,
                                  checked as boolean
                                )
                              }
                              aria-label={`Select ${product.name}`}
                            />
                          </TableCell>
                          <TableCell className='w-[34px] p-2'>
                            {product.image ? (
                              <div className='relative size-8 overflow-hidden'>
                                <Image
                                  src={product.image}
                                  alt={product.name}
                                  fill
                                  className='object-contain'
                                  sizes='40px'
                                  onError={(_e) => {
                                    console.warn(
                                      `Failed to load image: ${product.image}`
                                    )
                                  }}
                                />
                              </div>
                            ) : (
                              <div className='size-8 flex items-center justify-center'>
                                <Package className='w-4 h-4 text-muted-foreground' />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='max-w-0 min-w-[150px]'>
                            <TooltipProvider>
                              <Tooltip delayDuration={500}>
                                <TooltipTrigger asChild>
                                  <div className='font-medium truncate'>
                                    {product.name}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{product.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className='w-[100px]'>
                            <Badge variant='outline'>
                              {product.category.name}
                            </Badge>
                          </TableCell>
                          <TableCell className='w-[100px]'>
                            {product.container || 'unit'}
                          </TableCell>
                          <TableCell className='w-[100px]'>
                            ${+product.costPerUnit.toFixed(2)}
                          </TableCell>
                          <TableCell className='w-[100px]'>
                            {!!product.mappings?.length ? (
                              <Badge variant='secondary-muted'>mapped</Badge>
                            ) : product.sellPrice ? (
                              `$${+product.sellPrice.toFixed(2)}`
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className='w-[40px]'>
                            <div className='font-bold'>
                              {+totalQty.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className='w-[50px]'>
                            <Badge variant='secondary-muted'>
                              {locationCount} location
                              {locationCount !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell className='w-[50px]'>
                            {product.alcoholContent ? (
                              <div className='flex items-center'>
                                <Percent className='size-3 mr-1' />
                                {product.alcoholContent}%
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className='w-[50px]'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='sm'>
                                  <MoreHorizontal className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/products/${product.id}/edit`}
                                  >
                                    <Edit className='mr-2 size-4' />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteProduct(product.id)
                                  }
                                  className='text-red-600'
                                >
                                  <Trash2 className='mr-2 size-4' />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <div className='mt-6'>
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bulk Supplier Assignment Dialog */}
        <BulkSupplierDialog
          open={showBulkSupplierDialog}
          onOpenChange={setShowBulkSupplierDialog}
          selectedProducts={filteredProducts.filter((p) =>
            selectedProducts.has(p.id)
          )}
          onComplete={() => {
            setSelectedProducts(new Set())
            refetch()
          }}
        />

        {/* Bulk Catalog Matching Dialog */}
        <BulkCatalogMatchingDialog
          open={showBulkMatchingDialog}
          onOpenChange={setShowBulkMatchingDialog}
          selectedProducts={selectedProductObjects}
          onMatchingComplete={handleBulkMatchingComplete}
        />
      </div>
    </div>
  )
}
