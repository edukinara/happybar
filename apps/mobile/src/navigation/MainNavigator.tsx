import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import { Platform, View } from 'react-native'
import { Colors } from '../constants/theme'
import { HomeScreen } from '../screens/HomeScreen'
import { InsightsScreen } from '../screens/InsightsScreen'
import { ScanScreen } from '../screens/ScanScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { InventoryNavigator } from './InventoryNavigator'

export type MainTabParamList = {
  Home: undefined
  Inventory: undefined
  Scan: undefined
  Insights: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline'
          } else if (route.name === 'Scan') {
            iconName = focused ? 'scan' : 'scan-outline'
          } else if (route.name === 'Insights') {
            iconName = focused ? 'analytics' : 'analytics-outline'
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline'
          } else {
            iconName = 'help-outline'
          }

          // Special treatment for scan button
          if (route.name === 'Scan') {
            return (
              <View
                style={{
                  backgroundColor: focused
                    ? Colors.primary
                    : Colors.primaryLight,
                  borderRadius: 30,
                  width: 60,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: Platform.OS === 'ios' ? 0 : 10,
                  shadowColor: Colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons name={iconName} size={28} color={Colors.white} />
              </View>
            )
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.white,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.gray[900],
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 24,
        },
      })}
    >
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name='Inventory'
        component={InventoryNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name='Scan'
        component={ScanScreen}
        options={{
          title: 'Quick Count',
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name='Insights'
        component={InsightsScreen}
        options={{
          title: 'Insights',
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  )
}
