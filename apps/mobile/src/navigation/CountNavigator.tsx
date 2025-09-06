import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import CountTypeScreen from '../screens/CountTypeScreen'
import CountSetupScreen from '../screens/CountSetupScreen'
import { Colors } from '../constants/theme'

export type CountStackParamList = {
  CountType: undefined
  CountSetup: { countType: string }
}

const Stack = createNativeStackNavigator<CountStackParamList>()

export function CountNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9FAFB' },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen 
        name="CountType" 
        component={CountTypeScreen}
      />
      <Stack.Screen 
        name="CountSetup" 
        component={CountSetupScreen}
      />
    </Stack.Navigator>
  )
}