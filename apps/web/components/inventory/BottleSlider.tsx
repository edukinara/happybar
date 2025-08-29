'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, X } from 'lucide-react'
import pluralize from 'pluralize'
import { useEffect, useRef, useState } from 'react'

interface BottleSliderProps {
  productName: string
  productContainer?: string
  unit: string
  fullUnits: number
  partialUnit: number
  expectedQty?: number
  originalParLevel?: number
  completedAreasCount?: number
  onQuantityChange: (fullUnits: number, partialUnit: number) => void
  onNotesChange?: (notes: string) => void
  notes?: string
  className?: string
  category?: string
}

export function BottleSlider({
  productName,
  productContainer = 'bottle',
  unit,
  fullUnits,
  partialUnit,
  expectedQty,
  originalParLevel,
  completedAreasCount,
  onQuantityChange,
  onNotesChange,
  notes = '',
  className = '',
  category,
}: BottleSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showPartial, setShowPartial] = useState(partialUnit > 0)
  const [isEditingFullUnits, setIsEditingFullUnits] = useState(false)
  const [fullUnitsInput, setFullUnitsInput] = useState(fullUnits.toString())

  // Constrain partial unit to 0.0-0.9 range
  const constrainedPartialUnit = Math.max(0, Math.min(0.9, partialUnit))

  const totalQuantity = fullUnits + constrainedPartialUnit
  const variance = expectedQty ? totalQuantity - expectedQty : null

  const getVarianceColor = (variance: number | null) => {
    if (variance === null || Math.abs(variance) < 0.1) return 'text-green-600'
    if (Math.abs(variance) < 1) return 'text-yellow-600'
    return 'text-red-600'
  }

  const incrementFullUnits = () => {
    onQuantityChange(fullUnits + 1, constrainedPartialUnit)
  }

  const decrementFullUnits = () => {
    onQuantityChange(Math.max(0, fullUnits - 1), constrainedPartialUnit)
  }

  const incrementPartial = () => {
    const newPartial = Math.min(
      0.9,
      Math.round((constrainedPartialUnit + 0.1) * 10) / 10
    )
    onQuantityChange(fullUnits, newPartial)
  }

  const decrementPartial = () => {
    const newPartial = Math.max(
      0,
      Math.round((constrainedPartialUnit - 0.1) * 10) / 10
    )
    onQuantityChange(fullUnits, newPartial)
  }

  const handleSliderInteraction = (clientX: number) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percentage = x / rect.width
    const newPartial = Math.round(percentage * 9) / 10 // 0.0 to 0.9

    onQuantityChange(fullUnits, newPartial)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleSliderInteraction(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleSliderInteraction(e.clientX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const touch = e.touches[0]
    if (touch) {
      handleSliderInteraction(touch.clientX)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) {
        handleSliderInteraction(touch.clientX)
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging])

  const getPartialDescription = (partial: number) => {
    if (partial === 0) return 'Empty'
    if (partial === 0.1) return '10% full'
    if (partial === 0.2) return '20% full'
    if (partial === 0.3) return '30% full'
    if (partial === 0.4) return '40% full'
    if (partial === 0.5) return 'Half full'
    if (partial === 0.6) return '60% full'
    if (partial === 0.7) return '70% full'
    if (partial === 0.8) return '80% full'
    if (partial === 0.9) return '90% full'
    return `${Math.round(partial * 100)}% full`
  }

  return (
    <Card className={`${className} select-none`}>
      <CardContent className='p-4 space-y-2'>
        {/* Product Header */}
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <h3 className='font-semibold text-sm'>{productName}</h3>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              {category && (
                <Badge
                  variant='secondary'
                  className='text-[9px] bg-amber-500/10 dark:bg-amber-500/20'
                >
                  {category}
                </Badge>
              )}
              <span>•</span>
              <span>{unit}</span>
              {originalParLevel && (
                <>
                  <span>•</span>
                  <span>Par: {originalParLevel}</span>
                </>
              )}
              {completedAreasCount !== undefined && completedAreasCount > 0 && (
                <>
                  <span>•</span>
                  <span>{completedAreasCount} counted</span>
                </>
              )}
            </div>
          </div>
          {variance !== null && (
            <Badge variant='outline' className={getVarianceColor(variance)}>
              {variance > 0 ? '+' : ''}
              {variance.toFixed(1)}
            </Badge>
          )}
        </div>

        {/* Full Units Counter */}
        <div className='space-y-2'>
          <Label className='text-xs font-medium'>
            Full {pluralize(productContainer)}
          </Label>
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={decrementFullUnits}
              disabled={fullUnits === 0}
              className='size-8 p-0'
            >
              <Minus className='size-3' />
            </Button>
            <div className='flex-1 text-center'>
              {isEditingFullUnits ? (
                <Input
                  type='number'
                  value={fullUnitsInput}
                  onChange={(e) => setFullUnitsInput(e.target.value)}
                  onBlur={() => {
                    const value = parseInt(fullUnitsInput) || 0
                    onQuantityChange(Math.max(0, value), constrainedPartialUnit)
                    setIsEditingFullUnits(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseInt(fullUnitsInput) || 0
                      onQuantityChange(
                        Math.max(0, value),
                        constrainedPartialUnit
                      )
                      setIsEditingFullUnits(false)
                    }
                  }}
                  className='h-8 text-center text-lg font-bold'
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => {
                    setIsEditingFullUnits(true)
                    setFullUnitsInput(fullUnits.toString())
                  }}
                  className='cursor-pointer hover:bg-muted rounded px-2 py-1'
                >
                  <div className='text-lg font-bold'>{fullUnits}</div>
                  <div className='text-xs text-muted-foreground'>
                    tap to edit
                  </div>
                </div>
              )}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={incrementFullUnits}
              className='size-8 p-0'
            >
              <Plus className='size-3' />
            </Button>
          </div>
        </div>

        {/* Partial Unit Toggle */}
        {!showPartial ? (
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowPartial(true)}
            className='w-full text-xs h-8'
          >
            <Plus className='size-3 mr-1' />
            Add Partial {productContainer}
          </Button>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-medium'>
                Partial {productContainer}
              </Label>
              <div className='flex items-center gap-2'>
                <div className='text-right'>
                  <div className='text-sm font-medium'>
                    {constrainedPartialUnit.toFixed(1)}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {getPartialDescription(constrainedPartialUnit)}
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    onQuantityChange(fullUnits, 0)
                    setShowPartial(false)
                  }}
                  className='size-6 p-0 text-muted-foreground hover:text-red-500'
                >
                  <X className='size-3' />
                </Button>
              </div>
            </div>

            {/* Visual Bottle Representation */}
            <div className='relative'>
              <div className='w-full h-16 bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-200 ease-out'
                  style={{ width: `${constrainedPartialUnit * 100}%` }}
                />
              </div>

              {/* Increment/Decrement buttons */}
              <div className='flex justify-between mt-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={decrementPartial}
                  disabled={constrainedPartialUnit === 0}
                  className='h-8 text-xs'
                >
                  <Minus className='size-3 mr-1' />
                  -0.1
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={incrementPartial}
                  disabled={constrainedPartialUnit >= 0.9}
                  className='h-8 text-xs'
                >
                  <Plus className='size-3 mr-1' />
                  +0.1
                </Button>
              </div>
            </div>

            {/* Touch/Drag Slider */}
            <div className='space-y-2'>
              <div
                ref={sliderRef}
                className='relative w-full h-8 bg-gray-200 rounded-full cursor-pointer touch-none'
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div
                  className='absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100'
                  style={{ width: `${(constrainedPartialUnit / 0.9) * 100}%` }}
                />
                <div
                  className='absolute top-1/2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full shadow-md transform -translate-y-1/2 cursor-grab active:cursor-grabbing'
                  style={{
                    left: `calc(${(constrainedPartialUnit / 0.9) * 100}% - 12px)`,
                    transition: isDragging ? 'none' : 'left 0.1s',
                  }}
                />
              </div>

              {/* Tick marks */}
              <div className='flex justify-between text-xs text-muted-foreground px-1'>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(
                  (value) => (
                    <span key={value} className='text-center w-4'>
                      {value.toFixed(1)}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className='pt-2 border-t'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Total Count:</span>
            <div className='text-right'>
              <div className='text-lg font-bold'>
                {+totalQuantity.toFixed(1)}{' '}
                <span className='ml-1 font-medium text-sm'>
                  {totalQuantity !== 1
                    ? pluralize(productContainer)
                    : productContainer}
                </span>
              </div>
              {expectedQty !== undefined && variance !== null && (
                <div className={`text-xs ${getVarianceColor(variance)}`}>
                  {variance === 0
                    ? 'On target'
                    : variance > 0
                      ? `+${+variance.toFixed(1)} over`
                      : `${+Math.abs(variance).toFixed(1)} under`}
                  {originalParLevel &&
                    completedAreasCount !== undefined &&
                    completedAreasCount > 0 && (
                      <span className='text-muted-foreground ml-1'>
                        (remaining to reach par)
                      </span>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {onNotesChange && (
          <div className='space-y-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowNotes(!showNotes)}
              className='text-xs h-6 p-1'
            >
              {showNotes ? 'Hide' : 'Add'} Notes
            </Button>
            {showNotes && (
              <Input
                placeholder='Add notes about this count...'
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className='text-xs'
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
