'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LocationFilterProps {
  selectedLocationId?: string
  onLocationChange: (locationId?: string) => void
  showAllOption?: boolean
  placeholder?: string
}

export function LocationFilter({
  selectedLocationId,
  onLocationChange,
  showAllOption = true,
  placeholder = 'Filter by location',
}: LocationFilterProps) {
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const data = await locationsApi.getLocations()
      setLocations(data)
    } catch (error) {
      console.warn('Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedLocation = locations.find(
    (loc) => loc.id === selectedLocationId
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className='justify-between'>
          <div className='flex items-center'>
            <MapPin className='mr-2 size-4' />
            {selectedLocation ? selectedLocation.name : placeholder}
          </div>
          <ChevronDown className='ml-2 size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-56'>
        <DropdownMenuLabel>Select Location</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {showAllOption && (
          <DropdownMenuItem onClick={() => onLocationChange(undefined)}>
            <div className='flex items-center justify-between w-full'>
              <span>All Locations</span>
              {!selectedLocationId && <Check className='size-4' />}
            </div>
          </DropdownMenuItem>
        )}

        {loading ? (
          <DropdownMenuItem disabled>Loading locations...</DropdownMenuItem>
        ) : locations.length === 0 ? (
          <DropdownMenuItem disabled>No locations found</DropdownMenuItem>
        ) : (
          locations.map((location) => (
            <DropdownMenuItem
              key={location.id}
              onClick={() => onLocationChange(location.id)}
            >
              <div className='flex items-center justify-between w-full'>
                <div>
                  <div className='font-medium'>{location.name}</div>
                  <div className='text-sm text-muted-foreground'>
                    {location.type}
                    {location._count &&
                      ` • ${location._count.inventoryItems} items`}
                  </div>
                </div>
                {selectedLocationId === location.id && (
                  <Check className='size-4' />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
