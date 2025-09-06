import { create } from 'zustand'
import { countApi } from '../lib/api'

export interface CountItem {
  id: string
  inventoryItemId: string
  productId: string
  productName: string
  sku: string | null
  barcode: string
  unit: string
  container: string | null
  currentStock: number
  countedQuantity: number
  variance: number
  parLevel: number
  timestamp: string
  countSessionId: string | null // For grouping counts by session
}

export interface CountSession {
  id: string
  name: string
  type: 'SPOT' | 'FULL' | 'CYCLE'
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
  locationId: string
  locationName: string
  storageAreas: string[]
  notes: string
  startedAt: string
  completedAt: string | null
  totalItems: number
  totalVariance: number
  apiId?: string // API count ID when synced
  areas?: Array<{ id: string; name: string; order: number }>
}

interface CountStore {
  // Count items (individual scans)
  countItems: CountItem[]
  
  // Count sessions (structured counts)
  countSessions: CountSession[]
  
  // Current active session
  activeSessionId: string | null
  
  // Actions for count items
  addCountItem: (item: Omit<CountItem, 'id' | 'timestamp'>) => void
  removeCountItem: (id: string) => void
  updateCountItem: (id: string, updates: Partial<CountItem>) => void
  clearCountItems: () => void
  getRecentCountItems: (limit?: number) => CountItem[]
  getCountItemsBySession: (sessionId: string) => CountItem[]
  
  // Actions for count sessions
  createCountSession: (session: Omit<CountSession, 'id' | 'startedAt' | 'totalItems' | 'totalVariance'>) => string
  createCountSessionWithAPI: (session: Omit<CountSession, 'id' | 'startedAt' | 'totalItems' | 'totalVariance'>) => Promise<string>
  updateCountSession: (id: string, updates: Partial<CountSession>) => void
  completeCountSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  getActiveSession: () => CountSession | null
  syncSessionWithAPI: (sessionId: string) => Promise<void>
  saveCountItemToAPI: (item: CountItem) => Promise<void>
  
  // Utilities
  getTotalCounts: () => number
  getSessionSummary: (sessionId: string) => {
    totalItems: number
    totalVariance: number
  }
}

