'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { locationsApi } from '@/lib/api/locations'
import { useLocationStore, type Location } from '@/lib/stores/location-store'
import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

export function LocationSelector() {
  const {
    selectedLocationId,
    locations,
    setSelectedLocationId,
    setLocations,
    getSelectedLocation,
    initializeDefaultLocation,
  } = useLocationStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await locationsApi.getLocations()
        const fetchedLocations: Location[] = response || []
        setLocations(fetchedLocations)
        initializeDefaultLocation()
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()
  }, [setLocations, initializeDefaultLocation])

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 px-3 py-2'>
        <MapPin className='h-4 w-4 text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>
          Loading locations...
        </span>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className='flex items-center gap-2 px-3 py-2'>
        <MapPin className='h-4 w-4 text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>
          No locations available
        </span>
      </div>
    )
  }

  const selectedLocation = getSelectedLocation()

  return (
    <div className='flex items-center gap-2'>
      <MapPin className='size-4 text-muted-foreground' />
      <Select
        value={selectedLocationId || ''}
        onValueChange={setSelectedLocationId}
      >
        <SelectTrigger className='max-w-[200px] h-8 text-sm text-ellipsis'>
          <SelectValue placeholder='Select location'>
            {selectedLocation?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name} Location
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
