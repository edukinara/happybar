import { create } from 'zustand'
import { countApi } from '../lib/api'

export interface CountItem {
  id: string
  inventoryItemId: string
  productId: string
  productName: string
  productImage?: string | null
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
  areaId?: string // Track which area this item belongs to
}

export interface CountArea {
  id: string
  name: string
  order: number
  status: 'pending' | 'in_progress' | 'completed'
  itemsCount?: number
  completedAt?: string
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
  areas?: CountArea[]
  currentAreaId?: string // Track which area is currently being counted
  syncStatus: 'synced' | 'not_synced' | 'sync_failed' // Track sync status
  lastSyncAttempt?: string // When last sync was attempted
  syncError?: string // Error message from last sync attempt
}

interface CountStore {
  // Count items (individual scans)
  countItems: CountItem[]

  // Count sessions (structured counts)
  countSessions: CountSession[]

  // Current active session
  activeSessionId: string | null

  // Sync state
  lastSyncTime: string | null
  isSyncing: boolean

  // Actions for count items
  addCountItem: (item: Omit<CountItem, 'id' | 'timestamp'>) => void
  removeCountItem: (id: string) => void
  updateCountItem: (id: string, updates: Partial<CountItem>) => void
  clearCountItems: () => void
  getRecentCountItems: (limit?: number) => CountItem[]
  getCountItemsBySession: (sessionId: string) => CountItem[]

  // Actions for count sessions
  createCountSession: (
    session: Omit<
      CountSession,
      'id' | 'startedAt' | 'totalItems' | 'totalVariance'
    >
  ) => string
  createCountSessionWithAPI: (
    session: Omit<
      CountSession,
      'id' | 'startedAt' | 'totalItems' | 'totalVariance'
    >
  ) => Promise<string>
  updateCountSession: (id: string, updates: Partial<CountSession>) => void
  completeCountSession: (id: string) => Promise<void>
  setActiveSession: (id: string | null) => void
  getActiveSession: () => CountSession | null
  syncSessionWithAPI: (sessionId: string) => Promise<void>
  saveCountItemToAPI: (item: CountItem) => Promise<void>

  // Area management
  setCurrentArea: (sessionId: string, areaId: string) => void
  completeCurrentArea: (
    sessionId: string
  ) => Promise<{
    hasMoreAreas: boolean
    nextArea: CountArea | null
    countCompleted?: boolean
  }>
  getNextArea: (sessionId: string) => CountArea | null
  getAreaProgress: (sessionId: string) => { completed: number; total: number }

  // Sync methods
  syncWithBackend: () => Promise<void>
  resumeBackendSession: (apiCountId: string) => Promise<string>
  checkForActiveBackendSessions: () => Promise<CountSession[]>
  cleanupStaleLocalSessions: (backendSessions: CountSession[]) => Promise<void>

  // Utilities
  getTotalCounts: () => number
  getSessionSummary: (sessionId: string) => {
    totalItems: number
    totalVariance: number
  }
  getUnsyncedSessions: () => CountSession[]
  retryFailedSync: (sessionId: string) => Promise<void>
  rehydrateCurrentSessionItems: () => Promise<void>
}

