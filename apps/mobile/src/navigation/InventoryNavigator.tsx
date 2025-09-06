import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { Colors } from '../constants/theme'
import { AddProductScreen } from '../screens/AddProductScreen'
import { InventoryScreen } from '../screens/InventoryScreen'
import { ProductDetailScreen } from '../screens/ProductDetailScreen'

export type InventoryStackParamList = {
  InventoryList: undefined
  ProductDetail: { productId: string }
  AddProduct: undefined
}

const Stack = createNativeStackNavigator<InventoryStackParamList>()

export function InventoryNavigator() {
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
        header: () => <></>,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name='InventoryList'
        component={InventoryScreen}
        options={{
          title: 'Inventory',
        }}
      />
      <Stack.Screen
        name='ProductDetail'
        component={ProductDetailScreen}
        options={{
          title: 'Product Details',
        }}
      />
      <Stack.Screen
        name='AddProduct'
        component={AddProductScreen}
        options={{
          title: 'Add Product',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  )
}
