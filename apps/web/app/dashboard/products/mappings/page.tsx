'use client'

import { RecipeMappingSuggestions } from '@/components/dashboard/Recipes/RecipeMappingSuggestions'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { MenuGroupSelector } from '@/components/pos/menu-group-selector'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPOSIntegrations, posApi, type POSIntegration } from '@/lib/api/pos'
import {
  createProductMapping,
  deleteProductMapping,
  getMappingSuggestions,
  getPOSProducts,
  getProductMappings,
  getProducts,
  importPOSProducts,
  updateProductMapping,
  type MappingSuggestion,
  type POSProduct,
  type Product,
  type ProductMappingResponse,
} from '@/lib/api/products'
import { recipePOSMappingsApi } from '@/lib/api/recipe-pos-mappings'
import { recipesApi } from '@/lib/api/recipes'
import { getServingUnitOptions } from '@/lib/constants/product-options'
import {
  ProductUnit,
  type ProductContainer,
  type Recipe,
  type RecipePOSMapping,
} from '@happy-bar/types'
import {
  AlertCircle,
  CheckCircle,
  ChefHat,
  Download,
  Edit,
  ExternalLink,
  Package,
  Plus,
  Search,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ProductMappingsPage() {
  const [integrations, setIntegrations] = useState<POSIntegration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<string>('')
  const [posProducts, setPosProducts] = useState<POSProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mappings, setMappings] = useState<ProductMappingResponse[]>([])
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRecipeEditDialogOpen, setIsRecipeEditDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] =
    useState<ProductMappingResponse | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedPOSProduct, setSelectedPOSProduct] = useState<string>('')
  const [mappingServingUnit, setMappingServingUnit] = useState<string>(
    ProductUnit.FL_OZ
  )
  const [mappingServingSize, setMappingServingSize] = useState<
    number | undefined
  >(1.5)
  const [selectedGroupGuids, setSelectedGroupGuids] = useState<string[]>([])

  // Recipe mapping states
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeMappings, setRecipeMappings] = useState<RecipePOSMapping[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<string>('')
  const [isRecipeMappingDialogOpen, setIsRecipeMappingDialogOpen] =
    useState(false)
  const [editingRecipeMapping, setEditingRecipeMapping] =
    useState<RecipePOSMapping | null>(null)

  // Mapping type selector
  const [mappingType, setMappingType] = useState<'direct' | 'recipe'>('direct')

  // Filter states
  const [mappingSearch, setMappingSearch] = useState('')
  const [confirmationFilter, setConfirmationFilter] = useState<
    'all' | 'confirmed' | 'auto'
  >('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Bulk operations state
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(
    new Set()
  )
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [bulkServingUnit, setBulkServingUnit] = useState<string>(
    ProductUnit.FL_OZ
  )
  const [bulkServingSize, setBulkServingSize] = useState<number | undefined>(
    1.5
  )
  const [updatingMapping, setUpdatingMapping] = useState(false)

  useEffect(() => {
    fetchIntegrations()
    fetchProducts()
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (selectedIntegration) {
      fetchPOSProducts()
      fetchMappings()
      fetchSuggestions()
      fetchRecipeMappings()

      // Load saved group preferences for this integration
      const integration = integrations.find((i) => i.id === selectedIntegration)
      if (integration?.selectedGroupGuids) {
        setSelectedGroupGuids(integration.selectedGroupGuids)
      } else {
        setSelectedGroupGuids([])
      }
    }
  }, [selectedIntegration, integrations])

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

  const fetchProducts = async () => {
    try {
      const response = await getProducts({ limit: 1000 })
      setProducts(response.products as Product[])
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch products',
      })
    }
  }

  const fetchPOSProducts = async () => {
    if (!selectedIntegration) return

    try {
      setLoading(true)
      const response = await getPOSProducts({
        integrationId: selectedIntegration,
        search,
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

  const [loadingMappings, setLoadingMappings] = useState(false)

  const fetchMappings = async () => {
    if (!selectedIntegration) return
    setLoadingMappings(true)
    try {
      const response = await getProductMappings({
        integrationId: selectedIntegration,
      })
      setMappings(response.mappings)
      setLoadingMappings(false)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to fetch mappings',
      })
      setLoadingMappings(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!selectedIntegration) return

    try {
      const response = await getMappingSuggestions(selectedIntegration)
      setSuggestions(response.suggestions)
    } catch (error) {
      console.warn('Failed to fetch suggestions:', error)
    }
  }

  const fetchRecipes = async () => {
    try {
      const response = await recipesApi.getRecipes({ limit: 100 })
      setRecipes(response.recipes)
    } catch (error) {
      console.warn('Failed to fetch recipes:', error)
      toast.error('Failed to fetch recipes')
    }
  }

  const fetchRecipeMappings = async () => {
    if (!selectedIntegration) return

    try {
      const response = await recipePOSMappingsApi.getMappings({ limit: 100 })
      setRecipeMappings(response.mappings)
    } catch (error) {
      console.warn('Failed to fetch recipe mappings:', error)
      toast.error('Failed to fetch recipe mappings')
    }
  }

  const handleImportProducts = async (groupGuids: string[]) => {
    if (!selectedIntegration) return

    try {
      setLoading(true)

      // Save selected groups to integration first (always save preferences)
      await posApi.updateSelectedGroups(selectedIntegration, groupGuids)

      const response = await importPOSProducts({
        integrationId: selectedIntegration,
        selectedGroupGuids: groupGuids.length > 0 ? groupGuids : undefined,
        autoMap: true,
      })

      toast.success('Success', {
        description: `Imported ${response.imported} products${response.autoMapped ? `, auto-mapped ${response.autoMapped}` : ''}`,
      })

      setIsImportDialogOpen(false)
      fetchPOSProducts()
      fetchMappings()
      fetchSuggestions()
      // Refresh integrations to get updated selectedGroupGuids
      fetchIntegrations()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to import products',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMapping = async () => {
    if (!selectedProduct || !selectedPOSProduct) return

    try {
      // If serving unit is "container", use the actual container type
      const selectedProductData = products.find((p) => p.id === selectedProduct)
      const actualServingUnit =
        mappingServingUnit === 'container'
          ? selectedProductData?.container || undefined
          : mappingServingUnit || undefined

      await createProductMapping({
        productId: selectedProduct,
        posProductId: selectedPOSProduct,
        isConfirmed: true,
        servingUnit: actualServingUnit,
        servingSize: mappingServingSize || undefined,
      })

      toast.success('Success', {
        description: 'Product mapping created successfully',
      })

      setIsMappingDialogOpen(false)
      setSelectedProduct('')
      setSelectedPOSProduct('')
      setMappingServingUnit(ProductUnit.FL_OZ)
      setMappingServingSize(1.5)
      fetchMappings()
      fetchSuggestions()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to create mapping',
      })
    }
  }

  const handleCreateRecipeMapping = async () => {
    if (
      !selectedRecipe ||
      !selectedPOSProduct ||
      selectedRecipe.trim() === '' ||
      selectedPOSProduct.trim() === ''
    ) {
      toast.error('Please select both a recipe and POS product')
      return
    }

    try {
      await recipePOSMappingsApi.createMapping({
        recipeId: selectedRecipe,
        posProductId: selectedPOSProduct,
        isActive: true,
      })

      toast.success('Recipe mapping created successfully')
      setIsRecipeMappingDialogOpen(false)
      setSelectedRecipe('')
      setSelectedPOSProduct('')
      fetchRecipeMappings()
    } catch (error) {
      console.warn('Failed to create recipe mapping:', error)
    }
  }

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return

    try {
      await deleteProductMapping(id)
      toast.success('Success', {
        description: 'Mapping deleted successfully',
      })
      fetchMappings()
      fetchSuggestions()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to delete mapping',
      })
    }
  }

  const handleDeleteRecipeMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe mapping?')) return

    try {
      await recipePOSMappingsApi.deleteMapping(id)
      toast.success('Recipe mapping deleted successfully')
      fetchRecipeMappings()
    } catch (error) {
      console.warn('Failed to delete recipe mapping:', error)
      toast.error('Failed to delete recipe mapping')
    }
  }

  const handleAcceptSuggestion = async (suggestion: MappingSuggestion) => {
    try {
      await createProductMapping({
        productId: suggestion.productId,
        posProductId: suggestion.posProductId,
        isConfirmed: true,
      })

      toast.success('Success', {
        description: 'Mapping suggestion accepted',
      })

      fetchMappings()
      fetchSuggestions()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to accept suggestion',
      })
    }
  }

  const handleEditMapping = (mapping: ProductMappingResponse) => {
    setEditingMapping(mapping)
    setSelectedProduct(mapping.productId)
    setSelectedPOSProduct(mapping.posProductId)
    // Set serving fields - use mapping overrides if available, otherwise use POSProduct defaults
    setMappingServingUnit(
      mapping.posProduct?.servingUnit ||
        mapping.servingUnit ||
        ProductUnit.FL_OZ
    )
    setMappingServingSize(
      mapping.servingSize || mapping.posProduct?.servingSize || 1.5
    )
    setIsEditDialogOpen(true)
  }

  const handleEditRecipeMapping = (mapping: RecipePOSMapping) => {
    setEditingRecipeMapping(mapping)
    setSelectedRecipe(mapping.recipeId)
    setSelectedPOSProduct(mapping.posProductId)
    setIsRecipeEditDialogOpen(true)
  }

  const handleUpdateMapping = async () => {
    if (!editingMapping || !selectedProduct || !selectedPOSProduct) return

    try {
      setUpdatingMapping(true)
      // If serving unit is "container", use the actual container type
      const selectedProductData = products.find((p) => p.id === selectedProduct)
      const actualServingUnit =
        mappingServingUnit === 'container'
          ? selectedProductData?.container || undefined
          : mappingServingUnit || undefined
      await updateProductMapping(editingMapping.id, {
        productId: selectedProduct,
        posProductId: selectedPOSProduct,
        isConfirmed: true,
        servingUnit: actualServingUnit,
        servingSize: mappingServingSize || undefined,
      })

      toast.success('Success', {
        description: 'Product mapping updated successfully',
      })

      setIsEditDialogOpen(false)
      setEditingMapping(null)
      setSelectedProduct('')
      setSelectedPOSProduct('')
      setMappingServingUnit(ProductUnit.FL_OZ)
      setMappingServingSize(1.5)
      fetchMappings()
      fetchSuggestions()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to update mapping',
      })
    } finally {
      setUpdatingMapping(false)
    }
  }

  const handleUpdateRecipeMapping = async () => {
    if (
      !editingRecipeMapping ||
      !selectedRecipe ||
      selectedRecipe.trim() === '' ||
      selectedPOSProduct.trim() === ''
    ) {
      toast.error('Please select both a recipe and POS product')
      return
    }

    try {
      setUpdatingMapping(true)
      await recipePOSMappingsApi.updateMapping(editingRecipeMapping.id, {
        isActive: true,
        recipeId: selectedRecipe,
        posProductId: selectedPOSProduct,
      })

      toast.success('Success', {
        description: 'Recipe mapping updated successfully',
      })
      setIsRecipeEditDialogOpen(false)
      setSelectedRecipe('')
      setSelectedPOSProduct('')
      fetchRecipeMappings()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to update mapping',
      })
    } finally {
      setUpdatingMapping(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setIsRecipeEditDialogOpen(false)
    setEditingMapping(null)
    setEditingRecipeMapping(null)
    setSelectedProduct('')
    setSelectedRecipe('')
    setSelectedPOSProduct('')
    setMappingServingUnit(ProductUnit.FL_OZ)
    setMappingServingSize(1.5)
  }

  // Bulk operations handlers
  const handleSelectMapping = (mappingId: string, checked: boolean) => {
    const newSelection = new Set(selectedMappings)
    if (checked) {
      newSelection.add(mappingId)
    } else {
      newSelection.delete(mappingId)
    }
    setSelectedMappings(newSelection)
  }

  const handleSelectAllMappings = (checked: boolean) => {
    if (checked) {
      setSelectedMappings(new Set(filteredMappings.map((m) => m.id)))
    } else {
      setSelectedMappings(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMappings.size === 0) return

    if (
      !confirm(
        `Are you sure you want to delete ${selectedMappings.size} mapping(s)? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await Promise.all(
        Array.from(selectedMappings).map((id) => deleteProductMapping(id))
      )

      toast.success('Success', {
        description: `${selectedMappings.size} mapping(s) deleted successfully`,
      })

      setSelectedMappings(new Set())
      fetchMappings()
      fetchSuggestions()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to delete some mappings',
      })
    }
  }

  const handleBulkEdit = async () => {
    if (selectedMappings.size === 0) return

    try {
      const mappingsToUpdate = filteredMappings.filter((m) =>
        selectedMappings.has(m.id)
      )

      await Promise.all(
        mappingsToUpdate.map((mapping) =>
          updateProductMapping(mapping.id, {
            productId: mapping.productId,
            posProductId: mapping.posProductId,
            isConfirmed: true,
            servingUnit: bulkServingUnit || undefined,
            servingSize: bulkServingSize || undefined,
          })
        )
      )

      toast.success('Success', {
        description: `${selectedMappings.size} mapping(s) updated successfully`,
      })

      setIsBulkEditDialogOpen(false)
      setSelectedMappings(new Set())
      setBulkServingUnit(ProductUnit.FL_OZ)
      setBulkServingSize(1.5)
      fetchMappings()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to update some mappings',
      })
    }
  }

  const handleCancelBulkEdit = () => {
    setIsBulkEditDialogOpen(false)
    setBulkServingUnit(ProductUnit.FL_OZ)
    setBulkServingSize(1.5)
  }

  // Get serving unit options for the selected product
  const getServingOptions = () => {
    const selectedProductData = products.find((p) => p.id === selectedProduct)
    return getServingUnitOptions(selectedProductData?.container)
  }

  // Get unique categories from POS products
  const posCategories = Array.from(
    new Set(posProducts.map((p) => p.category).filter((c) => c))
  ).sort()

  // Filter mappings based on search and filters
  const filteredMappings = mappings.filter((mapping) => {
    // Search filter
    const matchesSearch =
      !mappingSearch ||
      mapping.product?.name
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.product?.sku
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.posProduct?.name
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.posProduct?.sku
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.posProduct?.category
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase())

    // Confirmation filter
    const matchesConfirmation =
      confirmationFilter === 'all' ||
      (confirmationFilter === 'confirmed' && mapping.isConfirmed) ||
      (confirmationFilter === 'auto' && !mapping.isConfirmed)

    // Category filter
    const matchesCategory =
      categoryFilter === 'all' ||
      mapping.posProduct?.category === categoryFilter

    return matchesSearch && matchesConfirmation && matchesCategory
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Calculate pagination values
  const totalItems = filteredMappings.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedMappings = filteredMappings.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Filter recipe mappings based on search
  const filteredRecipeMappings = recipeMappings.filter((mapping) => {
    if (!mappingSearch) return true

    return (
      mapping.recipe?.name
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.posProduct?.name
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase()) ||
      mapping.posProduct?.category
        ?.toLowerCase()
        .includes(mappingSearch.toLowerCase())
    )
  })

  const filteredPOSProducts = posProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase())
  )

  const unmappedPOSProducts = filteredPOSProducts.filter(
    (posProduct) =>
      !mappings.some(
        (mapping) =>
          mapping.posProductId === posProduct.id &&
          mapping.id !== editingMapping?.id // Allow current editing mapping to appear in list
      ) &&
      !recipeMappings.some(
        (recipeMapping) =>
          recipeMapping.posProductId === posProduct.id &&
          recipeMapping.isActive &&
          recipeMapping.id !== editingRecipeMapping?.id // Allow current editing mapping to appear in list
      )
  )

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-wrap items-center w-full justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold'>POS Product Mappings</h1>
          <p className='text-muted-foreground'>
            Connect your POS products to inventory products or recipes
          </p>
        </div>

        {!selectedIntegration ? null : (
          <div className='flex flex-row gap-2 flex-wrap justify-end'>
            <Button variant='outline' asChild>
              <a href='/dashboard/products'>
                <ExternalLink className='size-4 mr-2' />
                Back to Products
              </a>
            </Button>

            <Dialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline'>
                  <Download className='size-4 mr-2' />
                  Import POS Products
                </Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-[600px]'>
                <DialogHeader>
                  <DialogTitle>Import POS Products</DialogTitle>
                  <DialogDescription>
                    Select which menu groups to import from your POS system.
                    Products will be automatically mapped to existing products.
                  </DialogDescription>
                </DialogHeader>
                <div className='py-4'>
                  <MenuGroupSelector
                    integrationId={selectedIntegration}
                    selectedGroupGuids={selectedGroupGuids}
                    onSelectionChange={setSelectedGroupGuids}
                    onSync={handleImportProducts}
                    isLoading={loading}
                    disabled={!selectedIntegration}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Edit Mapping Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Edit Product Mapping</DialogTitle>
            <DialogDescription>
              Update the mapping between POS product and internal product
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-pos-product'>POS Product</Label>
              <Select
                value={selectedPOSProduct}
                onValueChange={setSelectedPOSProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select POS product' />
                </SelectTrigger>
                <SelectContent>
                  {unmappedPOSProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {'=>'}{' '}
                      {product.category && `${product.category}`}{' '}
                      {product.price && `$${product.price.toFixed(2)}`}
                      {product.sku && `(${product.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-internal-product'>Internal Product</Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select internal product' />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='edit-serving-unit'>
                  Serving Unit (Optional)
                </Label>
                <Select
                  value={mappingServingUnit || '__none__'}
                  onValueChange={(value) =>
                    setMappingServingUnit(value === '__none__' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select serving unit' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>No serving unit</SelectItem>
                    {getServingOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-serving-size'>
                  Serving Size (Optional)
                </Label>
                <Input
                  id='edit-serving-size'
                  type='number'
                  min='0.01'
                  step='0.01'
                  value={mappingServingSize || ''}
                  onChange={(e) =>
                    setMappingServingSize(
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder='e.g., 1.5 for 1.5oz shot'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={handleCancelEdit}
              disabled={updatingMapping}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMapping}
              disabled={!selectedProduct || !selectedPOSProduct}
              loading={updatingMapping}
            >
              Update Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Mapping Dialog */}
      <Dialog
        open={isRecipeEditDialogOpen}
        onOpenChange={setIsRecipeEditDialogOpen}
      >
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Edit Recipe Mapping</DialogTitle>
            <DialogDescription>
              Update the mapping between POS product and recipe
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-pos-product'>POS Product</Label>
              <Select
                value={selectedPOSProduct}
                onValueChange={setSelectedPOSProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select POS product' />
                </SelectTrigger>
                <SelectContent>
                  {unmappedPOSProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {'=>'}{' '}
                      {product.category && `${product.category}`}{' '}
                      {product.price && `$${product.price.toFixed(2)}`}
                      {product.sku && `(${product.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='edit-recipe'>Recipe</Label>
              <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                <SelectTrigger>
                  <SelectValue placeholder='Select Recipe' />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRecipeMapping}
              disabled={!selectedRecipe}
              loading={updatingMapping}
            >
              Update Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
      >
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Bulk Edit Product Mappings</DialogTitle>
            <DialogDescription>
              Update serving unit and size for {selectedMappings.size} selected
              mapping(s)
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='bulk-serving-unit'>
                  Serving Unit (Optional)
                </Label>
                <Select
                  value={bulkServingUnit || '__none__'}
                  onValueChange={(value) =>
                    setBulkServingUnit(value === '__none__' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select serving unit' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>No serving unit</SelectItem>
                    {/* {Object.values(ProductUnit).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))} */}
                    {getServingUnitOptions(
                      mappings.reduce((acc: ProductContainer[], m) => {
                        if (
                          selectedMappings.has(m.id) &&
                          m.product?.container &&
                          !acc.some((a) => a === m.product.container)
                        ) {
                          acc.push(m.product.container)
                        }
                        return acc
                      }, [])
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='bulk-serving-size'>
                  Serving Size (Optional)
                </Label>
                <Input
                  id='bulk-serving-size'
                  type='number'
                  min='0.01'
                  step='0.01'
                  value={bulkServingSize || ''}
                  onChange={(e) =>
                    setBulkServingSize(
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder='e.g., 1.5 for 1.5oz shot'
                />
              </div>
            </div>
            <div className='text-sm text-muted-foreground'>
              These values will be applied to all {selectedMappings.size}{' '}
              selected mappings.
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCancelBulkEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={!bulkServingUnit && !bulkServingSize}
            >
              Update {selectedMappings.size} Mapping(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!selectedIntegration ? (
        <Button asChild>
          <a href='/dashboard/settings'>
            No active POS integration. Set one up.
          </a>
        </Button>
      ) : (
        <>
          {/* Integration Selection */}
          <Card>
            <CardHeader>
              <CardTitle>POS Integration</CardTitle>
              <CardDescription>
                Select which POS integration to manage
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Tabbed Interface for Mapping Types */}
          <Tabs
            value={mappingType}
            onValueChange={(value) =>
              setMappingType(value as 'direct' | 'recipe')
            }
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='direct' className='flex items-center gap-2'>
                <Package className='size-4' />
                Direct Product Mapping
              </TabsTrigger>
              <TabsTrigger value='recipe' className='flex items-center gap-2'>
                <ChefHat className='size-4' />
                Recipe Mapping
              </TabsTrigger>
            </TabsList>

            <TabsContent value='direct' className='space-y-6'>
              <div className='text-sm text-muted-foreground'>
                Map POS products directly to inventory products (for
                bottled/packaged items)
              </div>

              {/* Create Dialog */}
              <div className='flex w-full justify-end'>
                <Dialog
                  open={
                    mappingType === 'direct'
                      ? isMappingDialogOpen
                      : isRecipeMappingDialogOpen
                  }
                  onOpenChange={
                    mappingType === 'direct'
                      ? setIsMappingDialogOpen
                      : setIsRecipeMappingDialogOpen
                  }
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className='size-4 mr-2' />
                      Create {mappingType === 'direct'
                        ? 'Product'
                        : 'Recipe'}{' '}
                      Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-[500px]'>
                    <DialogHeader>
                      <DialogTitle>
                        Create {mappingType === 'direct' ? 'Product' : 'Recipe'}{' '}
                        Mapping
                      </DialogTitle>
                      <DialogDescription>
                        {mappingType === 'direct'
                          ? 'Map a POS product to an internal product'
                          : 'Map a POS cocktail/drink to a recipe'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      <div className='grid gap-2'>
                        <Label htmlFor='pos-product'>POS Product</Label>
                        <Select
                          value={selectedPOSProduct}
                          onValueChange={setSelectedPOSProduct}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select POS product' />
                          </SelectTrigger>
                          <SelectContent>
                            {unmappedPOSProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} {'=>'}{' '}
                                {product.category && `${product.category}`}{' '}
                                {product.price &&
                                  `$${product.price.toFixed(2)}`}
                                {product.sku && `(${product.sku})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='grid gap-2'>
                        <Label htmlFor='mapping-target'>
                          {mappingType === 'direct'
                            ? 'Internal Product'
                            : 'Recipe'}
                        </Label>
                        <Select
                          value={
                            mappingType === 'direct'
                              ? selectedProduct
                              : selectedRecipe
                          }
                          onValueChange={
                            mappingType === 'direct'
                              ? setSelectedProduct
                              : setSelectedRecipe
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`Select ${mappingType === 'direct' ? 'internal product' : 'recipe'}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {mappingType === 'direct'
                              ? products.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    {product.name}{' '}
                                    {product.sku && `(${product.sku})`}
                                  </SelectItem>
                                ))
                              : recipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id}>
                                    {recipe.name} - $
                                    {recipe.costPerServing?.toFixed(2) ||
                                      '0.00'}
                                    /serving
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {mappingType === 'direct' && (
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='grid gap-2'>
                            <Label htmlFor='mapping-serving-unit'>
                              Serving Unit (Optional)
                            </Label>
                            <Select
                              value={mappingServingUnit || '__none__'}
                              onValueChange={(value) =>
                                setMappingServingUnit(
                                  value === '__none__' ? '' : value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder='Select serving unit' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='__none__'>
                                  No serving unit
                                </SelectItem>
                                {getServingOptions().map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className='grid gap-2'>
                            <Label htmlFor='mapping-serving-size'>
                              Serving Size (Optional)
                            </Label>
                            <Input
                              id='mapping-serving-size'
                              type='number'
                              min='0.01'
                              step='0.01'
                              value={mappingServingSize || ''}
                              onChange={(e) =>
                                setMappingServingSize(
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                )
                              }
                              placeholder='e.g., 1.5 for 1.5oz shot'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={
                          mappingType === 'direct'
                            ? handleCreateMapping
                            : handleCreateRecipeMapping
                        }
                        disabled={
                          mappingType === 'direct'
                            ? !selectedProduct || !selectedPOSProduct
                            : !selectedRecipe || !selectedPOSProduct
                        }
                      >
                        Create Mapping
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Mapping Suggestions */}
              {suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Zap className='size-5' />
                      Auto-Mapping Suggestions
                    </CardTitle>
                    <CardDescription>
                      AI-powered suggestions for mapping POS products to
                      internal products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {suggestions.slice(0, 5).map((suggestion) => (
                        <div
                          key={`${suggestion.productId}-${suggestion.posProductId}`}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <div className='flex-1'>
                            <div className='font-medium'>
                              {suggestion.productName}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              ↔ {suggestion.posProductName}
                            </div>
                            <div className='flex gap-1 mt-1'>
                              {suggestion.reasons.map((reason, index) => (
                                <Badge
                                  key={index}
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant={
                                suggestion.confidence > 0.8
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {(suggestion.confidence * 100).toFixed(0)}% match
                            </Badge>
                            <Button
                              size='sm'
                              onClick={() => handleAcceptSuggestion(suggestion)}
                            >
                              <CheckCircle className='size-4' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Direct Product Mappings */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Product Mappings</CardTitle>
                  <CardDescription>
                    Active mappings between POS products and internal products
                  </CardDescription>
                  <div className='flex flex-wrap gap-4 mt-2'>
                    <div className='flex-1 min-w-[200px]'>
                      <div className='relative'>
                        <Search className='absolute left-2 top-2.5 size-4 text-muted-foreground' />
                        <Input
                          placeholder='Search mappings...'
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          className='pl-8'
                        />
                      </div>
                    </div>
                    <Select
                      value={confirmationFilter}
                      onValueChange={(value: 'all' | 'confirmed' | 'auto') =>
                        setConfirmationFilter(value)
                      }
                    >
                      <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder='Filter by status' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Mappings</SelectItem>
                        <SelectItem value='confirmed'>
                          Confirmed Only
                        </SelectItem>
                        <SelectItem value='auto'>Auto-mapped Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder='Filter by category' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All Categories</SelectItem>
                        {posCategories
                          .filter((category) => !!category)
                          .map((category) => (
                            <SelectItem key={category} value={category!}>
                              {category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {(mappingSearch ||
                      confirmationFilter !== 'all' ||
                      categoryFilter !== 'all') && (
                      <Button
                        variant='outline'
                        onClick={() => {
                          setMappingSearch('')
                          setConfirmationFilter('all')
                          setCategoryFilter('all')
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                  {(mappingSearch ||
                    confirmationFilter !== 'all' ||
                    categoryFilter !== 'all') && (
                    <p className='text-sm text-muted-foreground mt-2'>
                      Showing {filteredMappings.length} of {mappings.length}{' '}
                      mappings
                    </p>
                  )}
                  {/* Bulk Actions */}
                  {selectedMappings.size > 0 && (
                    <div className='flex items-center gap-2 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                      <div className='flex items-center gap-2 flex-1'>
                        <Users className='size-4 text-blue-600' />
                        <span className='text-sm font-medium text-blue-700'>
                          {selectedMappings.size} mapping(s) selected
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setIsBulkEditDialogOpen(true)}
                        >
                          <Edit className='size-4 mr-1' />
                          Bulk Edit
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className='size-4 mr-1' />
                          Delete Selected
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setSelectedMappings(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {loadingMappings ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      <HappyBarLoader />
                    </div>
                  ) : paginatedMappings.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      {mappingSearch ||
                      confirmationFilter !== 'all' ||
                      categoryFilter !== 'all'
                        ? 'No mappings match your filters.'
                        : 'No product mappings found. Create your first mapping above.'}
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='w-[50px]'>
                              <Checkbox
                                checked={
                                  selectedMappings.size > 0 &&
                                  selectedMappings.size ===
                                    filteredMappings.length
                                }
                                onCheckedChange={(checked) =>
                                  handleSelectAllMappings(checked as boolean)
                                }
                              />
                            </TableHead>
                            <TableHead>Internal Product</TableHead>
                            <TableHead>POS Product</TableHead>
                            <TableHead>Serving Info</TableHead>
                            <TableHead>Integration</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='w-[100px]'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedMappings.map((mapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedMappings.has(mapping.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectMapping(
                                      mapping.id,
                                      checked as boolean
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className='font-medium'>
                                    {mapping.product?.name}
                                  </div>
                                  {mapping.product?.sku && (
                                    <div className='text-sm text-muted-foreground'>
                                      SKU: {mapping.product.sku}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-row items-center gap-2'>
                                  {mapping.product?.image ? (
                                    <div className='relative size-7 overflow-hidden'>
                                      <Image
                                        src={mapping.product.image}
                                        alt={mapping.product.name}
                                        fill
                                        className='object-contain'
                                        sizes='28px'
                                        onError={(_e) => {
                                          console.warn(
                                            `Failed to load image: ${mapping.product.image}`
                                          )
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className='size-8 flex items-center justify-center'>
                                      <Package className='w-4 h-4 text-muted-foreground' />
                                    </div>
                                  )}
                                  <div className='flex flex-col gap-0'>
                                    <div>
                                      <div className='font-medium'>
                                        {mapping.posProduct?.name}
                                      </div>
                                      {mapping.posProduct?.sku && (
                                        <div className='text-sm text-muted-foreground'>
                                          SKU: {mapping.posProduct.sku}
                                        </div>
                                      )}
                                    </div>
                                    <p className='text-xs text-muted-foreground'>
                                      {mapping.posProduct?.category}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {mapping.servingUnit || mapping.servingSize ? (
                                  mapping.servingUnit && (
                                    <div className='flex flex-row items-center'>
                                      <p className='text-sm'>
                                        {mapping.servingSize || 1}
                                      </p>
                                      <Badge
                                        variant='secondary'
                                        className='ml-2'
                                      >
                                        {mapping.servingUnit}
                                      </Badge>
                                    </div>
                                  )
                                ) : mapping.posProduct?.servingUnit ||
                                  mapping.posProduct?.servingSize ? (
                                  mapping.posProduct?.servingUnit && (
                                    <div className='flex flex-row items-center'>
                                      <p className='text-sm'>
                                        {mapping.posProduct.servingSize || 1}
                                      </p>
                                      <Badge
                                        variant='secondary'
                                        className='ml-2'
                                      >
                                        {mapping.posProduct.servingUnit}
                                      </Badge>
                                    </div>
                                  )
                                ) : (
                                  <span className='text-muted-foreground'>
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant='outline'>
                                  {mapping.posProduct?.integration?.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    mapping.confidence > 0.8
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {(mapping.confidence * 100).toFixed(0)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    mapping.isConfirmed
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {mapping.isConfirmed ? (
                                    <>
                                      <CheckCircle className='size-3 mr-1' />
                                      Confirmed
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className='size-3 mr-1' />
                                      Auto-mapped
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() => handleEditMapping(mapping)}
                                    title='Edit mapping'
                                  >
                                    <Edit className='size-4' />
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() =>
                                      handleDeleteMapping(mapping.id)
                                    }
                                    title='Delete mapping'
                                  >
                                    <Trash2 className='size-4' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
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
            </TabsContent>

            <TabsContent value='recipe' className='space-y-6'>
              <div className='text-sm text-muted-foreground'>
                Map POS cocktails/mixed drinks to recipes that define their
                ingredients
              </div>

              {/* Filters for Recipe Mappings */}
              <Card>
                <CardHeader>
                  <CardTitle>Filter Recipe Mappings</CardTitle>
                  <CardDescription>
                    Search through your recipe mappings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-wrap gap-4'>
                    <div className='flex-1 min-w-[200px]'>
                      <div className='relative'>
                        <Search className='absolute left-2 top-2.5 size-4 text-muted-foreground' />
                        <Input
                          placeholder='Search recipe mappings...'
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          className='pl-8'
                        />
                      </div>
                    </div>
                    {mappingSearch && (
                      <Button
                        variant='outline'
                        onClick={() => setMappingSearch('')}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {mappingSearch && (
                    <p className='text-sm text-muted-foreground mt-2'>
                      Showing {filteredRecipeMappings.length} of{' '}
                      {recipeMappings.length} recipe mappings
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recipe Mapping Suggestions */}
              <RecipeMappingSuggestions
                integrationId={selectedIntegration}
                integrationName={
                  integrations.find((i) => i.id === selectedIntegration)
                    ?.name || 'POS'
                }
                onMappingCreated={fetchRecipeMappings}
              />

              {/* Create Dialog */}
              <div className='flex w-full justify-end'>
                <Dialog
                  open={isRecipeMappingDialogOpen}
                  onOpenChange={setIsRecipeMappingDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className='size-4 mr-2' />
                      Create Recipe Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='max-w-full sm:max-w-md'>
                    <DialogHeader className='items-baseline'>
                      <DialogTitle>Create Recipe Mapping</DialogTitle>
                      <DialogDescription>
                        Map a POS cocktail/drink to a recipe
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      <div className='grid gap-2'>
                        <Label htmlFor='recipe'>Recipe</Label>
                        <Select
                          value={selectedRecipe}
                          onValueChange={setSelectedRecipe}
                        >
                          <SelectTrigger className='max-w-xs sm:max-w-sm'>
                            <SelectValue placeholder='Select recipe' />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.name} - $
                                {recipe.costPerServing?.toFixed(2) || '0.00'}
                                /serving
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='grid gap-2'>
                        <Label htmlFor='pos-product'>POS Product</Label>
                        <Select
                          value={selectedPOSProduct}
                          onValueChange={setSelectedPOSProduct}
                        >
                          <SelectTrigger className='max-w-xs sm:max-w-sm'>
                            <SelectValue placeholder='Select POS product' />
                          </SelectTrigger>
                          <SelectContent>
                            {unmappedPOSProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} {'=>'}{' '}
                                {product.category && `${product.category}`}{' '}
                                {product.price &&
                                  `$${product.price.toFixed(2)}`}
                                {product.sku && `(${product.sku})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateRecipeMapping}
                        disabled={
                          !selectedRecipe ||
                          !selectedPOSProduct ||
                          selectedRecipe.trim() === '' ||
                          selectedPOSProduct.trim() === ''
                        }
                      >
                        Create Mapping
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Recipe Mappings */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Recipe Mappings</CardTitle>
                  <CardDescription>
                    Active mappings between POS products and recipes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredRecipeMappings.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      {mappingSearch
                        ? 'No recipe mappings match your search.'
                        : 'No recipe mappings found. Map POS cocktails to recipes above.'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipe</TableHead>
                          <TableHead>POS Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='w-[100px]'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecipeMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell>
                              <div className='font-medium'>
                                {mapping.recipe?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='font-medium'>
                                {mapping.posProduct?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {mapping.posProduct?.category || '-'}
                            </TableCell>
                            <TableCell>
                              {mapping.posProduct?.price
                                ? `$${mapping.posProduct.price.toFixed(2)}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  mapping.isActive ? 'default' : 'secondary'
                                }
                              >
                                {mapping.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1'>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  onClick={() =>
                                    handleEditRecipeMapping(mapping)
                                  }
                                  title='Edit mapping'
                                >
                                  <Edit className='size-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  onClick={() =>
                                    handleDeleteRecipeMapping(mapping.id)
                                  }
                                  title='Delete mapping'
                                >
                                  <Trash2 className='size-4' />
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
            </TabsContent>
          </Tabs>

          {/* Unmapped POS Products */}
          <Card>
            <CardHeader>
              <CardTitle>Unmapped POS Products</CardTitle>
              <CardDescription>
                POS products that haven&apos;t been mapped to internal products
                yet
              </CardDescription>
              <div className='relative flex-1 max-w-sm min-w-2xs'>
                <Search className='absolute left-2 top-2.5 size-4 text-muted-foreground' />
                <Input
                  placeholder='Search POS products...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='text-center py-8'>
                  <HappyBarLoader />
                </div>
              ) : unmappedPOSProducts.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  {search
                    ? 'No unmapped POS products match your search.'
                    : 'All POS products are mapped!'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmappedPOSProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className='font-medium'>
                          {product.name}
                        </TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>
                          {product.category && (
                            <Badge variant='outline'>{product.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.price ? `$${product.price.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.isActive ? 'default' : 'secondary'}
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
