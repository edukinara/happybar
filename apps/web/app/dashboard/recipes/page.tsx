'use client'

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
import { inventoryApi } from '@/lib/api/inventory'
import { recipesApi } from '@/lib/api/recipes'
import type {
  CreateRecipeRequest,
  InventoryProduct,
  Recipe,
} from '@happy-bar/types'
import {
  ChefHat,
  DollarSign,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const [formData, setFormData] = useState<CreateRecipeRequest>({
    name: '',
    yield: 1,
    isActive: true,
    items: [],
  })

  const [newIngredient, setNewIngredient] = useState({
    productId: '',
    quantity: 0,
    displayQuantity: 0, // What the user enters (e.g., 60ml)
  })

  useEffect(() => {
    fetchData()
  }, [pagination.page, searchTerm])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [recipesData, productsData] = await Promise.all([
        recipesApi.getRecipes({
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
        }),
        inventoryApi.getProducts(),
      ])

      setRecipes(recipesData.recipes)
      setPagination(recipesData.pagination)
      setProducts(productsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || formData.items.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await recipesApi.createRecipe(formData)
      toast.success('Recipe created successfully')
      setShowCreateDialog(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Failed to create recipe:', error)
      toast.error('Failed to create recipe')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRecipe || !formData.name || formData.items.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await recipesApi.updateRecipe(editingRecipe.id, formData)
      toast.success('Recipe updated successfully')
      setEditingRecipe(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Failed to update recipe:', error)
      toast.error('Failed to update recipe')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      return
    }

    try {
      await recipesApi.deleteRecipe(recipe.id)
      toast.success('Recipe deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Failed to delete recipe:', error)
      toast.error('Failed to delete recipe')
    }
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormData({
      name: recipe.name,
      yield: recipe.yield,
      isActive: recipe.isActive,
      items: recipe.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity, // This is already the fractional quantity from the database
      })),
    })
    setShowCreateDialog(true)
  }

  const addIngredient = () => {
    if (!newIngredient.productId || newIngredient.displayQuantity <= 0) {
      toast.error('Please select a product and enter a positive quantity')
      return
    }

    // Check if ingredient already exists
    const exists = formData.items.some(
      (item) => item.productId === newIngredient.productId
    )
    if (exists) {
      toast.error('This ingredient is already added')
      return
    }

    // Get the selected product to calculate the fraction
    const selectedProduct = products.find(
      (p) => p.id === newIngredient.productId
    )
    if (!selectedProduct) {
      toast.error('Product not found')
      return
    }

    // Calculate the fraction: displayQuantity / productUnitQuantity
    const fractionalQuantity =
      newIngredient.displayQuantity / selectedProduct.unitSize

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: newIngredient.productId,
          quantity: fractionalQuantity,
        },
      ],
    })
    setNewIngredient({ productId: '', quantity: 0, displayQuantity: 0 })
  }

  const removeIngredient = (productId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item) => item.productId !== productId),
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      yield: 1,
      isActive: true,
      items: [],
    })
    setNewIngredient({ productId: '', quantity: 0, displayQuantity: 0 })
    setEditingRecipe(null)
  }

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    return product
      ? `${product.name} (${product.unitSize}${product.unit})`
      : 'Unknown Product'
  }

  const getDisplayQuantity = (item: {
    productId: string
    quantity: number
  }) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return item.quantity.toString()

    // Convert back to display quantity: fractionalQuantity * productUnitSize
    const displayAmount = item.quantity * product.unitSize
    return `${+displayAmount.toFixed(2)}${product.unit}`
  }

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappBarLoader />
      </div>
    )
  }

  return (
    <div className='min-h-screen brand-gradient relative'>
      {/* Floating orbs */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='brand-orb-accent w-96 h-96 absolute -top-20 -left-20 animate-float' />
        <div className='brand-orb-primary w-80 h-80 absolute top-64 -right-20 animate-float-reverse' />
        <div className='brand-orb-accent w-64 h-64 absolute bottom-48 left-1/2 animate-float' />
      </div>

      <div className='relative z-10 p-6 space-y-6'>
        {/* Page Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
              Recipe Management
            </h1>
            <p className='text-muted-foreground'>
              Create and manage cocktail recipes for accurate inventory
              tracking.
            </p>
          </div>

          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open)
              if (!open) {
                resetForm()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className='btn-brand-primary'>
                <Plus className='mr-2 h-4 w-4' />
                New Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>
                  {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
                </DialogTitle>
                <DialogDescription>
                  {editingRecipe
                    ? 'Update the recipe details and ingredients.'
                    : 'Create a new recipe with ingredients for accurate cost tracking.'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={
                  editingRecipe ? handleUpdateRecipe : handleCreateRecipe
                }
                className='space-y-6'
              >
                {/* Basic Details */}
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Recipe Name *</Label>
                    <Input
                      id='name'
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder='e.g., Manhattan, Moscow Mule'
                      required
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='yield'>Yield (servings) *</Label>
                    <Input
                      id='yield'
                      type='number'
                      min='0.1'
                      step='0.1'
                      value={formData.yield}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yield: parseFloat(e.target.value) || 1,
                        })
                      }
                      placeholder='1'
                      required
                    />
                  </div>
                </div>

                {/* Add Ingredient */}
                <div className='space-y-4'>
                  <Label>Add Ingredients</Label>
                  <div className='flex gap-2'>
                    <div className='flex-1'>
                      <Select
                        value={newIngredient.productId}
                        onValueChange={(value) =>
                          setNewIngredient({
                            ...newIngredient,
                            productId: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select product' />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                            .filter(
                              (product) =>
                                !formData.items.some(
                                  (item) => item.productId === product.id
                                )
                            )
                            .map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.unitSize}
                                {product.unit})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='flex flex-col'>
                      <Input
                        type='number'
                        min='0.01'
                        step='0.01'
                        value={newIngredient.displayQuantity || ''}
                        onChange={(e) =>
                          setNewIngredient({
                            ...newIngredient,
                            displayQuantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder={`Amount${newIngredient.productId ? ` (${products.find((p) => p.id === newIngredient.productId)?.unit || ''})` : ''}`}
                        className='w-32'
                      />
                      {newIngredient.productId &&
                        newIngredient.displayQuantity > 0 && (
                          <span className='text-xs text-muted-foreground mt-1'>
                            ={' '}
                            {(
                              (newIngredient.displayQuantity /
                                (products.find(
                                  (p) => p.id === newIngredient.productId
                                )?.unitSize || 1)) *
                              100
                            ).toFixed(1)}
                            % of unit
                          </span>
                        )}
                    </div>
                    <Button type='button' onClick={addIngredient} size='sm'>
                      <Plus className='h-4 w-4' />
                    </Button>
                  </div>
                </div>

                {/* Ingredients List */}
                {formData.items.length > 0 && (
                  <div className='space-y-2'>
                    <Label>Recipe Ingredients ({formData.items.length})</Label>
                    <div className='border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto'>
                      {formData.items.map((item) => (
                        <div
                          key={item.productId}
                          className='flex items-center justify-between py-2 px-3 bg-muted rounded-lg'
                        >
                          <div>
                            <span className='font-medium'>
                              {getProductName(item.productId)}
                            </span>
                            <span className='ml-2 text-sm text-muted-foreground'>
                              {getDisplayQuantity(item)}
                            </span>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removeIngredient(item.productId)}
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    className='btn-brand-primary'
                    loading={submitting}
                  >
                    {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <Card className='brand-card'>
          <CardContent className='pt-0'>
            <div className='flex items-center space-x-2'>
              <Search className='h-4 w-4 brand-icon-primary' />
              <Input
                placeholder='Search recipes...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='max-w-sm'
              />
            </div>
          </CardContent>
        </Card>

        {/* Recipes Table */}
        <Card className='brand-card'>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <ChefHat className='mr-2 h-5 w-5 brand-icon-accent' />
              Recipes ({recipes.length})
            </CardTitle>
            <CardDescription>
              Manage your cocktail and menu item recipes for accurate cost
              tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecipes.length === 0 ? (
              <div className='text-center py-12'>
                <ChefHat className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                <h3 className='text-lg font-semibold mb-2'>No Recipes Found</h3>
                <p className='text-muted-foreground mb-4'>
                  {searchTerm
                    ? 'No recipes match your search criteria.'
                    : 'Create your first recipe to start tracking ingredient costs.'}
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className='btn-brand-primary'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Create First Recipe
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Name</TableHead>
                    <TableHead>Ingredients</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Cost/Serving</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='w-[100px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className='font-medium'>
                        {recipe.name}
                      </TableCell>
                      <TableCell>{recipe.items.length} ingredients</TableCell>
                      <TableCell>{recipe.yield}</TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <DollarSign className='h-4 w-4 mr-1 brand-icon-accent' />
                          {recipe.totalCost?.toFixed(2) || '0.00'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <DollarSign className='h-4 w-4 mr-1 brand-icon-accent' />
                          {recipe.costPerServing?.toFixed(2) || '0.00'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            recipe.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {recipe.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditRecipe(recipe)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleDeleteRecipe(recipe)}
                            className='text-red-600 hover:text-red-700'
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
    </div>
  )
}
