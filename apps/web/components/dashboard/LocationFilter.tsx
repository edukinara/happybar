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
import { useLocations } from '@/lib/queries'
import type { LocationsResponse } from '@/lib/api/locations'
import { useSelectedLocation } from '@/lib/stores'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useEffect } from 'react'

interface LocationFilterProps {
  selectedLocationId?: string
  onLocationChange?: (locationId?: string) => void
  showAllOption?: boolean
  placeholder?: string
  useGlobalState?: boolean // New prop to use global state
}

export function LocationFilter({
  selectedLocationId: propSelectedLocationId,
  onLocationChange,
  showAllOption = true,
  placeholder = 'Filter by location',
  useGlobalState = false,
}: LocationFilterProps) {
  // Re-enabled with stable query key fix
  const { data: locations = [], isLoading: loading } = useLocations() as { 
    data: LocationsResponse, 
    isLoading: boolean 
  }
  
  // Use global state if enabled, otherwise use props
  const { selectedLocationId: globalSelectedLocationId, setSelectedLocationId } = useSelectedLocation()
  
  const selectedLocationId = useGlobalState ? globalSelectedLocationId : propSelectedLocationId
  
  const handleLocationChange = (locationId?: string) => {
    if (useGlobalState) {
      setSelectedLocationId(locationId || null)
    }
    onLocationChange?.(locationId)
  }
  
  // Auto-sync global state with props if needed
  useEffect(() => {
    if (useGlobalState && propSelectedLocationId !== undefined && propSelectedLocationId !== globalSelectedLocationId) {
      setSelectedLocationId(propSelectedLocationId || null)
    }
  }, [propSelectedLocationId, globalSelectedLocationId, useGlobalState, setSelectedLocationId])

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
          <DropdownMenuItem onClick={() => handleLocationChange(undefined)}>
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
              onClick={() => handleLocationChange(location.id)}
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
