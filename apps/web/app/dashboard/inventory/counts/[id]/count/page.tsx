'use client'

import { CountingInterface } from '@/components/inventory/CountingInterface'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { inventoryApi } from '@/lib/api/inventory'
import {
  type CountArea,
  type InventoryCountItem,
  type InventoryCountType,
  AreaStatus,
} from '@happy-bar/types'
import { ArrowLeft, CheckCircle, MapPin, Package, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface TransformedProduct {
  id: string
  name: string
  sku: string
  unit: string
  container: string
  unitSize: number
  expectedQty: number
  originalParLevel: number
  category?: string
}

export default function CountExecutionPage() {
  const params = useParams()
  const router = useRouter()
  const [count, setCount] = useState<InventoryCountType | null>(null)
  const [products, setProducts] = useState<TransformedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0)
  const [currentArea, setCurrentArea] = useState<CountArea | null>(null)
  const [countItems, setCountItems] = useState<
    Record<string, InventoryCountItem>
  >({})

  const countId = params.id as string

  const loadCountItemsForArea = (
    countData: InventoryCountType,
    areaIndex: number
  ) => {
    if (!countData.areas || areaIndex >= countData.areas.length) {
      setCountItems({})
      return
    }

    const currentArea = countData.areas[areaIndex]
    const areaCountItems: Record<string, InventoryCountItem> = {}

    if (currentArea?.items) {
      currentArea.items.forEach((item) => {
        areaCountItems[item.productId] = {
          id: item.id,
          areaId: currentArea.id,
          productId: item.productId,
          fullUnits: item.fullUnits,
          partialUnit: item.partialUnit,
          totalQuantity: item.totalQuantity,
          countedById: item.countedById || '',
          countedAt: item.countedAt || new Date(),
          notes: item.notes,
        }
      })
    }

    setCountItems(areaCountItems)
  }

  useEffect(() => {
    if (countId) {
      const loadData = async () => {
        try {
          setLoading(true)
          // First load the count to get location info
          const countData = await fetchCount()
          // Then load products with location-specific inventory levels
          await fetchProducts(countData?.locationId)
        } catch (error) {
          console.error('Failed to load count data:', error)
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [countId])

  const fetchCount = async () => {
    try {
      const data = await inventoryApi.getInventoryCount(countId)

      // If count is still in DRAFT status, update to IN_PROGRESS when starting to count
      let finalCount = data
      if (data.status === 'DRAFT') {
        const updatedCount = await inventoryApi.updateInventoryCount(countId, {
          status: 'IN_PROGRESS',
        })
        finalCount = updatedCount
      }

      setCount(finalCount)

      // Find the first area that's not completed yet
      let nextAreaIndex =
        finalCount.areas?.findIndex(
          (area) => area.status !== AreaStatus.COMPLETED
        ) ?? 0

      // If all areas are completed, stay on the last area for review
      if (
        nextAreaIndex === -1 &&
        finalCount.areas &&
        finalCount.areas.length > 0
      ) {
        nextAreaIndex = finalCount.areas.length - 1
      }

      setCurrentAreaIndex(nextAreaIndex)
      setCurrentArea(finalCount.areas?.[nextAreaIndex] || null)

      // Load existing count items for the current area
      loadCountItemsForArea(finalCount, nextAreaIndex)

      return finalCount
    } catch (apiError) {
      console.warn('API call failed:', apiError)
      throw apiError
    }
  }

  const fetchProducts = async (locationId?: string) => {
    try {
      const [productsData, inventoryLevels] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getInventoryLevels(),
      ])

      // Create a map of product ID to par level (minimumQuantity) for this location
      const parLevelMap: Map<string, number> = new Map()
      if (locationId) {
        inventoryLevels.forEach((level) => {
          if (level.locationId === locationId) {
            parLevelMap.set(level.productId, level.minimumQuantity)
          }
        })
      }

      // Transform inventory products to the format expected by CountingInterface
      const transformedProducts = productsData.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        unit: product.unit,
        container: product.container || 'unit',
        unitSize: product.unitSize || 1,
        expectedQty: parLevelMap.get(product.id) || 0,
        originalParLevel: parLevelMap.get(product.id) || 0,
        category: product.category?.name,
      }))
      setProducts(transformedProducts)
      return
    } catch (apiError) {
      console.warn('Failed to fetch products:', apiError)
      throw apiError
    }
  }

  // Calculate running total counts across completed areas for variance calculation
  const calculateRunningExpectedQty = (
    productId: string,
    originalParLevel: number
  ) => {
    if (!count?.areas) return originalParLevel

    // Sum up all counts from completed areas for this product
    let totalCountedInCompletedAreas = 0

    count.areas.forEach((area, index) => {
      // Only count completed areas, not the current area
      if (area.status === AreaStatus.COMPLETED && index !== currentAreaIndex) {
        const areaItems = area.items || []
        const productItem = areaItems.find(
          (item) => item.productId === productId
        )
        if (productItem) {
          totalCountedInCompletedAreas += productItem.totalQuantity
        }
      }
    })

    // Return the adjusted expected quantity: par level - already counted in completed areas
    return Math.max(0, originalParLevel - totalCountedInCompletedAreas)
  }

  // Get total counted in completed areas for a specific product
  const getCompletedAreasCount = (productId: string) => {
    if (!count?.areas) return 0

    let totalCountedInCompletedAreas = 0

    count.areas.forEach((area, index) => {
      // Only count completed areas, not the current area
      if (area.status === AreaStatus.COMPLETED && index !== currentAreaIndex) {
        const areaItems = area.items || []
        const productItem = areaItems.find(
          (item) => item.productId === productId
        )
        if (productItem) {
          totalCountedInCompletedAreas += productItem.totalQuantity
        }
      }
    })

    return totalCountedInCompletedAreas
  }

  const saveProgress = async () => {
    try {
      setSaving(true)

      if (!currentArea?.id) {
        throw new Error('No current area selected')
      }

      // Save all count items for the current area
      const savePromises = Object.values(countItems)
        .map((item) => {
          if (item.totalQuantity > 0) {
            // Only save items with actual counts
            return inventoryApi.saveCountItem(countId, {
              areaId: currentArea.id,
              productId: item.productId,
              fullUnits: item.fullUnits,
              partialUnit: item.partialUnit,
              notes: item.notes || undefined,
            })
          }
          return null
        })
        .filter(Boolean)

      await Promise.all(savePromises)
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const completeArea = async () => {
    try {
      setSaving(true)

      // Mark current area as completed
      if (currentArea?.id) {
        await inventoryApi.updateCountAreaStatus(
          countId,
          currentArea.id,
          AreaStatus.COMPLETED
        )

        // Save all count items for the current area
        const savePromises = Object.values(countItems)
          .map((item) => {
            if (item.totalQuantity > 0) {
              // Only save items with actual counts
              return inventoryApi.saveCountItem(countId, {
                areaId: currentArea.id,
                productId: item.productId,
                fullUnits: item.fullUnits,
                partialUnit: item.partialUnit,
                notes: item.notes || undefined,
              })
            }
            return null
          })
          .filter(Boolean)

        await Promise.all(savePromises)

        // Update the count state to reflect the completed area
        if (count) {
          const updatedCount = { ...count }
          const areaIndex = updatedCount.areas?.findIndex(
            (area) => area.id === currentArea.id
          )
          if (areaIndex !== undefined && areaIndex >= 0 && updatedCount.areas) {
            updatedCount.areas[areaIndex] = {
              ...updatedCount.areas[areaIndex],
              status: AreaStatus.COMPLETED,
            } as CountArea
            setCount(updatedCount)
          }
        }
      }

      // Move to next area or complete count
      if (currentAreaIndex < (count?.areas?.length || 0) - 1) {
        const nextAreaIndex = currentAreaIndex + 1
        setCurrentAreaIndex(nextAreaIndex)
        setCurrentArea(count?.areas?.[nextAreaIndex] || null)
        // Load count items for the next area
        if (count) {
          loadCountItemsForArea(count, nextAreaIndex)
        }
      } else {
        // All areas complete - update count status to COMPLETED
        await inventoryApi.updateInventoryCount(countId, {
          status: 'COMPLETED',
        })
        router.push(`/dashboard/inventory/counts/${countId}`)
      }
    } catch (error) {
      console.error('Failed to complete area:', error)
      alert('Failed to complete area. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p>Loading count session...</p>
        </div>
      </div>
    )
  }

  if (!count) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <Package className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Count session not found
          </h2>
          <p className='text-muted-foreground mb-4'>
            Unable to load the inventory count session. Please try again.
          </p>
          <Button asChild>
            <Link href='/dashboard/inventory/counts'>Back to Counts</Link>
          </Button>
        </div>
      </div>
    )
  }

  const progressPercent = count.areas
    ? ((currentAreaIndex + 1) / count.areas.length) * 100
    : 0

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' asChild>
            <Link href={`/dashboard/inventory/counts/${countId}`}>
              <ArrowLeft className='size-4 mr-2' />
              Back to Count
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Counting: {count.name}
            </h1>
            <div className='flex items-center gap-4 text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <MapPin className='size-4' />
                {count.location?.name}
              </div>
              <Badge variant='secondary'>
                Area {currentAreaIndex + 1} of {count.areas?.length || 0}
              </Badge>
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button variant='outline' onClick={saveProgress} disabled={saving}>
            <Save className='size-4 mr-2' />
            {saving ? 'Saving...' : 'Save Progress'}
          </Button>
          <Button onClick={completeArea} disabled={saving}>
            <CheckCircle className='size-4 mr-2' />
            Complete Area
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>
                {currentArea?.name || `Area ${currentAreaIndex + 1}`}
              </CardTitle>
              <CardDescription>
                Count all items in this area using the tenthing method
              </CardDescription>
            </div>
            <div className='text-right'>
              <div className='text-sm font-medium'>
                {Math.round(progressPercent)}% Complete
              </div>
              <div className='text-sm text-muted-foreground'>
                {currentAreaIndex + 1} of {count.areas?.length || 0} areas
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className='mt-2' />
        </CardHeader>
      </Card>

      {/* Counting Interface */}
      <div className='grid gap-6 lg:grid-cols-4'>
        {/* Product Counting */}
        <div className='lg:col-span-3'>
          <CountingInterface
            areaName={currentArea?.name || `Area ${currentAreaIndex + 1}`}
            products={products.map((product) => ({
              ...product,
              expectedQty: calculateRunningExpectedQty(
                product.id,
                product.expectedQty || 0
              ),
            }))}
            countItems={countItems}
            onQuantityChange={(productId, fullUnits, partialUnit) => {
              setCountItems((prev) => {
                const existing = prev[productId] || {
                  id: '',
                  areaId: currentArea?.id || '',
                  productId,
                  fullUnits: 0,
                  partialUnit: 0,
                  totalQuantity: 0,
                  countedById: '',
                  countedAt: new Date(),
                }

                const updated = {
                  ...existing,
                  fullUnits,
                  partialUnit,
                  totalQuantity: fullUnits + partialUnit,
                }

                return {
                  ...prev,
                  [productId]: updated,
                }
              })
            }}
            onNotesChange={(productId, notes) => {
              setCountItems((prev) => {
                const product = prev[productId]
                if (!product) {
                  return prev
                }

                return {
                  ...prev,
                  [productId]: {
                    ...product,
                    notes,
                  },
                }
              })
            }}
            onSave={saveProgress}
            onComplete={completeArea}
            saving={saving}
            getCompletedAreasCount={getCompletedAreasCount}
            getOriginalParLevel={(productId: string) => {
              const product = products.find((p) => p.id === productId)
              return product?.originalParLevel || 0
            }}
          />
        </div>

        {/* Instructions Panel */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Tenthing Method</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <div className='text-sm font-medium'>How to count:</div>
                <div className='text-sm text-muted-foreground space-y-1'>
                  <div>• Count full bottles/units</div>
                  <div>• Estimate partial units in 0.1 increments</div>
                  <div>• 0.5 = half full bottle</div>
                  <div>• 0.8 = 80% full bottle</div>
                </div>
              </div>
              <Separator />
              <div className='space-y-2'>
                <div className='text-sm font-medium'>Tips:</div>
                <div className='text-sm text-muted-foreground space-y-1'>
                  <div>• Be consistent with estimations</div>
                  <div>• Double-check high-value items</div>
                  <div>• Save progress frequently</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Area Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {count.areas?.map((area, index) => {
                  const isCompleted = area.status === AreaStatus.COMPLETED
                  const isCurrent = index === currentAreaIndex
                  // const isPending = !isCompleted && !isCurrent

                  return (
                    <div key={area.id} className='flex items-center gap-3'>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isCompleted
                            ? 'bg-green-100 text-green-700'
                            : isCurrent
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <div
                        className={`text-sm ${
                          isCurrent
                            ? 'font-medium'
                            : isCompleted
                              ? 'text-green-700'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {area.name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
