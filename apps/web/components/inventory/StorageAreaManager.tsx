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
import { Label } from '@/components/ui/label'
import {
  DEFAULT_STORAGE_AREAS,
  type DefaultStorageArea,
} from '@happy-bar/types'
import { GripVertical, MapPin, Plus, X } from 'lucide-react'
import { useState } from 'react'

interface StorageArea {
  id: string
  name: string
  order: number
}

interface StorageAreaManagerProps {
  areas: StorageArea[]
  onAreasChange: (areas: StorageArea[]) => void
  className?: string
}

export function StorageAreaManager({
  areas,
  onAreasChange,
  className = '',
}: StorageAreaManagerProps) {
  const [customAreaName, setCustomAreaName] = useState('')

  const addDefaultArea = (areaName: DefaultStorageArea) => {
    if (areas.some((area) => area.name === areaName)) return

    const newArea: StorageArea = {
      id: `area_${Date.now()}`,
      name: areaName,
      order: areas.length + 1,
    }

    onAreasChange([...areas, newArea])
  }

  const addCustomArea = () => {
    if (!customAreaName.trim()) return
    if (areas.some((area) => area.name === customAreaName)) return

    const newArea: StorageArea = {
      id: `area_${Date.now()}`,
      name: customAreaName.trim(),
      order: areas.length + 1,
    }

    onAreasChange([...areas, newArea])
    setCustomAreaName('')
  }

  const removeArea = (areaId: string) => {
    const filteredAreas = areas.filter((area) => area.id !== areaId)
    // Reorder areas
    const reorderedAreas = filteredAreas.map((area, index) => ({
      ...area,
      order: index + 1,
    }))
    onAreasChange(reorderedAreas)
  }

  const moveArea = (areaId: string, direction: 'up' | 'down') => {
    const currentIndex = areas.findIndex((area) => area.id === areaId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= areas.length) return

    const newAreas = [...areas]
    ;[newAreas[currentIndex], newAreas[newIndex]] = [
      newAreas[newIndex]!,
      newAreas[currentIndex]!,
    ]

    // Update order numbers
    const reorderedAreas = newAreas.map((area, index) => ({
      ...area,
      order: index + 1,
    }))

    onAreasChange(reorderedAreas)
  }

  const availableDefaultAreas = DEFAULT_STORAGE_AREAS.filter(
    (defaultArea) => !areas.some((area) => area.name === defaultArea)
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <MapPin className='h-5 w-5' />
          Storage Areas
        </CardTitle>
        <CardDescription>
          {`Configure the areas where you&apos;ll count inventory. Areas will be
          counted in order.`}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Current Areas */}
        {areas.length > 0 && (
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>
              Count Areas ({areas.length})
            </Label>
            <div className='space-y-2'>
              {areas.map((area, index) => (
                <div
                  key={area.id}
                  className='flex items-center gap-3 p-3 border rounded-lg bg-muted/30'
                >
                  <div className='flex flex-col gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => moveArea(area.id, 'up')}
                      disabled={index === 0}
                      className='h-4 w-6 p-0'
                    >
                      ▲
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => moveArea(area.id, 'down')}
                      disabled={index === areas.length - 1}
                      className='h-4 w-6 p-0'
                    >
                      ▼
                    </Button>
                  </div>

                  <div className='flex items-center gap-2 flex-1'>
                    <GripVertical className='h-4 w-4 text-muted-foreground' />
                    <Badge
                      variant='outline'
                      className='w-8 h-6 justify-center text-xs'
                    >
                      {area.order}
                    </Badge>
                    <span className='font-medium'>{area.name}</span>
                  </div>

                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeArea(area.id)}
                    className='h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Default Areas */}
        {availableDefaultAreas.length > 0 && (
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>
              Quick Add Common Areas
            </Label>
            <div className='flex flex-wrap gap-2'>
              {availableDefaultAreas.map((areaName) => (
                <Button
                  key={areaName}
                  variant='outline'
                  size='sm'
                  onClick={() => addDefaultArea(areaName)}
                  className='h-8 text-xs'
                >
                  <Plus className='h-3 w-3 mr-1' />
                  {areaName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Area */}
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>Add Custom Area</Label>
          <div className='flex gap-2'>
            <Input
              placeholder='Enter area name...'
              value={customAreaName}
              onChange={(e) => setCustomAreaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomArea()
                }
              }}
              className='flex-1'
            />
            <Button
              onClick={addCustomArea}
              disabled={!customAreaName.trim()}
              size='sm'
            >
              <Plus className='h-4 w-4 mr-1' />
              Add
            </Button>
          </div>
        </div>

        {/* Help Text */}
        {areas.length === 0 && (
          <div className='text-center py-8 text-muted-foreground'>
            <MapPin className='h-8 w-8 mx-auto mb-2' />
            <p className='text-sm'>No areas configured yet</p>
            <p className='text-xs'>
              Add areas where you&apos;ll count inventory
            </p>
          </div>
        )}

        {areas.length > 0 && (
          <div className='text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg'>
            {`**Tip:** Areas will be counted in the order shown. You
            can reorder them using the arrow buttons. Start with high-value or
            frequently accessed areas like "Behind Bar" or "Speed Rail".`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
