import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Location {
  id: string
  name: string
  businessCloseTime?: string | null
  timezone?: string | null
}

interface LocationStore {
  selectedLocationId: string | null
  locations: Location[]
  setSelectedLocationId: (locationId: string) => void
  setLocations: (locations: Location[]) => void
  getSelectedLocation: () => Location | null
  initializeDefaultLocation: () => void
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      selectedLocationId: null,
      locations: [],

      setSelectedLocationId: (locationId: string) => {
        set({ selectedLocationId: locationId })
      },

      setLocations: (locations: Location[]) => {
        set({ locations })

        // Auto-select first location if none selected and locations are available
        const { selectedLocationId } = get()
        if (!selectedLocationId && locations.length > 0) {
          set({ selectedLocationId: locations[0].id })
        }
      },

      getSelectedLocation: () => {
        const { selectedLocationId, locations } = get()
        if (!selectedLocationId) return null
        return locations.find(loc => loc.id === selectedLocationId) || null
      },

      initializeDefaultLocation: () => {
        const { selectedLocationId, locations } = get()
        if (!selectedLocationId && locations.length > 0) {
          set({ selectedLocationId: locations[0].id })
        }
      }
    }),
    {
      name: 'location-selection',
      partialize: (state) => ({
        selectedLocationId: state.selectedLocationId
      }),
    }
  )
)