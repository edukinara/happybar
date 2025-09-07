import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import CountSetupScreen from '../screens/CountSetupScreen'
import { CountScreen } from '../screens/CountScreen'
import { ScanScreen } from '../screens/ScanScreen'
import { useCountStore } from '../stores/countStore'
import { useCountSync } from '../hooks/useCountSync'

export type CountStackParamList = {
  CountSetup: { 
    isQuickCount?: boolean
    presetType?: 'SPOT' | 'FULL' | 'CYCLE'
  } | undefined
  CountMain: undefined
  Scan: undefined
}

const Stack = createNativeStackNavigator<CountStackParamList>()

export function CountNavigator() {
  const activeSession = useCountStore((state) => state.getActiveSession())
  const { isSyncing } = useCountSync()
  const [initializing, setInitializing] = useState(true)
  
  // Wait for initial sync to complete before determining route
  useEffect(() => {
    if (!isSyncing && initializing) {
      setInitializing(false)
    }
  }, [isSyncing, initializing])
  
  // Show loading screen while syncing and initializing
  if (initializing && isSyncing) {
    return null // or a loading component
  }
  
  // Determine initial route based on whether there's an active count session
  const initialRouteName = activeSession ? 'CountMain' : 'CountSetup'
  
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#A855F7' },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name='CountSetup' component={CountSetupScreen} />
      <Stack.Screen name='CountMain' component={CountScreen} />
      <Stack.Screen name='Scan' component={ScanScreen} />
    </Stack.Navigator>
  )
}
