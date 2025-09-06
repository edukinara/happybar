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

          // Special treatment for scan button - beautiful floating action button
          if (route.name === 'Scan') {
            return (
              <View
                style={{
                  backgroundColor: focused ? '#8B5CF6' : '#A855F7',
                  borderRadius: 32,
                  width: 64,
                  height: 64,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: Platform.OS === 'ios' ? 0 : 12,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 12,
                  borderWidth: 4,
                  borderColor: 'white',
                }}
              >
                <Ionicons name={iconName} size={30} color="white" />
              </View>
            )
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: 'white',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 26,
          color: '#111827',
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
