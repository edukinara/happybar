import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { CountHistoryScreen } from '../screens/CountHistoryScreen'
import { useAuthStore } from '../stores/authStore'
import { AuthNavigator } from './AuthNavigator'
import { CountNavigator } from './CountNavigator'
import { MainNavigator } from './MainNavigator'

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Count: undefined
  CountHistory: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    // TODO: Add a proper loading screen
    return null
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9FAFB' },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name='Main' component={MainNavigator} />
          <Stack.Screen
            name='Count'
            component={CountNavigator}
            options={{
              title: 'Count',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name='CountHistory'
            component={CountHistoryScreen}
            options={{
              title: 'Count History',
              headerShown: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen name='Auth' component={AuthNavigator} />
      )}
    </Stack.Navigator>
  )
}
