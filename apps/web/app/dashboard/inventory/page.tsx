'use client'

import { TransactionHistoryDrawer } from '@/components/dashboard/Inventory/TransactionHistoryDrawer'
import { LocationFilter } from '@/components/dashboard/LocationFilter'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { InputWithIcon } from '@/components/InputWithIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CustomPagination } from '@/components/ui/custom-pagination'
import {
  LocationAccessAlert,
  LocationAccessIndicator,
} from '@/components/ui/location-access-indicator'
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
import { useInventory } from '@/lib/queries'
import { useSelectedLocation } from '@/lib/stores'
import { cn } from '@/lib/utils'
import type { InventoryLevel } from '@happy-bar/types'
import {
  AlertTriangle,
  DollarSign,
  MapPin,
  Package,
  Search,
} from 'lucide-react'
import Image from 'next/image'
import pluralize from 'pluralize'
import { useEffect, useMemo, useState } from 'react'

export default function InventoryPage() {
  // Use query hooks for data fetching
  const { data: inventory = [], isLoading: loading, error } = useInventory()

  // Use global location state
  const { selectedLocationId } = useSelectedLocation()

  const [searchTerm, setSearchTerm] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filtered inventory using useMemo for performance
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.category.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.location.name.toLowerCase().includes(searchTerm.toLowerCase())

      // Location filter
      const matchesLocation =
        !selectedLocationId || item.locationId === selectedLocationId

      return matchesSearch && matchesLocation
    })
  }, [inventory, searchTerm, selectedLocationId])

  // Calculate pagination values
  const totalItems = filteredInventory.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredInventory.length])
  const [currentItem, setCurrentItem] = useState<InventoryLevel>()
  const [historyOpen, setHistoryOpen] = useState(false)

  const toggleOpen = (open: boolean) => {
    setHistoryOpen(open)
    if (!open) {
      setCurrentItem(undefined)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Remove fetchInventory - now handled by query hooks

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= 0)
      return {
        label: 'Out of Stock',
        color: 'bg-red-100 text-red-800',
        textColor: 'text-red-600',
      }
    if (current < minimum)
      return {
        label: 'Low Stock',
        color: 'bg-yellow-100 text-yellow-800',
        textColor: 'text-yellow-600',
      }
    return {
      label: 'In Stock',
      color: 'bg-green-100 text-green-800',
      textColor: 'text-green-600',
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <HappyBarLoader className='p-16' text='Loading inventory data...' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Failed to load inventory
          </h2>
          <p className='text-muted-foreground mb-4'>
            {error?.message || 'Unknown error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Location Access Alert */}
      <LocationAccessAlert />

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='brand-card'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Items</CardTitle>
            <Package className='size-4 brand-icon-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold brand-text-gradient'>
              {totalItems}
            </div>
            <p className='text-xs text-muted-foreground'>
              {selectedLocationId
                ? 'Items in selected location'
                : 'Total inventory items'}
            </p>
          </CardContent>
        </Card>

        <Card className='brand-card'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Low Stock</CardTitle>
            <AlertTriangle className='size-4 brand-icon-accent' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {
                filteredInventory.filter(
                  (item) => item.currentQuantity < item.minimumQuantity
                ).length
              }
            </div>
            <p className='text-xs text-muted-foreground'>
              Items below par or out of stock
            </p>
          </CardContent>
        </Card>

        <Card className='brand-card'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Restock Cost</CardTitle>
            <DollarSign className='size-4 brand-icon-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold brand-text-gradient'>
              $
              {filteredInventory
                .filter((item) => item.currentQuantity < item.minimumQuantity)
                .reduce(
                  (a, i) =>
                    a +
                    (i.minimumQuantity - i.currentQuantity) *
                      i.product.costPerUnit,
                  0
                )
                .toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
            </div>
            <p className='text-xs text-muted-foreground'>
              Cost to get low stock items back to par
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className='brand-card'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='brand-text-gradient'>
                Inventory Items
              </CardTitle>
              <CardDescription>
                View and manage inventory levels for all products
              </CardDescription>
            </div>
            <LocationAccessIndicator showDetails />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap items-center justify-between mb-4 w-full gap-2'>
            <div className='flex items-center space-x-2 w-full sm:max-w-sm'>
              <InputWithIcon
                Icon={Search}
                iconStyle='size-4 text-muted-foreground'
                containerStyle='w-full xs:max-w-full md:max-w-sm'
                placeholder='Search by product name, SKU, category, or location...'
                onChange={(e) => setSearchTerm(e.target.value)}
                className='md:max-w-sm xs:w-full xs:max-w-full'
              />
            </div>
            <LocationFilter useGlobalState={true} />
          </div>

          {totalItems === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              {searchTerm
                ? 'No items match your search.'
                : 'No inventory items found.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInventory.map((item) => {
                    const status = getStockStatus(
                      item.currentQuantity,
                      item.minimumQuantity
                    )
                    const totalValue =
                      item.currentQuantity * item.product.costPerUnit

                    const parDiff = item.currentQuantity - item.minimumQuantity

                    return (
                      <TableRow
                        key={item.id}
                        className='cursor-pointer'
                        onClick={() => {
                          setCurrentItem(item)
                          toggleOpen(true)
                        }}
                      >
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
                        <TableCell className='max-w-0'>
                          <TooltipProvider>
                            <Tooltip delayDuration={500}>
                              <TooltipTrigger asChild>
                                <div className='font-medium truncate'>
                                  {item.product.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.product.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className='w-[100px]'>
                          {item.product.category.name}
                        </TableCell>
                        <TableCell className='max-w-0'>
                          <TooltipProvider>
                            <Tooltip delayDuration={500}>
                              <TooltipTrigger asChild>
                                <div className='flex flex-row items-center gap-0.5'>
                                  <MapPin className='size-4 text-muted-foreground' />
                                  <div className='truncate'>
                                    {item.location.name}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.location.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className='w-[100px]'>
                          <div>
                            <div className='flex flex-row items-center gap-1'>
                              <p className={cn('text-md font-semibold')}>
                                {+item.currentQuantity.toFixed(2)}{' '}
                              </p>
                              <p className='text-xs font-medium text-muted-foreground'>
                                {pluralize(
                                  item.product.container || 'unit',
                                  item.currentQuantity
                                )}
                              </p>
                            </div>
                            <div
                              className={cn(
                                'text-[10px] text-muted-foreground font-semibold',
                                parDiff < 0 ? 'text-red-600' : 'text-green-600'
                              )}
                            >
                              {parDiff === 0
                                ? 'On Target'
                                : parDiff > 0
                                  ? `+${+parDiff.toFixed(2)} over`
                                  : `${+Math.abs(parDiff).toFixed(2)} under`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='w-[100px]'>
                          ${item.product.costPerUnit.toFixed(2)}
                        </TableCell>
                        <TableCell className='w-[100px]'>
                          ${totalValue.toFixed(2)}
                        </TableCell>
                        <TableCell className='w-[100px]'>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground w-[100px]'>
                          {item.lastCountDate
                            ? new Date(item.lastCountDate).toLocaleDateString()
                            : 'Never'}
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
          {currentItem && historyOpen ? (
            <TransactionHistoryDrawer
              inventoryItem={currentItem}
              open={historyOpen}
              setOpen={toggleOpen}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
