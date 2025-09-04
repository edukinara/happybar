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
import { inventoryApi } from '@/lib/api/inventory'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { getProducts } from '@/lib/api/products'
import { AlertTriangle, Package, Save, Search, Target } from 'lucide-react'
import Image from 'next/image'
import pluralize from 'pluralize'
import { useEffect, useState } from 'react'

interface ParLevelItem {
  id: string
  productId: string
  locationId: string
  currentQuantity: number
  minimumQuantity: number
  maximumQuantity?: number
  product: {
    id: string
    name: string
    sku?: string
    unit: string
    container?: string
    image?: string
    upc?: string
    category?: {
      id: string
      name: string
    }
  }
  location: {
    id: string
    name: string
  }
}

export default function ParLevelsPage() {
  const [items, setItems] = useState<ParLevelItem[]>([])
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false)
  const [bulkParLevel, setBulkParLevel] = useState<number>(0)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>(
    {}
  )

  useEffect(() => {
    Promise.all([fetchLocations(), fetchInventoryItems()])
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      fetchInventoryItems()
    }
  }, [selectedLocation])

  const fetchLocations = async () => {
    try {
      const data = await locationsApi.getLocations()
      setLocations(data)
      if (data.length === 1) {
        setSelectedLocation(data[0]!.id)
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchInventoryItems = async () => {
    try {
      setLoading(true)
      const [productsResponse, inventoryLevelsData] = await Promise.all([
        getProducts(),
        inventoryApi.getInventoryLevels(),
      ])
      const productsData = productsResponse.products

      // Create a map of existing inventory items by productId + locationId
      const inventoryMap = new Map()
      inventoryLevelsData.forEach((item) => {
        const key = `${item.productId}-${item.locationId}`
        inventoryMap.set(key, item)
      })

      // Get selected locations or all locations if 'all' is selected
      const targetLocations =
        selectedLocation === 'all' || !selectedLocation
          ? locations
          : locations.filter((loc) => loc.id === selectedLocation)

      // Create items for all product-location combinations
      const allItems: ParLevelItem[] = []

      for (const product of productsData) {
        for (const location of targetLocations) {
          const key = `${product.id}-${location.id}`
          const existingItem = inventoryMap.get(key)

          allItems.push({
            id: existingItem?.id || `new-${product.id}-${location.id}`, // Use 'new-' prefix for items that don't exist yet
            productId: product.id,
            locationId: location.id,
            currentQuantity: existingItem?.currentQuantity || 0,
            minimumQuantity: existingItem?.minimumQuantity || 0,
            maximumQuantity: existingItem?.maximumQuantity,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku || undefined,
              unit: product.unit,
              container: product.container || undefined,
              image: product.image || undefined,
              upc: product.upc || undefined,
              category: product.category ? {
                id: product.category.id,
                name: product.category.name,
              } : undefined,
            },
            location: {
              id: location.id,
              name: location.name,
            },
          })
        }
      }

      setItems(allItems)

      // Extract unique categories for filtering
      const uniqueCategories = new Map<string, {id: string, name: string}>()
      productsData.forEach(product => {
        if (product.category) {
          uniqueCategories.set(product.category.id, {
            id: product.category.id,
            name: product.category.name
          })
        }
      })
      setCategories(Array.from(uniqueCategories.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error('Failed to fetch inventory items:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateParLevel = (itemId: string, newParLevel: number) => {
    setPendingChanges((prev) => ({
      ...prev,
      [itemId]: newParLevel,
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkUpdate = async () => {
    try {
      setSaving(true)
      
      // Apply bulk update to all selected items
      const newChanges = { ...pendingChanges }
      selectedItems.forEach(itemId => {
        newChanges[itemId] = bulkParLevel
      })
      
      setPendingChanges(newChanges)
      setShowBulkUpdateDialog(false)
      setSelectedItems(new Set())
      setBulkParLevel(0)
    } catch (error) {
      console.error('Failed to apply bulk update:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveChanges = async () => {
    try {
      setSaving(true)

      const updatePromises = Object.entries(pendingChanges).map(
        ([itemId, parLevel]) => {
          // Check if this is a new item (has 'new-' prefix)
          if (itemId.startsWith('new-')) {
            // Extract productId and locationId from the itemId
            const [, productId, locationId] = itemId.split('-')
            return inventoryApi.createInventoryItem({
              productId: productId!,
              locationId: locationId!,
              minimumQuantity: parLevel,
            })
          } else {
            // Update existing item
            return inventoryApi.updateParLevel(itemId, parLevel)
          }
        }
      )

      await Promise.all(updatePromises)
      setPendingChanges({})
      await fetchInventoryItems() // Refresh data
    } catch (error) {
      console.error('Failed to save par level changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredItems = items.filter(
    (item) => {
      // Search filter
      const matchesSearch = item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.upc?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        item.product.category?.id === selectedCategory
      
      return matchesSearch && matchesCategory
    }
  )

  const hasChanges = Object.keys(pendingChanges).length > 0

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Calculate pagination values
  const totalItems = filteredItems.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems.length])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const getStockStatus = (
    current: number,
    parLevel: number
  ): {
    status: string
    color:
      | 'destructive'
      | 'default'
      | 'secondary'
      | 'outline'
      | null
      | undefined
    label: string
  } => {
    if (current === 0)
      return { status: 'out', color: 'destructive', label: 'Out of Stock' }
    if (current < parLevel * 0.5)
      return { status: 'critical', color: 'destructive', label: 'Critical' }
    if (current < parLevel)
      return { status: 'low', color: 'secondary', label: 'Below Par' }
    return { status: 'good', color: 'default', label: 'In Stock' }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Par Levels</h1>
        <p className='text-muted-foreground'>
          Set target inventory levels for each product by location
        </p>
      </div>

      {/* Controls */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col sm:flex-row gap-4'>
          <div className='flex-1 space-y-2'>
            <Label htmlFor='location'>Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder='Select a location' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex-1 space-y-2'>
            <Label htmlFor='category'>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder='Select category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex-1 space-y-2'>
            <Label htmlFor='search'>Search Products</Label>
            <div className='relative'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                id='search'
                placeholder='Search by name or SKU...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className='flex items-center gap-4 p-4 bg-muted rounded-lg'>
            <span className='text-sm font-medium'>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Target className='size-4 mr-2' />
                  Bulk Update Par Levels
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Update Par Levels</DialogTitle>
                  <DialogDescription>
                    Set the minimum quantity (par level) for {selectedItems.size} selected items.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='bulkParLevel'>Par Level</Label>
                    <Input
                      id='bulkParLevel'
                      type='number'
                      value={bulkParLevel}
                      onChange={(e) => setBulkParLevel(Number(e.target.value))}
                      placeholder='Enter par level'
                      min='0'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkUpdateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkUpdate} disabled={bulkParLevel < 0}>
                    Update {selectedItems.size} Items
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedItems(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {hasChanges && (
          <div className='flex items-center justify-end'>
            <Button onClick={saveChanges} disabled={saving}>
              <Save className='size-4 mr-2' />
              {saving
                ? 'Saving...'
                : `Save Changes (${Object.keys(pendingChanges).length})`}
            </Button>
          </div>
        )}
      </div>

      {/* Par Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Target className='size-5' />
            Par Level Management
          </CardTitle>
          <CardDescription>
            Set minimum quantities to maintain for each product. These levels
            are used as targets during inventory counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full size-8 border-b-2 border-primary'></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[50px]'>
                      <Checkbox
                        checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead />
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Par Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Max Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => {
                    const currentParLevel =
                      pendingChanges[item.id] ?? item.minimumQuantity
                    const stockStatus = getStockStatus(
                      item.currentQuantity,
                      currentParLevel
                    )

                    return (
                      <TableRow key={item.id}>
                        <TableCell className='w-[50px]'>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className='w-[34px] p-2'>
                          {item.product.image ? (
                            <div className='relative size-8 overflow-hidden'>
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                fill
                                className='object-contain'
                                sizes='40px'
                                onError={(_e) => {
                                  console.warn(
                                    `Failed to load image: ${item.product.image}`
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
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {item.product.name}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {item.product.sku &&
                                `SKU: ${item.product.sku} • `}
                              {item.product.container || 'unit'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.location.name}</TableCell>
                        <TableCell>
                          <div className='font-medium text-md'>
                            {+item.currentQuantity.toFixed(2)}{' '}
                            <span className='text-sm text-muted-foreground font-normal'>
                              {pluralize(
                                item.product.container || 'unit',
                                item.maximumQuantity
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            min='0'
                            step='0.1'
                            value={currentParLevel}
                            onChange={(e) =>
                              updateParLevel(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-20 font-semibold'
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='text-sm text-muted-foreground'>
                            {item.maximumQuantity
                              ? `${item.maximumQuantity} ${pluralize(item.product.container || 'unit', item.maximumQuantity)}`
                              : 'Not set'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-8'>
                        <AlertTriangle className='size-8 text-muted-foreground mx-auto mb-2' />
                        <p className='text-muted-foreground'>
                          {searchTerm
                            ? 'No products found matching your search.'
                            : 'No inventory items found. Add some products first.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
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
    </div>
  )
}
