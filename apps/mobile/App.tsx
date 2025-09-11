// Import polyfills first
import './global.css'
import './src/polyfills'

import { NavigationContainer } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { GluestackUIProvider } from './components/ui/gluestack-ui-provider'
import { queryClient, setupPeriodicSync } from './src/lib/queryClient'
import { RootNavigator } from './src/navigation/RootNavigator'
import { useAuthStore } from './src/stores/authStore'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state from storage
        await initializeAuth()
      } catch (e) {
        console.warn(e)
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync()
      }
    }

    prepare()

    // Set up periodic data syncing
    const cleanupSync = setupPeriodicSync()

    return cleanupSync
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <GluestackUIProvider mode='system'>
            <RootNavigator />
            <StatusBar style='auto' />
          </GluestackUIProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
