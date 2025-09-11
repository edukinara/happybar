import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useColorScheme } from 'nativewind'
import React from 'react'
import { Platform, View } from 'react-native'
import { BorderRadius, Colors, Shadows } from '../constants/theme'
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
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

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
                  backgroundColor: focused ? Colors.primary : Colors.gradEnd,
                  borderRadius: BorderRadius.full,
                  width: 60,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: Platform.OS === 'ios' ? -10 : 10,
                  shadowColor: Colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.5 : 0.35,
                  shadowRadius: 8,
                  elevation: 20,
                  borderWidth: 4,
                  borderColor: isDark ? Colors.tabDark : Colors.white,
                }}
              >
                <Ionicons name={iconName} size={30} color={Colors.white} />
              </View>
            )
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: isDark ? Colors.gray[400] : Colors.gray[500],
        tabBarStyle: {
          backgroundColor: isDark ? Colors.tabDark : Colors.white,
          backdropFilter: 'blur(20px)',
          ...Shadows.lg,
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
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? Colors.gray[700] : 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: isDark ? Colors.gray[900] : Colors.white,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: isDark ? Colors.white : Colors.gray[900],
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 26,
          color: isDark ? Colors.white : Colors.gray[900],
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
