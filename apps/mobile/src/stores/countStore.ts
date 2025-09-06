import { create } from 'zustand'

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
  updateCountSession: (id: string, updates: Partial<CountSession>) => void
  completeCountSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  getActiveSession: () => CountSession | null
  
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
    }))