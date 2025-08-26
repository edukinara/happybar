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
  ordersApi,
  type CreateOrderRequest,
  type OrderSuggestion,
} from '@/lib/api/orders'
import {
  DollarSign,
  Eye,
  MapPin,
  Package,
  RefreshCw,
  Send,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import pluralize from 'pluralize'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface SelectedItem {
  productId: string
  quantity: number
  unitCost: number
  orderingUnit?: 'UNIT' | 'CASE'
  totalCost?: number
  packSize?: number | null
}

interface SelectedSuggestion {
  supplierId: string
  items: SelectedItem[]
}

export default function OrderSuggestionsPage() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<OrderSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<
    Record<string, SelectedSuggestion>
  >({})

  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const response = await ordersApi.getReorderSuggestions()
      setSuggestions(response.data)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
      toast.error('Failed to load reorder suggestions')
    } finally {
      setLoading(false)
    }
  }

  const toggleSupplierSelection = (
    supplierId: string,
    suggestion: OrderSuggestion
  ) => {
    setSelectedSuggestions((prev) => {
      const newSelections = { ...prev }

      if (newSelections[supplierId]) {
        // Remove supplier from selection
        delete newSelections[supplierId]
      } else {
        // Add supplier with all items
        newSelections[supplierId] = {
          supplierId,
          items: suggestion.items.map((item) => ({
            productId: item.product.id,
            quantity: item.suggestedQuantity,
            unitCost: item.unitCost,
            orderingUnit: item.orderingUnit,
          })),
        }
      }

      return newSelections
    })
  }

  const toggleItemSelection = (
    supplierId: string,
    productId: string,
    item: OrderSuggestion['items'][0]
  ) => {
    setSelectedSuggestions((prev) => {
      const newSelections = { ...prev }

      if (!newSelections[supplierId]) {
        newSelections[supplierId] = { supplierId, items: [] }
      }

      const existingItemIndex = newSelections[supplierId].items.findIndex(
        (i) => i.productId === productId
      )

      if (existingItemIndex >= 0) {
        // Remove item
        newSelections[supplierId].items.splice(existingItemIndex, 1)
        // Remove supplier if no items left
        if (newSelections[supplierId].items.length === 0) {
          delete newSelections[supplierId]
        }
      } else {
        // Add item
        newSelections[supplierId].items.push({
          productId,
          quantity: item.suggestedQuantity,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit,
        })
      }

      return newSelections
    })
  }

  const updateItemQuantity = (
    supplierId: string,
    productId: string,
    quantity: number
  ) => {
    setSelectedSuggestions((prev) => {
      const newSelections = { ...prev }
      if (newSelections[supplierId]) {
        const item = newSelections[supplierId].items.find(
          (i) => i.productId === productId
        )
        if (item) {
          item.quantity = quantity
        }
      }
      return newSelections
    })
  }

  const updateItemOrderingUnit = (
    supplierId: string,
    productId: string,
    orderingUnit: 'UNIT' | 'CASE',
    suggestion: OrderSuggestion,
    item: OrderSuggestion['items'][0]
  ) => {
    setSelectedSuggestions((prev) => {
      const newSelections = { ...prev }
      if (newSelections[supplierId]) {
        const selectedItem = newSelections[supplierId].items.find(
          (i) => i.productId === productId
        )
        if (selectedItem) {
          selectedItem.orderingUnit = orderingUnit

          // Recalculate quantity and cost based on new ordering unit
          const quantityNeeded = item.minimumQuantity - item.currentQuantity
          const preferredSupplier = suggestion.items.find(
            (i) => i.product.id === productId
          )

          if (preferredSupplier) {
            if (
              orderingUnit === 'CASE' &&
              preferredSupplier.product.costPerCase &&
              preferredSupplier.packSize
            ) {
              // When switching to case ordering, calculate cases needed
              const casesNeeded = Math.ceil(
                quantityNeeded / preferredSupplier.packSize
              )
              selectedItem.quantity = Math.max(casesNeeded, 1)
              selectedItem.unitCost = preferredSupplier.product.costPerCase
              selectedItem.totalCost =
                selectedItem.quantity * selectedItem.unitCost
            } else if (
              orderingUnit === 'UNIT' &&
              preferredSupplier.product.costPerUnit
            ) {
              // When switching to unit ordering, use unit quantities
              selectedItem.quantity = Math.ceil(Math.max(quantityNeeded, 1))
              selectedItem.unitCost = preferredSupplier.product.costPerUnit

              // If there's a pack size, round up to full packs for unit ordering
              if (
                preferredSupplier.packSize &&
                preferredSupplier.packSize > 1
              ) {
                selectedItem.quantity =
                  Math.ceil(
                    selectedItem.quantity / preferredSupplier.packSize
                  ) * preferredSupplier.packSize
              }

              selectedItem.totalCost =
                selectedItem.quantity * selectedItem.unitCost
            }

            // Update pack size reference for consistency
            selectedItem.packSize = preferredSupplier.packSize
          }
        }
      }
      return newSelections
    })
  }

  const isSupplierSelected = (
    supplierId: string,
    suggestion: OrderSuggestion
  ) => {
    const selection = selectedSuggestions[supplierId]
    return selection && selection.items.length === suggestion.items.length
  }

  const isItemSelected = (supplierId: string, productId: string) => {
    return (
      selectedSuggestions[supplierId]?.items.some(
        (item) => item.productId === productId
      ) || false
    )
  }

  const getSelectedQuantity = (supplierId: string, productId: string) => {
    return (
      selectedSuggestions[supplierId]?.items.find(
        (item) => item.productId === productId
      )?.quantity || 0
    )
  }

  const getSelectedOrderingUnit = (supplierId: string, productId: string) => {
    return (
      selectedSuggestions[supplierId]?.items.find(
        (item) => item.productId === productId
      )?.orderingUnit || 'UNIT'
    )
  }

  const getSelectedUnitCost = (supplierId: string, productId: string) => {
    return (
      selectedSuggestions[supplierId]?.items.find(
        (item) => item.productId === productId
      )?.unitCost || 0
    )
  }

  const createSelectedOrders = async () => {
    const selectedCount = Object.keys(selectedSuggestions).length
    if (selectedCount === 0) {
      toast.error('Please select at least one supplier to create orders')
      return
    }

    try {
      setCreating(true)
      const orders: CreateOrderRequest[] = Object.values(
        selectedSuggestions
      ).map((selection) => ({
        supplierId: selection.supplierId,
        notes: 'Generated from reorder suggestions',
        items: selection.items.map((item) => ({
          productId: item.productId,
          quantityOrdered: item.quantity,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit,
        })),
      }))

      // Create all orders
      const createdOrders = await Promise.all(
        orders.map((order) => ordersApi.createOrder(order))
      )

      toast.success(
        `Created ${createdOrders.length} order${createdOrders.length === 1 ? '' : 's'} successfully`
      )
      router.push('/dashboard/orders')
    } catch (error) {
      console.error('Failed to create orders:', error)
      toast.error('Failed to create orders')
    } finally {
      setCreating(false)
    }
  }

  const getTotalSelectedCost = () => {
    return Object.values(selectedSuggestions).reduce(
      (total, selection) =>
        total +
        selection.items.reduce(
          (itemTotal, item) => itemTotal + item.quantity * item.unitCost,
          0
        ),
      0
    )
  }

  const getTotalSelectedItems = () => {
    return Object.values(selectedSuggestions).reduce(
      (total, selection) => total + selection.items.length,
      0
    )
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='h-8 w-8 animate-spin mr-2' />
        <span>Loading reorder suggestions...</span>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Reorder Suggestions
          </h1>
          <p className='text-muted-foreground'>
            Smart recommendations based on current inventory levels and stock
            thresholds
          </p>
          <p className='text-warning'>
            For accurate suggestions, make sure products have a preffered
            supplier defined
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={loadSuggestions}
            disabled={loading}
          >
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
          <Button variant='outline' asChild>
            <Link href='/dashboard/orders'>
              <Eye className='h-4 w-4 mr-2' />
              View Orders
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      {Object.keys(selectedSuggestions).length > 0 && (
        <Card className='border-green-200 bg-green-50'>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <ShoppingCart className='h-6 w-6 text-green-600' />
                <div>
                  <h3 className='font-semibold text-green-900'>
                    {Object.keys(selectedSuggestions).length} supplier
                    {Object.keys(selectedSuggestions).length === 1
                      ? ''
                      : 's'}{' '}
                    selected
                  </h3>
                  <p className='text-sm text-green-700'>
                    {getTotalSelectedItems()} items • Total: $
                    {getTotalSelectedCost().toFixed(2)}
                  </p>
                </div>
              </div>
              <Button onClick={createSelectedOrders} disabled={creating}>
                <Send className='h-4 w-4 mr-2' />
                {creating ? 'Creating...' : 'Create Orders'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className='py-12'>
            <div className='text-center'>
              <Package className='h-12 w-12 mx-auto mb-4 text-green-500' />
              <h3 className='text-lg font-medium text-green-600 mb-2'>
                All inventory levels look good!
              </h3>
              <p className='text-muted-foreground mb-4'>
                No products are currently below their minimum stock levels.
              </p>
              <Button asChild variant='outline'>
                <Link href='/dashboard/inventory'>
                  <Package className='h-4 w-4 mr-2' />
                  View Inventory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-6'>
          {suggestions.map((suggestion) => {
            const isSelected = isSupplierSelected(
              suggestion.supplier.id,
              suggestion
            )

            return (
              <Card
                key={suggestion.supplier.id}
                className={isSelected ? 'border-blue-200 bg-blue-50' : ''}
              >
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleSupplierSelection(
                            suggestion.supplier.id,
                            suggestion
                          )
                        }
                      />
                      <div>
                        <CardTitle className='flex items-center gap-2'>
                          {suggestion.supplier.name}
                          <Badge variant='outline'>
                            {suggestion.items.length} item
                            {suggestion.items.length === 1 ? '' : 's'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Estimated total: $
                          {suggestion.totalEstimatedCost.toFixed(2)}
                        </CardDescription>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <DollarSign className='h-4 w-4' />
                      <span>${suggestion.totalEstimatedCost.toFixed(2)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Minimum</TableHead>
                        <TableHead>Suggested Qty</TableHead>
                        <TableHead>Ordering Unit</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Est. Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestion.items.map((item) => {
                        const itemSelected = isItemSelected(
                          suggestion.supplier.id,
                          item.product.id
                        )
                        const selectedQuantity = getSelectedQuantity(
                          suggestion.supplier.id,
                          item.product.id
                        )
                        const selectedOrderingUnit = getSelectedOrderingUnit(
                          suggestion.supplier.id,
                          item.product.id
                        )
                        const selectedUnitCost = getSelectedUnitCost(
                          suggestion.supplier.id,
                          item.product.id
                        )

                        return (
                          <TableRow
                            key={item.product.id}
                            className={itemSelected ? 'bg-blue-50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={itemSelected}
                                onCheckedChange={() =>
                                  toggleItemSelection(
                                    suggestion.supplier.id,
                                    item.product.id,
                                    item
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className='font-medium'>
                                  {item.product.name}
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                  {item.product.sku &&
                                    `SKU: ${item.product.sku} • `}
                                  {item.product.category.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1'>
                                <MapPin className='h-3 w-3 text-muted-foreground' />
                                <span className='text-sm'>
                                  {item.location.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  item.currentQuantity <= 0
                                    ? 'text-red-600 font-medium'
                                    : ''
                                }
                              >
                                {item.currentQuantity.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.minimumQuantity.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {itemSelected ? (
                                <Input
                                  type='number'
                                  min='1'
                                  step='1'
                                  value={selectedQuantity}
                                  onChange={(e) =>
                                    updateItemQuantity(
                                      suggestion.supplier.id,
                                      item.product.id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className='w-20'
                                />
                              ) : (
                                <div className='items-center flex flex-row'>
                                  <span className='font-bold pr-1.5 text-foreground text-lg'>
                                    {item.suggestedQuantity}
                                  </span>
                                  {item.orderingUnit
                                    ? item.suggestedQuantity > 1
                                      ? pluralize(
                                          item.orderingUnit?.toLowerCase()
                                        )
                                      : item.orderingUnit?.toLowerCase()
                                    : item.suggestedQuantity > 1
                                      ? pluralize('item')
                                      : 'item'}
                                  {item.orderingUnit === 'CASE' &&
                                  item.packSize ? (
                                    <span className='text-muted-foreground pl-1.5'>
                                      ({item.packSize * item.suggestedQuantity}{' '}
                                      units)
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {itemSelected && item.packSize ? (
                                <Select
                                  value={selectedOrderingUnit}
                                  onValueChange={(value: 'UNIT' | 'CASE') =>
                                    updateItemOrderingUnit(
                                      suggestion.supplier.id,
                                      item.product.id,
                                      value,
                                      suggestion,
                                      item
                                    )
                                  }
                                >
                                  <SelectTrigger className='w-24'>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='UNIT'>Unit</SelectItem>
                                    <SelectItem value='CASE'>
                                      Case ({item.packSize} units)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='text-xs w-fit'
                                >
                                  {(itemSelected
                                    ? selectedOrderingUnit
                                    : item.orderingUnit) === 'CASE'
                                    ? 'Case'
                                    : 'Units'}
                                  {item.packSize &&
                                    (itemSelected
                                      ? selectedOrderingUnit
                                      : item.orderingUnit) === 'CASE' && (
                                      <span className='ml-0'>
                                        ({item.packSize})
                                      </span>
                                    )}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              $
                              {(itemSelected
                                ? selectedUnitCost
                                : item.unitCost
                              ).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              $
                              {(itemSelected
                                ? selectedQuantity * selectedUnitCost
                                : item.estimatedCost
                              ).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
