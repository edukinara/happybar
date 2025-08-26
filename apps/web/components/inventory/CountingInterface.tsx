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
import { Input } from '@/components/ui/input'
import type { InventoryCountItem } from '@happy-bar/types'
import {
  AlertTriangle,
  CheckCircle,
  Save,
  ScanLine,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { BottleSlider } from './BottleSlider'

interface Product {
  id: string
  name: string
  sku?: string
  unit: string
  container?: string
  unitSize: number
  expectedQty?: number
  originalParLevel?: number
  category?: string
}

interface CountingInterfaceProps {
  areaName: string
  products: Product[]
  countItems: Record<string, InventoryCountItem>
  onQuantityChange: (
    productId: string,
    fullUnits: number,
    partialUnit: number
  ) => void
  onNotesChange: (productId: string, notes: string) => void
  onSave: () => void
  onComplete: () => void
  saving?: boolean
  getCompletedAreasCount?: (productId: string) => number
  getOriginalParLevel?: (productId: string) => number
}

export function CountingInterface({
  areaName,
  products,
  countItems,
  onQuantityChange,
  onNotesChange,
  onSave,
  onComplete,
  saving = false,
  getCompletedAreasCount,
  getOriginalParLevel,
}: CountingInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showBarcode, setShowBarcode] = useState(false)

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTotalItems = () => {
    return Object.values(countItems).reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    )
  }

  const getCompletedCount = () => {
    return Object.values(countItems).filter((item) => item.totalQuantity > 0)
      .length
  }

  const getVarianceCount = () => {
    return Object.values(countItems).filter((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product?.expectedQty) return false
      const variance = Math.abs(item.totalQuantity - product.expectedQty)
      return variance > 0.1
    }).length
  }

  return (
    <div className='space-y-6'>
      {/* Area Header */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                {areaName}
                <Badge variant='outline'>
                  {getCompletedCount()} of {products.length} counted
                </Badge>
              </CardTitle>
              <CardDescription>Count all items in this area</CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={onSave} disabled={saving}>
                <Save className='h-4 w-4 mr-2' />
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
              <Button onClick={onComplete} disabled={saving}>
                <CheckCircle className='h-4 w-4 mr-2' />
                Complete Area
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center'>
                <CheckCircle className='h-4 w-4' />
              </div>
              <div>
                <div className='text-lg font-bold'>
                  {getTotalItems().toFixed(1)}
                </div>
                <div className='text-xs text-muted-foreground'>
                  Total units counted
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center'>
                <CheckCircle className='h-4 w-4' />
              </div>
              <div>
                <div className='text-lg font-bold'>{getCompletedCount()}</div>
                <div className='text-xs text-muted-foreground'>
                  Products counted
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center'>
                <AlertTriangle className='h-4 w-4' />
              </div>
              <div>
                <div className='text-lg font-bold'>{getVarianceCount()}</div>
                <div className='text-xs text-muted-foreground'>
                  Items with variance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-3'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search products by name or SKU...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <Button
              variant='outline'
              onClick={() => setShowBarcode(!showBarcode)}
              className='flex items-center gap-2'
            >
              <ScanLine className='h-4 w-4' />
              {showBarcode ? 'Hide' : 'Scan'} Barcode
            </Button>
          </div>

          {showBarcode && (
            <div className='mt-4 p-4 border rounded-lg bg-muted/30'>
              <div className='text-center text-muted-foreground'>
                <ScanLine className='h-8 w-8 mx-auto mb-2' />
                <p className='text-sm'>Barcode scanning coming soon</p>
                <p className='text-xs'>
                  This will allow quick product identification
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Counting */}
      <div className='space-y-4'>
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className='p-8 text-center text-muted-foreground'>
              <Search className='h-8 w-8 mx-auto mb-2' />
              <p>{`No products found matching "${searchTerm}"`}</p>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 sm:grid-cols-1 md:grid-cols-2'>
            {filteredProducts.map((product) => {
              const countItem = countItems[product.id] || {
                id: '',
                areaId: '',
                productId: product.id,
                fullUnits: 0,
                partialUnit: 0,
                totalQuantity: 0,
                countedById: '',
                countedAt: new Date(),
              }

              return (
                <BottleSlider
                  key={product.id}
                  productName={product.name}
                  productContainer={product.container}
                  unit={product.unit}
                  fullUnits={countItem.fullUnits}
                  partialUnit={countItem.partialUnit}
                  expectedQty={product.expectedQty}
                  originalParLevel={getOriginalParLevel?.(product.id)}
                  completedAreasCount={getCompletedAreasCount?.(product.id)}
                  onQuantityChange={(fullUnits, partialUnit) =>
                    onQuantityChange(product.id, fullUnits, partialUnit)
                  }
                  onNotesChange={(notes) => onNotesChange(product.id, notes)}
                  notes={countItem.notes}
                  category={product.category}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile-friendly spacing */}
      <div className='h-20' />
    </div>
  )
}
