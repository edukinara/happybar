import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar'
import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { Pressable, ScrollView, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../constants/theme'
import { useAuthStore } from '../stores/authStore'

export function SettingsScreen() {
  const { logout, user } = useAuthStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState(true)
  const [countReminders, setCountReminders] = useState(false)

  const handleLogout = () => {
    // Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
    //   {
    //     text: 'Cancel',
    //     style: 'cancel',
    //   },
    //   {
    //     text: 'Logout',
    //     style: 'destructive',
    //     onPress: logout,
    //   },
    // ])
    void logout()
  }

  // TODO: Implement these settings screens when needed
  // const settingsGroups = [
  // {
  //   title: 'Account',
  //   icon: 'person-circle',
  //   items: [
  //     { title: 'Profile', icon: 'person', action: () => {} },
  //     { title: 'Organization', icon: 'business', action: () => {} },
  //     { title: 'Subscription', icon: 'card', action: () => {} },
  //   ],
  // },
  // {
  //   title: 'Inventory',
  //   icon: 'cube',
  //   items: [
  //     { title: 'Locations', icon: 'location', action: () => {} },
  //     { title: 'Categories', icon: 'folder', action: () => {} },
  //     { title: 'Units & Containers', icon: 'resize', action: () => {} },
  //   ],
  // },
  // {
  //   title: 'Data & Sync',
  //   icon: 'cloud',
  //   items: [
  //     { title: 'Backup & Restore', icon: 'cloud-upload', action: () => {} },
  //     { title: 'Import Products', icon: 'download', action: () => {} },
  //     { title: 'Export Data', icon: 'share', action: () => {} },
  //   ],
  // },
  // {
  //   title: 'Support',
  //   icon: 'help-circle',
  //   items: [
  //     { title: 'Help Center', icon: 'help', action: () => {} },
  //     { title: 'Contact Support', icon: 'mail', action: () => {} },
  //     { title: 'Send Feedback', icon: 'chatbubble', action: () => {} },
  //   ],
  // },
  // ]

  // TODO: Uncomment when settings groups are re-enabled
  // const renderSettingItem = (item: any, isLast: boolean = false) => (
  //   <Pressable
  //     key={item.title}
  //     onPress={item.action}
  //     style={{
  //       marginBottom: isLast ? 0 : 12,
  //     }}
  //   >
  //     <LinearGradient
  //       colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)']}
  //       start={{ x: 0, y: 0 }}
  //       end={{ x: 1, y: 1 }}
  //       style={{
  //         borderRadius: 12,
  //         padding: 16,
  //         borderWidth: 1,
  //         borderColor: 'rgba(99, 102, 241, 0.1)',
  //       }}
  //     >
  //       <HStack
  //         style={{ alignItems: 'center', justifyContent: 'space-between' }}
  //       >
  //         <HStack style={{ alignItems: 'center', gap: 12, flex: 1 }}>
  //           <Box
  //             style={{
  //               backgroundColor: Colors.primaryLight,
  //               width: 32,
  //               height: 32,
  //               borderRadius: 8,
  //               justifyContent: 'center',
  //               alignItems: 'center',
  //             }}
  //           >
  //             <Ionicons
  //               name={item.icon as keyof typeof Ionicons.glyphMap}
  //               size={16}
  //               color={Colors.primary}
  //             />
  //           </Box>
  //           <Text className='text-gray-900 font-medium flex-1'>
  //             {item.title}
  //           </Text>
  //         </HStack>
  //         <Box
  //           style={{
  //             backgroundColor: 'rgba(156, 163, 175, 0.12)',
  //             width: 28,
  //             height: 28,
  //             borderRadius: 6,
  //             justifyContent: 'center',
  //             alignItems: 'center',
  //           }}
  //         >
  //           <Ionicons name='chevron-forward' size={14} color='#9CA3AF' />
  //         </Box>
  //       </HStack>
  //     </LinearGradient>
  //   </Pressable>
  // )

  return (
    <LinearGradient
      colors={[Colors.gradStart, Colors.gradMid, Colors.gradEnd]}
      style={{ flex: 1, paddingBottom: 24 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <HStack className='items-center justify-between p-4'>
          <Heading size='xl' className='text-white font-bold'>
            Settings
          </Heading>
          <Pressable
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Ionicons name='notifications' size={24} color='white' />
          </Pressable>
        </HStack>
      </SafeAreaView>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={{ gap: 20 }}>
          {/* Profile Card */}
          <Box
            className='bg-white'
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <HStack style={{ alignItems: 'center', gap: 16 }}>
              <Avatar size='md'>
                <AvatarFallbackText>{user?.name}</AvatarFallbackText>
                <AvatarImage
                  source={{
                    uri: user?.image || '',
                  }}
                />
              </Avatar>

              <VStack className='flex-1'>
                <Heading size='lg' className='text-gray-900 font-bold'>
                  {user?.name}
                </Heading>
                <Text
                  className='text-gray-500 text-sm'
                  style={{ marginTop: 4 }}
                >
                  {user?.email}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Notifications */}
          <Box
            className='bg-white'
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Box
                style={{
                  backgroundColor: Colors.primaryLight,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name='notifications'
                  size={16}
                  color={Colors.primary}
                />
              </Box>
              <Heading size='lg' className='text-gray-900 font-bold'>
                Notifications
              </Heading>
            </HStack>

            <VStack style={{ gap: 12 }}>
              {[
                {
                  title: 'Push Notifications',
                  description: 'Receive alerts and updates',
                  enabled: notificationsEnabled,
                  onToggle: setNotificationsEnabled,
                },
                {
                  title: 'Low Stock Alerts',
                  description: 'Get notified when items are running low',
                  enabled: lowStockAlerts,
                  onToggle: setLowStockAlerts,
                },
                {
                  title: 'Count Reminders',
                  description: 'Reminders for scheduled inventory counts',
                  enabled: countReminders,
                  onToggle: setCountReminders,
                },
              ].map((item, index) => (
                <HStack
                  key={index}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <VStack className='flex-1' style={{ marginRight: 12 }}>
                    <Text className='text-gray-900 font-medium'>
                      {item.title}
                    </Text>
                    <Text
                      className='text-gray-600 text-sm'
                      style={{ marginTop: 2 }}
                    >
                      {item.description}
                    </Text>
                  </VStack>
                  <Switch
                    value={item.enabled}
                    onValueChange={item.onToggle}
                    trackColor={{
                      false: '#F3F4F6',
                      true: Colors.primary + '40',
                    }}
                    thumbColor={item.enabled ? Colors.primary : '#9CA3AF'}
                  />
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Settings Groups */}
          {/* {settingsGroups.map((group, groupIndex) => (
            <Box
              className='bg-white'
              key={groupIndex}
              style={{
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 5,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <HStack
                style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}
              >
                <Box
                  style={{
                    backgroundColor: Colors.primaryLight,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name={group.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={Colors.primary}
                  />
                </Box>
                <Heading size='lg' className='text-gray-900 font-bold'>
                  {group.title}
                </Heading>
              </HStack>

              <VStack>
                {group.items.map((item, index) =>
                  renderSettingItem(item, index === group.items.length - 1)
                )}
              </VStack>
            </Box>
          ))} */}

          {/* App Info */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
            style={{
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <VStack style={{ alignItems: 'center', gap: 8 }}>
              <Text className='text-white/80 text-sm font-medium'>
                Happy Bar Mobile
              </Text>
              {/* <Text className='text-white/60 text-xs'>
                Version 1.0.0 • Build 1
              </Text> */}
              <Text
                className='text-white/60 text-xs text-center'
                style={{ marginTop: 4 }}
              >
                © 2025 Happy Bar. All rights reserved.
              </Text>
            </VStack>
          </LinearGradient>

          {/* Logout Button */}
          <Pressable onPress={handleLogout}>
            <LinearGradient
              colors={[Colors.error, '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 18,
                alignItems: 'center',
                shadowColor: Colors.error,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <HStack style={{ alignItems: 'center', gap: 12 }}>
                <Ionicons name='log-out' size={20} color='white' />
                <Text className='text-white font-semibold text-base'>
                  Logout
                </Text>
              </HStack>
            </LinearGradient>
          </Pressable>
        </VStack>
      </ScrollView>
    </LinearGradient>
  )
}