export const useCountStore = create<CountStore>()((set, get) => ({
      countItems: [],
      countSessions: [],
      activeSessionId: null,

      // Count item actions
      addCountItem: (item) => {
        const newItem: CountItem = {
          ...item,
          id: `count-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        }
        
        set((state) => ({
          countItems: [newItem, ...state.countItems],
        }))
        
        // Update active session if exists
        const activeSessionId = get().activeSessionId
        if (activeSessionId) {
          const session = get().countSessions.find(s => s.id === activeSessionId)
          if (session && session.status === 'IN_PROGRESS') {
            get().updateCountSession(activeSessionId, {
              totalItems: session.totalItems + 1,
              totalVariance: session.totalVariance + Math.abs(item.variance),
            })
          }
        }
      },

      removeCountItem: (id) => {
        set((state) => ({
          countItems: state.countItems.filter(item => item.id !== id),
        }))
      },

      updateCountItem: (id, updates) => {
        set((state) => ({
          countItems: state.countItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },

      clearCountItems: () => {
        set({ countItems: [] })
      },

      getRecentCountItems: (limit = 10) => {
        const items = get().countItems
        return items.slice(0, limit)
      },

      getCountItemsBySession: (sessionId) => {
        return get().countItems.filter(item => item.countSessionId === sessionId)
      },

      // Count session actions
      createCountSession: (sessionData) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newSession: CountSession = {
          ...sessionData,
          id: sessionId,
          startedAt: new Date().toISOString(),
          totalItems: 0,
          totalVariance: 0,
        }
        
        set((state) => ({
          countSessions: [newSession, ...state.countSessions],
          activeSessionId: sessionId,
        }))
        
        return sessionId
      },

      createCountSessionWithAPI: async (sessionData) => {
        try {
          // Create count via API first
          const response = await countApi.createCount({
            locationId: sessionData.locationId,
            name: sessionData.name,
            type: sessionData.type,
            notes: sessionData.notes,
            areas: sessionData.storageAreas.map((name, index) => ({ name, order: index }))
          })

          const apiCount = response.data
          
          // Create local session with API ID
          const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const newSession: CountSession = {
            ...sessionData,
            id: sessionId,
            apiId: apiCount.id,
            areas: apiCount.areas,
            startedAt: new Date().toISOString(),
            totalItems: 0,
            totalVariance: 0,
          }
          
          set((state) => ({
            countSessions: [newSession, ...state.countSessions],
            activeSessionId: sessionId,
          }))
          
          // Update count status to IN_PROGRESS
          await countApi.updateCount(apiCount.id, { status: 'IN_PROGRESS' })
          
          return sessionId
        } catch (error) {
          console.error('Failed to create count session with API:', error)
          // Fallback to local creation if API fails
          return get().createCountSession(sessionData)
        }
      },

      updateCountSession: (id, updates) => {
        set((state) => ({
          countSessions: state.countSessions.map(session =>
            session.id === id ? { ...session, ...updates } : session
          ),
        }))
      },

      completeCountSession: (id) => {
        set((state) => ({
          countSessions: state.countSessions.map(session =>
            session.id === id 
              ? { 
                  ...session, 
                  status: 'COMPLETED',
                  completedAt: new Date().toISOString(),
                }
              : session
          ),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        }))
      },

      setActiveSession: (id) => {
        set({ activeSessionId: id })
      },

      getActiveSession: () => {
        const activeSessionId = get().activeSessionId
        if (!activeSessionId) return null
        return get().countSessions.find(session => session.id === activeSessionId) || null
      },

      // Utility functions
      getTotalCounts: () => {
        return get().countItems.length
      },

      getSessionSummary: (sessionId) => {
        const sessionItems = get().getCountItemsBySession(sessionId)

        return {
          totalItems: sessionItems.length,
          totalVariance: sessionItems.reduce((sum, item) => sum + Math.abs(item.variance), 0),
        }
      },

      // API integration methods
      syncSessionWithAPI: async (sessionId) => {
        const session = get().countSessions.find(s => s.id === sessionId)
        if (!session || session.apiId) return // Already synced or doesn't exist

        try {
          const response = await countApi.createCount({
            locationId: session.locationId,
            name: session.name,
            type: session.type,
            notes: session.notes,
            areas: session.storageAreas.map((name, index) => ({ name, order: index }))
          })

          const apiCount = response.data
          
          // Update local session with API ID
          get().updateCountSession(sessionId, {
            apiId: apiCount.id,
            areas: apiCount.areas
          })

          // Update API status to IN_PROGRESS if session is active
          if (session.status === 'IN_PROGRESS') {
            await countApi.updateCount(apiCount.id, { status: 'IN_PROGRESS' })
          }
        } catch (error) {
          console.error('Failed to sync session with API:', error)
        }
      },

      saveCountItemToAPI: async (item) => {
        try {
          const session = get().countSessions.find(s => s.id === item.countSessionId)
          if (!session?.apiId || !session.areas) {
            console.warn('Cannot save item to API: session not synced or no areas')
            return
          }

          // Find the appropriate area for this item
          // For now, we'll use the first area - in a real app, you'd determine this based on item location
          const area = session.areas[0]
          if (!area) {
            console.warn('No areas available for this session')
            return
          }

          // Convert our local item format to API format
          await countApi.addCountItem(session.apiId, {
            areaId: area.id,
            productId: item.productId,
            fullUnits: Math.floor(item.countedQuantity),
            partialUnit: item.countedQuantity % 1,
            notes: `Scanned via mobile app - Barcode: ${item.barcode}`
          })

          console.log('Successfully saved count item to API')
        } catch (error) {
          console.error('Failed to save count item to API:', error)
          // In a production app, you might want to queue failed items for retry
        }
      },
    }))