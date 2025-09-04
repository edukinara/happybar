'use client'

import { LocationFilter } from '@/components/dashboard/LocationFilter'
import { StockTransferDialog } from '@/components/inventory/stock-transfer-dialog'
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
  LocationAccessAlert,
  LocationAccessIndicator,
} from '@/components/ui/location-access-indicator'
import { Separator } from '@/components/ui/separator'
import { inventoryApi } from '@/lib/api/inventory'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { getProducts } from '@/lib/api/products'
import {
  stockTransfersApi,
  type StockMovement,
  type StockTransferRequest,
} from '@/lib/api/stock-transfers'
import { useAuth } from '@/lib/auth/auth-context'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  History,
  MapPin,
  Package,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { CustomPagination } from '@/components/ui/custom-pagination'
import type { InventoryLevel, InventoryProduct } from '@happy-bar/types'
import { format } from 'date-fns'
import pluralize from 'pluralize'
import { toast } from 'sonner'

export default function StockTransfersPage() {
  const { user } = useAuth()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>(
    []
  )
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const loadData = async () => {
    try {
      const [movementsRes, locationsRes, productsRes, inventoryRes] =
        await Promise.all([
          stockTransfersApi.getTransfers({
            page: currentPage,
            limit: itemsPerPage,
            locationId: selectedLocationId,
          }),
          locationsApi.getLocations(),
          getProducts(),
          inventoryApi.getInventoryLevels(),
        ])

      setMovements(movementsRes.movements)
      setTotalItems(movementsRes.pagination.total)
      setTotalPages(movementsRes.pagination.totalPages)
      setLocations(locationsRes || [])
      setProducts(productsRes.products || [])
      setInventoryItems(inventoryRes || [])
    } catch (error) {
      toast.error('Failed to load data')
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleTransfer = async (data: StockTransferRequest) => {
    await stockTransfersApi.createTransfer(data)
    // Refresh data after successful transfer - go to first page to see the new transfer
    setCurrentPage(1)
    setRefreshing(true)
    await loadData()
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className='size-4 text-green-500' />
      case 'PENDING':
        return <Clock className='size-4 text-yellow-500' />
      case 'IN_TRANSIT':
        return <ArrowRight className='size-4 text-blue-500' />
      default:
        return <AlertTriangle className='size-4 text-gray-500' />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500'
      case 'PENDING':
        return 'bg-yellow-500'
      case 'IN_TRANSIT':
        return 'bg-blue-500'
      case 'CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TRANSFER':
        return 'bg-blue-500'
      case 'ADJUSTMENT_IN':
        return 'bg-green-500'
      case 'ADJUSTMENT_OUT':
        return 'bg-red-500'
      case 'RECEIVED':
        return 'bg-purple-500'
      case 'SOLD':
        return 'bg-orange-500'
      case 'WASTE':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, currentPage, itemsPerPage, selectedLocationId])

  // Since we're now filtering on the backend, movements are the filtered movements
  useEffect(() => {
    setFilteredMovements(movements)
  }, [movements])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Don't render anything until user is loaded to prevent role access errors
  if (!user) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='size-8 animate-spin' />
        <span className='ml-2'>Loading...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='size-8 animate-spin' />
        <span className='ml-2'>Loading stock transfers...</span>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Location Access Alert */}
      <LocationAccessAlert />

      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Stock Transfers</h1>
          <p className='text-muted-foreground'>
            Manage inventory movements between locations
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <StockTransferDialog
            trigger={
              <Button>
                <Plus className='size-4 mr-2' />
                New Transfer
              </Button>
            }
            products={products}
            locations={locations}
            inventoryItems={inventoryItems}
            onTransfer={handleTransfer}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Transfers
            </CardTitle>
            <History className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalItems}</div>
            <p className='text-xs text-muted-foreground'>All time</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Active Locations
            </CardTitle>
            <MapPin className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {locations.filter((l) => l.isActive).length}
            </div>
            <p className='text-xs text-muted-foreground'>Receiving transfers</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Products Tracked
            </CardTitle>
            <Package className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{products.length}</div>
            <p className='text-xs text-muted-foreground'>
              Available for transfer
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Current Page</CardTitle>
            <ArrowRight className='size-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{filteredMovements.length}</div>
            <p className='text-xs text-muted-foreground'>
              Page {currentPage} of {totalPages}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card className='gap-2'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Recent Stock Movements</CardTitle>
              <CardDescription>
                Latest inventory transfers and adjustments
              </CardDescription>
            </div>
            <LocationAccessIndicator showDetails />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex justify-end mb-4'>
            <LocationFilter
              selectedLocationId={selectedLocationId}
              onLocationChange={setSelectedLocationId}
              placeholder='Filter by location'
            />
          </div>
          {filteredMovements.length === 0 ? (
            <div className='text-center py-8'>
              <ArrowRight className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
              <h3 className='text-lg font-medium mb-2'>
                {selectedLocationId
                  ? 'No transfers for this location'
                  : 'No transfers yet'}
              </h3>
              <p className='text-muted-foreground mb-4'>
                {selectedLocationId
                  ? 'No stock movements found for the selected location'
                  : 'Start by creating your first stock transfer between locations'}
              </p>
              <StockTransferDialog
                trigger={
                  <Button>
                    <Plus className='size-4 mr-2' />
                    Create First Transfer
                  </Button>
                }
                products={products}
                locations={locations}
                inventoryItems={inventoryItems}
                onTransfer={handleTransfer}
              />
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredMovements.map((movement) => (
                <div key={movement.id} className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center gap-2'>
                        {getStatusIcon(movement.status)}
                        <Badge
                          variant='outline'
                          className={`text-white ${getStatusColor(movement.status)}`}
                        >
                          {movement.status}
                        </Badge>
                      </div>
                      <Badge
                        variant='outline'
                        className={`text-white ${getTypeColor(movement.type)}`}
                      >
                        {movement.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {format(
                        new Date(movement.createdAt),
                        'MMM d, yyyy HH:mm'
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-3'>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Product:
                      </span>
                      <div className='flex items-center gap-2'>
                        <Package className='size-4' />
                        <span className='font-medium'>
                          {movement.product.name}
                        </span>
                        {movement.product.sku && (
                          <Badge variant='outline'>
                            {movement.product.sku}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className='text-sm text-muted-foreground'>
                        From → To:
                      </span>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>
                          {movement.fromLocation.name}
                        </span>
                        <ArrowRight className='size-4 text-muted-foreground' />
                        <span className='font-medium'>
                          {movement.toLocation.name}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Quantity:
                      </span>
                      <p className='font-medium'>
                        {movement.quantity}{' '}
                        {movement.product.container && movement.quantity > 1
                          ? pluralize(movement.product.container)
                          : movement.product.container || ''}
                      </p>
                    </div>
                  </div>

                  {movement.notes && (
                    <>
                      <Separator className='my-3' />
                      <div>
                        <span className='text-sm text-muted-foreground'>
                          Notes:
                        </span>
                        <p className='text-sm mt-1'>{movement.notes}</p>
                      </div>
                    </>
                  )}

                  <div className='flex items-center justify-between mt-3 pt-3 border-t'>
                    <div className='text-sm text-muted-foreground'>
                      Performed by: {movement.user.name}
                    </div>
                    {movement.completedAt && (
                      <div className='text-sm text-muted-foreground'>
                        Completed:{' '}
                        {format(
                          new Date(movement.completedAt),
                          'MMM d, yyyy HH:mm'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredMovements.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
