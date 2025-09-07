import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useCountStore } from '../stores/countStore'

export function useCountSync() {
  const { syncWithBackend, isSyncing } = useCountStore()
  const appState = useRef(AppState.currentState)

  // Sync on app startup and when app becomes active
  useEffect(() => {
    // Initial sync when hook mounts
    syncWithBackend().catch(error => {
      console.error('Initial sync failed:', error)
    })

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Sync when app comes to foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        syncWithBackend().catch(error => {
          console.error('Background-to-foreground sync failed:', error)
        })
      }
      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription?.remove()
    }
  }, [syncWithBackend])

  // Set up periodic sync every 30 seconds when app is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active' && !isSyncing) {
        syncWithBackend().catch(error => {
          console.error('Periodic sync failed:', error)
        })
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [syncWithBackend, isSyncing])

  return {
    isSyncing,
    syncNow: syncWithBackend
  }
}