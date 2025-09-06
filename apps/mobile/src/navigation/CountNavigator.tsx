import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import CountSetupScreen from '../screens/CountSetupScreen'
import CountTypeScreen from '../screens/CountTypeScreen'

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
        contentStyle: { backgroundColor: '#A855F7' },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name='CountType' component={CountTypeScreen} />
      <Stack.Screen name='CountSetup' component={CountSetupScreen} />
    </Stack.Navigator>
  )
}
