import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar'
import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { ScrollView, Switch } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageGradient } from '../components/PageGradient'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedText,
} from '../components/themed'
import { useAuthStore } from '../stores/authStore'

export function SettingsScreen() {
  const insets = useSafeAreaInsets()
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
    <PageGradient style={{ paddingBottom: 24 }}>
      {/* Header */}
      {/* <SafeAreaView edges={['top']}>
        <HStack className='items-center justify-between p-4'>
          <ThemedHeading variant='h1' color='onGradient' weight='bold'>
            Settings
          </ThemedHeading>
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
      </SafeAreaView> */}
      {/* Header */}
      <StatusBar style='light' />

      {/* Header */}

      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center p-2'>
          <ThemedHeading variant='h2' color='onGradient' weight='bold'>
            Settings
          </ThemedHeading>
          {/* <ThemedButton
                  variant='primary'
                  className='bg-white/20 dark:bg-white/20 rounded-full size-10 p-0'
                >
                  <Ionicons name='notifications' size={24} color='white' />
                </ThemedButton> */}
        </HStack>
      </Box>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={{ gap: 20 }}>
          {/* Profile Card */}
          <ThemedCard variant='primary' size='lg'>
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
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  {user?.name}
                </ThemedHeading>
                <ThemedText
                  variant='caption'
                  color='muted'
                  style={{ marginTop: 4 }}
                >
                  {user?.email}
                </ThemedText>
              </VStack>
            </HStack>
          </ThemedCard>

          {/* Notifications */}
          <ThemedCard variant='primary' size='lg'>
            <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Box
                style={{
                  backgroundColor: '#A78BFADD',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name='notifications' size={16} color='#8B5CF6' />
              </Box>
              <ThemedHeading variant='h3' weight='bold' color='primary'>
                Notifications
              </ThemedHeading>
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
                    <ThemedText variant='body' weight='medium' color='primary'>
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      variant='caption'
                      color='muted'
                      style={{ marginTop: 2 }}
                    >
                      {item.description}
                    </ThemedText>
                  </VStack>
                  <Switch
                    value={item.enabled}
                    onValueChange={item.onToggle}
                    trackColor={{
                      false: '#F3F4F6',
                      true: '#8B5CF640',
                    }}
                    thumbColor={item.enabled ? '#8B5CF6' : '#9CA3AF'}
                  />
                </HStack>
              ))}
            </VStack>
          </ThemedCard>

          {/* Settings Groups */}
          {/* {settingsGroups.map((group, groupIndex) => (
            <Box
              className={themeClasses.bg.card}
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
                    backgroundColor: '#A78BFADD',
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
                    color='#8B5CF6'
                  />
                </Box>
                <Heading size='lg' className={cn('font-bold', themeClasses.text.primary)}>
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
            colors={['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.05)']}
            style={{
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <VStack style={{ alignItems: 'center', gap: 8 }}>
              <ThemedText
                variant='body'
                color='onGradientMuted'
                weight='medium'
              >
                Happy Bar Mobile
              </ThemedText>
              {/* <ThemedText variant='caption' color='onGradientMuted'>
                Version 1.0.0 • Build 1
              </ThemedText> */}
              <ThemedText
                variant='caption'
                color='onGradientMuted'
                align='center'
                style={{ marginTop: 4 }}
              >
                © 2025 Happy Bar. All rights reserved.
              </ThemedText>
            </VStack>
          </LinearGradient>

          {/* Logout Button */}
          <ThemedButton
            variant='danger'
            size='lg'
            onPress={handleLogout}
            fullWidth
            className='bg-red-500 dark:bg-red-700 border-transparent shadow-lg rounded-lg'
          >
            <HStack className='gap-2'>
              <Ionicons name='log-out' size={20} color='white' />
              <ThemedText variant='body' weight='semibold' color='onGradient'>
                Logout
              </ThemedText>
            </HStack>
          </ThemedButton>
        </VStack>
      </ScrollView>
    </PageGradient>
  )
}
