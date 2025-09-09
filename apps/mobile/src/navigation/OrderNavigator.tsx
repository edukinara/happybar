import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { Colors } from '../constants/theme'
import { CreateOrderScreen } from '../screens/CreateOrderScreen'
import { OrderSuggestionsScreen } from '../screens/OrderSuggestionsScreen'
import OrdersScreen from '../screens/OrdersScreen'
import OrderDetailScreen from '../screens/OrderDetailScreen'

export type OrderStackParamList = {
  OrderList: undefined
  OrderSuggestions: undefined
  CreateOrder: undefined
  OrderDetail: { orderId: string }
}

const Stack = createNativeStackNavigator<OrderStackParamList>()

export function OrderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.white,
        },
        headerTintColor: Colors.gray[900],
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 24,
        },
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name='OrderList'
        component={OrdersScreen}
        options={{
          title: 'Orders',
        }}
      />
      <Stack.Screen
        name='OrderSuggestions'
        component={OrderSuggestionsScreen}
        options={{
          title: 'Order Suggestions',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name='CreateOrder'
        component={CreateOrderScreen}
        options={{
          title: 'Create Order',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name='OrderDetail'
        component={OrderDetailScreen}
        options={{
          title: 'Order Details',
        }}
      />
    </Stack.Navigator>
  )
}