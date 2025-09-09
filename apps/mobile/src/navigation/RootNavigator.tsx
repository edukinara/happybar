import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { CountHistoryScreen } from '../screens/CountHistoryScreen'
import { CreateOrderScreen } from '../screens/CreateOrderScreen'
import { OrderSuggestionsScreen } from '../screens/OrderSuggestionsScreen'
import OrdersScreen from '../screens/OrdersScreen'
import OrderDetailScreen from '../screens/OrderDetailScreen'
import { useAuthStore } from '../stores/authStore'
import { AuthNavigator } from './AuthNavigator'
import { CountNavigator } from './CountNavigator'
import { MainNavigator } from './MainNavigator'

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Count: undefined
  CountHistory: undefined
  Orders: undefined
  OrderDetail: { orderId: string }
  OrderSuggestions: undefined
  CreateOrder: undefined
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
          <Stack.Screen
            name='Orders'
            component={OrdersScreen}
            options={{
              title: 'Orders',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name='OrderDetail'
            component={OrderDetailScreen}
            options={{
              title: 'Order Details',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name='OrderSuggestions'
            component={OrderSuggestionsScreen}
            options={{
              title: 'Order Suggestions',
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name='CreateOrder'
            component={CreateOrderScreen}
            options={{
              title: 'Create Order',
              headerShown: false,
              presentation: 'modal',
            }}
          />
        </>
      ) : (
        <Stack.Screen name='Auth' component={AuthNavigator} />
      )}
    </Stack.Navigator>
  )
}
