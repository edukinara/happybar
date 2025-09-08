import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import { Platform, View } from 'react-native'
import { HomeScreen } from '../screens/HomeScreen'
import { InsightsScreen } from '../screens/InsightsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { CountNavigator } from './CountNavigator'
import { InventoryNavigator } from './InventoryNavigator'

export type MainTabParamList = {
  Home: undefined
  Inventory: undefined
  Count: undefined
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
          } else if (route.name === 'Count') {
            iconName = focused ? 'clipboard' : 'clipboard-outline'
          } else if (route.name === 'Insights') {
            iconName = focused ? 'analytics' : 'analytics-outline'
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline'
          } else {
            iconName = 'help-outline'
          }

          // Special treatment for count button - premium floating action button
          if (route.name === 'Count') {
            return (
              <View
                style={{
                  backgroundColor: focused ? '#8B5CF6' : '#A855F7',
                  borderRadius: 30,
                  width: 60,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: Platform.OS === 'ios' ? -10 : 10,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 25,
                  elevation: 20,
                  borderWidth: 4,
                  borderColor: 'rgba(255,255,255,0.95)',
                }}
              >
                <Ionicons name={iconName} size={30} color='white' />
              </View>
            )
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,1)',
          backdropFilter: 'blur(20px)',
          elevation: 8,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 32 : 14,
          paddingTop: 10,
          paddingHorizontal: 16,
          borderRadius: 28,
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: Platform.OS === 'ios' ? 0 : 32,
          marginHorizontal: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
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
        name='Count'
        component={CountNavigator}
        options={{
          title: 'Count',
          tabBarLabel: '',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name='Insights'
        component={InsightsScreen}
        options={{
          title: 'Insights',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  )
}
