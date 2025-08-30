import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // Location Filtering - Critical for many components
  selectedLocationId: string | null
  setSelectedLocationId: (locationId: string | null) => void
  
  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Theme and Preferences
  compactMode: boolean
  setCompactMode: (compact: boolean) => void
  
  // Recent Searches
  recentProductSearches: string[]
  addRecentProductSearch: (search: string) => void
  clearRecentSearches: () => void
  
  // Dashboard Preferences
  dashboardLayout: 'grid' | 'list'
  setDashboardLayout: (layout: 'grid' | 'list') => void
  
  // Inventory Preferences
  showOnlyLowStock: boolean
  setShowOnlyLowStock: (show: boolean) => void
  inventoryViewMode: 'card' | 'table'
  setInventoryViewMode: (mode: 'card' | 'table') => void
  
  // Actions
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Location state
      selectedLocationId: null,
      setSelectedLocationId: (locationId) => {
        set({ selectedLocationId: locationId })
      },
      
      // UI state
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Theme and preferences
      compactMode: false,
      setCompactMode: (compact) => set({ compactMode: compact }),
      
      // Recent searches
      recentProductSearches: [],
      addRecentProductSearch: (search) => {
        const { recentProductSearches } = get()
        const updatedSearches = [
          search,
          ...recentProductSearches.filter(s => s !== search)
        ].slice(0, 5) // Keep only 5 recent searches
        
        set({ recentProductSearches: updatedSearches })
      },
      clearRecentSearches: () => set({ recentProductSearches: [] }),
      
      // Dashboard preferences
      dashboardLayout: 'grid',
      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
      
      // Inventory preferences
      showOnlyLowStock: false,
      setShowOnlyLowStock: (show) => set({ showOnlyLowStock: show }),
      inventoryViewMode: 'table',
      setInventoryViewMode: (mode) => set({ inventoryViewMode: mode }),
      
      // Actions
      reset: () => {
        set({
          selectedLocationId: null,
          sidebarCollapsed: false,
          compactMode: false,
          recentProductSearches: [],
          dashboardLayout: 'grid',
          showOnlyLowStock: false,
          inventoryViewMode: 'table',
        })
      },
    }),
    {
      name: 'happy-bar-app-store',
      partialize: (state) => ({
        // Only persist certain values
        selectedLocationId: state.selectedLocationId,
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        recentProductSearches: state.recentProductSearches,
        dashboardLayout: state.dashboardLayout,
        showOnlyLowStock: state.showOnlyLowStock,
        inventoryViewMode: state.inventoryViewMode,
      }),
    }
  )
)

// Convenience hooks - Fixed selector caching issue
export const useSelectedLocation = () => {
  // Use separate selectors to avoid object recreation
  const selectedLocationId = useAppStore((state) => state.selectedLocationId)
  const setSelectedLocationId = useAppStore((state) => state.setSelectedLocationId)
  
  return { selectedLocationId, setSelectedLocationId }
}

export const useInventoryPreferences = () => useAppStore((state) => ({
  showOnlyLowStock: state.showOnlyLowStock,
  setShowOnlyLowStock: state.setShowOnlyLowStock,
  inventoryViewMode: state.inventoryViewMode,
  setInventoryViewMode: state.setInventoryViewMode,
}))