export const useCountStore = create<CountStore>()((set, get) => ({
  countItems: [],
  countSessions: [],
  activeSessionId: null,
  lastSyncTime: null,
  isSyncing: false,

  // Count item actions
  addCountItem: (item) => {
    const newItem: CountItem = {
      ...item,
      id: `count-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
    }

    set((state) => ({
      countItems: [newItem, ...state.countItems],
    }))

    // Update active session if exists
    const activeSessionId = get().activeSessionId
    if (activeSessionId) {
      const session = get().countSessions.find((s) => s.id === activeSessionId)
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
      countItems: state.countItems.filter((item) => item.id !== id),
    }))
  },

  updateCountItem: (id, updates) => {
    set((state) => ({
      countItems: state.countItems.map((item) =>
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
    return get().countItems.filter((item) => item.countSessionId === sessionId)
  },

  // Count session actions
  createCountSession: (sessionData) => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const newSession: CountSession = {
      ...sessionData,
      id: sessionId,
      startedAt: new Date().toISOString(),
      totalItems: 0,
      totalVariance: 0,
      syncStatus: 'not_synced',
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
        areas: sessionData.storageAreas.map((name, index) => ({
          name,
          order: index,
        })),
      })

      const apiCount = response.data

      // Use real area IDs from API response
      const countAreas: CountArea[] = (apiCount.areas || []).map(
        (area, index) => ({
          id: area.id,
          name: area.name,
          order: area.order,
          status: index === 0 ? 'in_progress' : 'pending', // First area starts as in_progress
        })
      )

      // Create local session with API ID
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const newSession: CountSession = {
        ...sessionData,
        id: sessionId,
        apiId: apiCount.id,
        areas: countAreas,
        currentAreaId: countAreas.length > 0 ? countAreas[0].id : undefined,
        startedAt: new Date().toISOString(),
        totalItems: 0,
        totalVariance: 0,
        syncStatus: 'synced',
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
      // Don't create a local fallback session - this creates inconsistent state
      // The caller should handle the error and inform the user
      throw error
    }
  },

  updateCountSession: (id, updates) => {
    set((state) => ({
      countSessions: state.countSessions.map((session) =>
        session.id === id ? { ...session, ...updates } : session
      ),
    }))
  },

  completeCountSession: async (id) => {
    const session = get().countSessions.find((s) => s.id === id)
    if (!session) return

    // Update local state
    set((state) => ({
      countSessions: state.countSessions.map((session) =>
        session.id === id
          ? {
              ...session,
              status: 'COMPLETED',
              completedAt: new Date().toISOString(),
            }
          : session
      ),
      activeSessionId:
        state.activeSessionId === id ? null : state.activeSessionId,
    }))

    // Update backend if synced
    if (session.apiId && session.syncStatus === 'synced') {
      try {
        await countApi.updateCount(session.apiId, { status: 'COMPLETED' })
        // console.log('Count completed on backend:', session.apiId)
      } catch (error) {
        console.error('Failed to update count status on backend:', error)
        // Mark as sync failed
        get().updateCountSession(id, {
          syncStatus: 'sync_failed',
          syncError: 'Failed to complete count on backend',
        })
      }
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id })
  },

  getActiveSession: () => {
    const activeSessionId = get().activeSessionId
    if (!activeSessionId) return null
    return (
      get().countSessions.find((session) => session.id === activeSessionId) ||
      null
    )
  },

  // Utility functions
  getTotalCounts: () => {
    return get().countItems.length
  },

  getSessionSummary: (sessionId) => {
    const sessionItems = get().getCountItemsBySession(sessionId)

    return {
      totalItems: sessionItems.length,
      totalVariance: sessionItems.reduce(
        (sum, item) => sum + Math.abs(item.variance),
        0
      ),
    }
  },

  // API integration methods
  syncSessionWithAPI: async (sessionId) => {
    const session = get().countSessions.find((s) => s.id === sessionId)
    if (!session || session.apiId) return // Already synced or doesn't exist

    // Update sync attempt timestamp
    get().updateCountSession(sessionId, {
      lastSyncAttempt: new Date().toISOString(),
    })

    try {
      const response = await countApi.createCount({
        locationId: session.locationId,
        name: session.name,
        type: session.type,
        notes: session.notes,
        areas: session.storageAreas.map((name, index) => ({
          name,
          order: index,
        })),
      })

      const apiCount = response.data

      // Update local session with API ID - convert areas to proper format
      const formattedAreas: CountArea[] = (apiCount.areas || []).map(
        (area: any, index: number) => ({
          id: area.id,
          name: area.name,
          order: area.order,
          status: index === 0 ? ('in_progress' as const) : ('pending' as const),
        })
      )

      get().updateCountSession(sessionId, {
        apiId: apiCount.id,
        areas: formattedAreas,
        syncStatus: 'synced',
        syncError: undefined,
      })

      // Update API status to IN_PROGRESS if session is active
      if (session.status === 'IN_PROGRESS') {
        await countApi.updateCount(apiCount.id, { status: 'IN_PROGRESS' })
      }
    } catch (error) {
      console.error('Failed to sync session with API:', error)

      // Update sync status to failed
      get().updateCountSession(sessionId, {
        syncStatus: 'sync_failed',
        syncError: error instanceof Error ? error.message : 'Unknown error',
      })

      // Re-throw the error so callers can handle it appropriately
      throw error
    }
  },

  saveCountItemToAPI: async (item) => {
    try {
      const session = get().countSessions.find(
        (s) => s.id === item.countSessionId
      )
      if (!session) {
        console.warn('Cannot save item to API: session not found')
        return
      }

      // If session is not synced, try to sync it first
      if (!session.apiId || session.syncStatus !== 'synced') {
        // console.log('Session not synced, attempting to sync first...')
        await get().syncSessionWithAPI(session.id)
        // Re-fetch session after sync
        const updatedSession = get().countSessions.find(
          (s) => s.id === item.countSessionId
        )
        if (!updatedSession?.apiId || !updatedSession.areas) {
          console.warn('Session sync failed, cannot save item to API')
          return
        }
        // Use the updated session
        Object.assign(session, updatedSession)
      }

      if (!session.areas) {
        console.warn('No areas available for this session')
        return
      }

      // Find the appropriate area for this item using the item's areaId
      const area = session.areas.find((a) => a.id === item.areaId)
      if (!area) {
        console.warn(
          `Area ${item.areaId} not found, using first available area`
        )
      }

      const targetArea = area || session.areas[0]

      // Convert our local item format to API format
      await countApi.addCountItem(session.apiId!, {
        areaId: targetArea.id,
        productId: item.productId,
        fullUnits: Math.floor(item.countedQuantity),
        partialUnit: item.countedQuantity % 1,
        notes: `Scanned via mobile app - Barcode: ${item.barcode}`,
      })

      // console.log('Successfully saved count item to API')
    } catch (error) {
      console.error('Failed to save count item to API:', error)
      // In a production app, you might want to queue failed items for retry
    }
  },

  // Additional utility methods
  getUnsyncedSessions: () => {
    return get().countSessions.filter(
      (session) =>
        session.syncStatus === 'not_synced' ||
        session.syncStatus === 'sync_failed'
    )
  },

  retryFailedSync: async (sessionId) => {
    const session = get().countSessions.find((s) => s.id === sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    if (session.syncStatus === 'synced') {
      return // Already synced
    }

    // Retry the sync
    await get().syncSessionWithAPI(sessionId)
  },

  // Sync methods
  syncWithBackend: async () => {
    if (get().isSyncing) return // Prevent concurrent syncs

    set({ isSyncing: true })

    try {
      // Check for active backend sessions
      const backendSessions = await get().checkForActiveBackendSessions()

      // Clean up local sessions that no longer exist in backend
      await get().cleanupStaleLocalSessions(backendSessions)

      // If there are backend sessions but no local active session,
      // we might need to present them to the user
      const currentActiveSession = get().getActiveSession()

      if (backendSessions.length > 0 && !currentActiveSession) {
        // Set the first backend session as active
        // In a full implementation, you might want to present options to the user
        const backendSession = backendSessions[0]
        await get().resumeBackendSession(backendSession.apiId!)
      }

      // Sync any local unsynced sessions
      const unsyncedSessions = get().getUnsyncedSessions()
      await Promise.all(
        unsyncedSessions.map((session) => get().syncSessionWithAPI(session.id))
      )

      set({ lastSyncTime: new Date().toISOString() })
    } catch (error) {
      console.error('Failed to sync with backend:', error)
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },

  checkForActiveBackendSessions: async () => {
    try {
      const response = await countApi.getActiveCounts()
      const activeCounts = response.data.counts

      // Convert API counts to local session format
      const backendSessions: CountSession[] = activeCounts.map((apiCount) => ({
        id: `backend-${apiCount.id}`, // Prefix to identify backend sessions
        apiId: apiCount.id,
        name: apiCount.name,
        type: apiCount.type,
        status: 'IN_PROGRESS',
        locationId: apiCount.locationId,
        locationName: apiCount.location.name,
        storageAreas: apiCount.areas.map((area: any) => area.name),
        areas: apiCount.areas.map((area: any) => ({
          id: area.id,
          name: area.name,
          order: area.order,
          status: 'pending' as const,
        })),
        notes: '',
        startedAt: apiCount.startedAt,
        completedAt: null,
        totalItems: 0,
        totalVariance: 0,
        syncStatus: 'synced' as const,
      }))

      return backendSessions
    } catch (error) {
      console.error('Failed to check for active backend sessions:', error)
      return []
    }
  },

  resumeBackendSession: async (apiCountId: string) => {
    try {
      // Get full count details from API
      const response: any = await countApi.getCount(apiCountId)
      const apiCount = response.data

      // Convert backend areas to mobile format with proper status mapping
      const convertedAreas: CountArea[] = (apiCount.areas || []).map(
        (area: any) => ({
          id: area.id,
          name: area.name,
          order: area.order,
          status:
            area.status === 'COMPLETED'
              ? ('completed' as const)
              : area.status === 'IN_PROGRESS'
                ? ('in_progress' as const)
                : ('pending' as const),
          itemsCount: area.itemsCount,
          completedAt: area.completedAt,
        })
      )

      // Find current area - either in_progress area or first pending area
      const currentArea =
        convertedAreas.find((area) => area.status === 'in_progress') ||
        convertedAreas.find((area) => area.status === 'pending')

      // Validate count status before creating local session
      if (apiCount.status === 'COMPLETED' || apiCount.status === 'APPROVED') {
        // console.log(`Count ${apiCount.id} is already ${apiCount.status}, cannot resume for editing`)
        throw new Error(
          `Count is already ${apiCount.status.toLowerCase()} and cannot be resumed for editing`
        )
      }

      // Create session ID first so we can use it in count items
      const sessionId = `backend-${apiCount.id}`
      
      // Extract count items from API response areas
      const countItems: CountItem[] = []
      
      if (apiCount.areas) {
        for (const area of apiCount.areas) {
          if (area.items && Array.isArray(area.items)) {
            for (const item of area.items) {
              const countItem: CountItem = {
                id: item.id || `api-${item.productId}-${area.id}-${Date.now()}`,
                inventoryItemId: item.inventoryItemId || '',
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                productImage: item.product?.image || null,
                sku: item.product?.sku || null,
                barcode: item.barcode || '',
                unit: item.product?.unit || 'unit',
                container: item.product?.container || null,
                currentStock: item.expectedQty || 0,
                countedQuantity: item.totalQuantity || 0,
                variance: (item.totalQuantity || 0) - (item.expectedQty || 0),
                parLevel: item.expectedQty || 0,
                timestamp: item.countedAt || new Date().toISOString(),
                countSessionId: sessionId,
                areaId: area.id,
              }
              countItems.push(countItem)
            }
          }
        }
      }

      // Create local session from API data
      const newSession: CountSession = {
        id: sessionId,
        apiId: apiCount.id,
        name: apiCount.name,
        type: apiCount.type,
        status: apiCount.status as 'IN_PROGRESS', // Should only be IN_PROGRESS at this point
        locationId: apiCount.locationId,
        locationName: apiCount.location.name,
        storageAreas: convertedAreas.map((area) => area.name),
        areas: convertedAreas,
        currentAreaId: currentArea?.id,
        notes: apiCount.notes || '',
        startedAt: apiCount.startedAt,
        completedAt: apiCount.completedAt,
        totalItems: countItems.length,
        totalVariance: countItems.reduce((sum, item) => sum + item.variance, 0),
        syncStatus: 'synced',
      }

      set((state) => ({
        countSessions: [
          newSession,
          ...state.countSessions.filter((s) => s.id !== sessionId),
        ],
        // Add count items, removing any existing items for this session
        countItems: [
          ...countItems,
          ...state.countItems.filter((item) => item.countSessionId !== sessionId),
        ],
        activeSessionId: sessionId,
      }))

      return sessionId
    } catch (error) {
      console.error('Failed to resume backend session:', error)
      throw error
    }
  },

  cleanupStaleLocalSessions: async (backendSessions: CountSession[]) => {
    const currentSessions = get().countSessions
    const activeSessionId = get().activeSessionId
    let newActiveSessionId = activeSessionId

    try {
      // Get recent counts from backend to check against
      const recentCountsResponse = await countApi.getRecentCounts()
      const allBackendApiIds = new Set(
        recentCountsResponse.data.counts.map((count) => count.id)
      )

      // Get list of backend API IDs that are still active
      const activeBackendApiIds = new Set(
        backendSessions.map((session) => session.apiId).filter(Boolean)
      )

      // Find local sessions that should be removed
      const staleSessions: string[] = []

      for (const session of currentSessions) {
        // Skip unsynced local sessions (they haven't been sent to backend yet)
        if (
          session.syncStatus === 'not_synced' ||
          session.syncStatus === 'sync_failed'
        ) {
          continue
        }

        // If this session has an apiId but it no longer exists in backend, it's stale
        if (session.apiId && !allBackendApiIds.has(session.apiId)) {
          staleSessions.push(session.id)

          // If this stale session is currently active, clear the active session
          if (activeSessionId === session.id) {
            newActiveSessionId = null
          }

          // console.log(`🧹 Cleaning up deleted session: ${session.name} (API ID: ${session.apiId})`)
        }
        // If the session exists in backend but is no longer active, update its status
        else if (
          session.apiId &&
          allBackendApiIds.has(session.apiId) &&
          !activeBackendApiIds.has(session.apiId)
        ) {
          // Find the backend count to get its current status
          const backendCount = recentCountsResponse.data.counts.find(
            (count) => count.id === session.apiId
          )
          if (
            backendCount &&
            (backendCount.status === 'COMPLETED' ||
              backendCount.status === 'APPROVED')
          ) {
            // Update local session status to match backend
            get().updateCountSession(session.id, {
              status:
                backendCount.status === 'APPROVED'
                  ? ('COMPLETED' as const)
                  : backendCount.status,
              completedAt: backendCount.completedAt || new Date().toISOString(),
            })

            // If this completed session is currently active, clear it
            if (activeSessionId === session.id) {
              newActiveSessionId = null
            }

            // console.log(`📝 Updated session status: ${session.name} -> ${backendCount.status}`)
          }
        }
      }

      // Remove stale sessions and count items associated with them
      if (staleSessions.length > 0) {
        set((state) => ({
          countSessions: state.countSessions.filter(
            (session) => !staleSessions.includes(session.id)
          ),
          countItems: state.countItems.filter(
            (item) => !staleSessions.includes(item.countSessionId || '')
          ),
          activeSessionId: newActiveSessionId,
        }))

        // console.log(`🧹 Cleaned up ${staleSessions.length} stale count sessions`)
      }

      // Update active session if it changed
      if (newActiveSessionId !== activeSessionId) {
        set({ activeSessionId: newActiveSessionId })
      }
    } catch (error) {
      console.error('Failed to cleanup stale sessions:', error)
      // Fall back to basic cleanup using only active sessions
      const activeBackendApiIds = new Set(
        backendSessions.map((session) => session.apiId).filter(Boolean)
      )

      const staleSessions: string[] = []

      for (const session of currentSessions) {
        if (
          session.syncStatus === 'not_synced' ||
          session.syncStatus === 'sync_failed'
        ) {
          continue
        }

        if (session.apiId && !activeBackendApiIds.has(session.apiId)) {
          staleSessions.push(session.id)
          if (activeSessionId === session.id) {
            newActiveSessionId = null
          }
        }
      }

      if (staleSessions.length > 0) {
        set((state) => ({
          countSessions: state.countSessions.filter(
            (session) => !staleSessions.includes(session.id)
          ),
          countItems: state.countItems.filter(
            (item) => !staleSessions.includes(item.countSessionId || '')
          ),
          activeSessionId: newActiveSessionId,
        }))
      }
    }
  },

  // Area management methods
  setCurrentArea: (sessionId, areaId) => {
    set((state) => ({
      countSessions: state.countSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              currentAreaId: areaId,
              areas: session.areas?.map((area) =>
                area.id === areaId
                  ? { ...area, status: 'in_progress' as const }
                  : area
              ),
            }
          : session
      ),
    }))
  },

  completeCurrentArea: async (sessionId) => {
    const session = get().countSessions.find((s) => s.id === sessionId)
    if (!session || !session.currentAreaId || !session.apiId) {
      return { hasMoreAreas: false, nextArea: null }
    }

    // Validate count is still in progress before completing area
    if (session.status !== 'IN_PROGRESS') {
      console.warn(`Cannot complete area - count status is ${session.status}`)
      throw new Error(`Count is ${session.status} and cannot be modified`)
    }

    const currentAreaItems = get().countItems.filter(
      (item) =>
        item.countSessionId === sessionId &&
        item.areaId === session.currentAreaId
    )

    try {
      // Batch save all count items for this area (like web app does)
      // Note: Mobile app already saves items in real-time, but this ensures consistency
      // console.log(`Batch saving ${currentAreaItems.length} items for area completion`)

      if (currentAreaItems.length > 0) {
        const savePromises = currentAreaItems.map((item) =>
          countApi
            .addCountItem(session.apiId!, {
              areaId: item.areaId!,
              productId: item.productId,
              fullUnits: Math.floor(item.countedQuantity),
              partialUnit: item.countedQuantity % 1,
              notes: `Mobile app - Area: ${session.areas?.find((a) => a.id === item.areaId)?.name || 'Unknown'} (batch save)`,
            })
            .catch((error) => {
              // Log but don't fail - item might already be saved from real-time sync
              // console.log(`Item ${item.productName} may already be saved:`, error.message)
              return null
            })
        )

        await Promise.all(savePromises)
        // console.log(`Completed batch save for ${currentAreaItems.length} items`)
      } else {
        // console.log(`No items to batch save for area completion`)
      }

      // Then sync area status to backend (like web app does)
      await countApi.updateAreaStatus(
        session.apiId,
        session.currentAreaId,
        'COMPLETED'
      )

      // Then update local state
      set((state) => ({
        countSessions: state.countSessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                areas: s.areas?.map((area) =>
                  area.id === session.currentAreaId
                    ? {
                        ...area,
                        status: 'completed' as const,
                        itemsCount: currentAreaItems.length,
                        completedAt: new Date().toISOString(),
                      }
                    : area
                ),
              }
            : s
        ),
      }))

      // Find next area after completing current one
      const nextArea = get().getNextArea(sessionId)
      if (nextArea) {
        get().setCurrentArea(sessionId, nextArea.id)
        return { hasMoreAreas: true, nextArea }
      } else {
        // All areas complete - auto-complete the count (like web app does)
        // console.log('All areas completed, auto-completing count:', session.apiId)
        await countApi.updateCount(session.apiId, { status: 'COMPLETED' })

        // Update local state to COMPLETED
        get().updateCountSession(sessionId, {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        })

        return { hasMoreAreas: false, nextArea: null, countCompleted: true }
      }
    } catch (error) {
      console.error('Failed to complete area on backend:', error)
      // Don't update local state if backend sync fails
      throw error
    }
  },

  getNextArea: (sessionId) => {
    const session = get().countSessions.find((s) => s.id === sessionId)
    if (!session?.areas) return null

    // Find the first pending area
    return session.areas.find((area) => area.status === 'pending') || null
  },

  getAreaProgress: (sessionId) => {
    const session = get().countSessions.find((s) => s.id === sessionId)
    if (!session?.areas) return { completed: 0, total: 0 }

    const completed = session.areas.filter(
      (area) => area.status === 'completed'
    ).length
    return { completed, total: session.areas.length }
  },

  rehydrateCurrentSessionItems: async () => {
    try {
      const activeSession = get().getActiveSession()
      if (!activeSession || !activeSession.apiId) {
        console.log('No active session to rehydrate items for')
        return
      }

      // Get full count details from API for current session
      const response: any = await countApi.getCount(activeSession.apiId)
      const apiCount = response.data

      // Extract count items from API response areas
      const countItems: CountItem[] = []
      
      if (apiCount.areas) {
        for (const area of apiCount.areas) {
          if (area.items && Array.isArray(area.items)) {
            for (const item of area.items) {
              const countItem: CountItem = {
                id: item.id || `api-${item.productId}-${area.id}-${Date.now()}`,
                inventoryItemId: item.inventoryItemId || '',
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                productImage: item.product?.image || null,
                sku: item.product?.sku || null,
                barcode: item.barcode || '',
                unit: item.product?.unit || 'unit',
                container: item.product?.container || null,
                currentStock: item.expectedQty || 0,
                countedQuantity: item.totalQuantity || 0,
                variance: (item.totalQuantity || 0) - (item.expectedQty || 0),
                parLevel: item.expectedQty || 0,
                timestamp: item.countedAt || new Date().toISOString(),
                countSessionId: activeSession.id,
                areaId: area.id,
              }
              countItems.push(countItem)
            }
          }
        }
      }

      // Update count items for current session
      set((state) => ({
        countItems: [
          ...countItems,
          ...state.countItems.filter((item) => item.countSessionId !== activeSession.id),
        ],
      }))

      console.log(`Rehydrated ${countItems.length} count items for current session from backend`)
    } catch (error) {
      console.error('Failed to rehydrate current session items:', error)
      // Don't throw - this is a background operation
    }
  },
}))
