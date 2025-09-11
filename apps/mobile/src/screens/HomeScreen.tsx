import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'

import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { PageGradient } from '../components/PageGradient'
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedText,
} from '../components/themed'
import { usePageGradient } from '../constants/gradients'
import { useInventoryAnalytics } from '../hooks/useAnalyticsData'
import { useCountSync } from '../hooks/useCountSync'
import {
  useApproveCount,
  useCompletedCounts,
  useLowStockItems,
} from '../hooks/useInventoryData'
import { useAuthStore } from '../stores/authStore'
import { useCountStore } from '../stores/countStore'

export function HomeScreen() {
  const user = useAuthStore((state) => state.user)
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const gradientColors = usePageGradient()

  // Fetch real data
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useInventoryAnalytics('7d')
  const { isLoading: lowStockLoading, refetch: refetchLowStock } =
    useLowStockItems()

  // Completed counts data
  const {
    data: completedCounts = [],
    isLoading: completedCountsLoading,
    refetch: refetchCompletedCounts,
  } = useCompletedCounts()
  const approveCountMutation = useApproveCount()

  // Count store data
  const { getTotalCounts, getActiveSession } = useCountStore()
  const totalCounts = getTotalCounts()
  const activeSession = getActiveSession()

  // Sync functionality
  const { syncNow } = useCountSync()

  const isLoading = analyticsLoading || lowStockLoading

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Refresh all data in parallel including count sync
      await Promise.all([
        refetchAnalytics(),
        refetchLowStock(),
        refetchCompletedCounts(),
        syncNow(),
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refetchAnalytics, refetchLowStock, refetchCompletedCounts, syncNow])

  // Handle count approval with confirmation
  const handleApproveCount = useCallback(
    (count: any) => {
      Alert.alert(
        'Approve Count',
        `Are you sure you want to approve "${count.name}"?\n\nThis will apply the count results to your inventory and cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Approve',
            style: 'default',
            onPress: async () => {
              try {
                await approveCountMutation.mutateAsync(count.id)

                // Refresh all data after successful approval
                await Promise.all([
                  refetchAnalytics(),
                  refetchLowStock(),
                  refetchCompletedCounts(),
                  syncNow(),
                ])

                Alert.alert(
                  'Success',
                  `Count "${count.name}" has been approved and applied to inventory.`
                )
              } catch (error) {
                console.error('Failed to approve count:', error)
                Alert.alert(
                  'Error',
                  'Failed to approve count. Please try again.'
                )
              }
            },
          },
        ]
      )
    },
    [
      approveCountMutation,
      refetchAnalytics,
      refetchLowStock,
      refetchCompletedCounts,
      syncNow,
    ]
  )

  const renderHeader = () => (
    <HStack className='justify-between items-center'>
      <HStack space='md' className='items-center flex-1'>
        <Box className='size-12 bg-white/20 backdrop-blur-sm rounded-full justify-center items-center border-2 border-white/30'>
          <HappyBarLogo size={28} color='white' />
        </Box>
        <VStack className='flex-1' space='xs'>
          <ThemedText variant='h4' color='onGradient' weight='bold'>
            Welcome back, {user?.name || 'Bar Manager'}!
          </ThemedText>
          <ThemedText variant='caption' color='onGradientMuted'>
            Here's your inventory overview
          </ThemedText>
        </VStack>
      </HStack>
      <Pressable className='size-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 justify-center items-center'>
        <Ionicons name='notifications-outline' size={24} color='white' />
      </Pressable>
    </HStack>
  )

  const renderStats = () => (
    <VStack className='mb-8' space='lg'>
      <ThemedHeading variant='h3' color='onGradient'>
        Analytics
      </ThemedHeading>
      <VStack space='md'>
        <HStack space='md'>
          <ThemedCard variant='primary' size='md' className='flex-1'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-green-100 rounded-full justify-center items-center'>
                <Ionicons name='trending-up' size={16} color='#059669' />
              </Box>
              <ThemedText variant='overline' color='success' weight='bold'>
                +12%
              </ThemedText>
            </HStack>
            <VStack space='xs'>
              <ThemedText variant='h2' color='primary' weight='bold'>
                {analytics?.totalValue
                  ? `$${(analytics.totalValue / 1000).toFixed(1)}K`
                  : '$0'}
              </ThemedText>
              <ThemedText variant='caption' color='secondary'>
                Total Value
              </ThemedText>
            </VStack>
          </ThemedCard>

          <ThemedCard variant='primary' size='md' className='flex-1'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-purple-100 rounded-full justify-center items-center'>
                <Ionicons name='cube-outline' size={16} color='#7C3AED' />
              </Box>
              <ThemedText variant='overline' color='purple' weight='bold'>
                +3
              </ThemedText>
            </HStack>
            <VStack space='xs'>
              <ThemedText variant='h2' color='primary' weight='bold'>
                {analytics?.totalProducts?.toString() || '0'}
              </ThemedText>
              <ThemedText variant='caption' color='secondary'>
                Products
              </ThemedText>
            </VStack>
          </ThemedCard>
        </HStack>

        <HStack space='md'>
          <ThemedCard variant='primary' size='md' className='flex-1'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-amber-100 rounded-full justify-center items-center'>
                <Ionicons name='speedometer' size={16} color='#D97706' />
              </Box>
              <ThemedText variant='overline' color='warning' weight='bold'>
                -5%
              </ThemedText>
            </HStack>
            <VStack space='xs'>
              <ThemedText variant='h2' color='primary' weight='bold'>
                {analytics?.turnoverRate
                  ? `${analytics.turnoverRate.toFixed(1)}x`
                  : '0x'}
              </ThemedText>
              <ThemedText variant='caption' color='secondary'>
                Turnover
              </ThemedText>
            </VStack>
          </ThemedCard>

          <ThemedCard variant='primary' size='md' className='flex-1'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-blue-100 rounded-full justify-center items-center'>
                <Ionicons name='analytics' size={16} color='#2563EB' />
              </Box>
              <ThemedText
                variant='overline'
                className='text-blue-600 dark:text-blue-400'
                weight='bold'
              >
                -0.5%
              </ThemedText>
            </HStack>
            <VStack space='xs'>
              <ThemedText variant='h2' color='primary' weight='bold'>
                {analytics?.wastePercentage
                  ? `${analytics.wastePercentage.toFixed(1)}%`
                  : '0%'}
              </ThemedText>
              <ThemedText variant='caption' color='secondary'>
                Waste
              </ThemedText>
            </VStack>
          </ThemedCard>
        </HStack>
      </VStack>
    </VStack>
  )

  const renderStartCountButton = () => {
    return (
      <VStack className='mb-8' space='lg'>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Pressable
            className='p-6 border-2 border-white/20 rounded-3xl'
            onPress={() => {
              if (activeSession) {
                // Resume active count - navigate to Count tab, then to Scan screen
                ;(navigation.navigate as any)('Count', {
                  screen: 'CountMain',
                })
              } else {
                // Start new count - go directly to setup with progressive flow
                ;(navigation.navigate as any)('Count', {
                  screen: 'CountSetup',
                })
              }
            }}
          >
            <VStack className='items-center' space='md'>
              <Box className='size-16 bg-white/20 rounded-full justify-center items-center border border-white/30'>
                <Ionicons
                  name={activeSession ? 'play-circle' : 'add-circle'}
                  size={32}
                  color='white'
                />
              </Box>
              <VStack className='items-center' space='xs'>
                <ThemedText
                  variant='h4'
                  color='onGradient'
                  weight='bold'
                  align='center'
                >
                  {activeSession ? 'Resume Count' : 'Start New Count'}
                </ThemedText>
                {activeSession ? (
                  <VStack className='items-center' space='xs'>
                    <ThemedText
                      variant='body'
                      color='onGradientSubtle'
                      align='center'
                    >
                      {activeSession.name}
                    </ThemedText>
                    <ThemedText variant='caption' color='onGradientMuted'>
                      {activeSession.type} • {activeSession.locationName}
                    </ThemedText>
                  </VStack>
                ) : (
                  <ThemedText
                    variant='body'
                    color='onGradientSubtle'
                    align='center'
                  >
                    Create a new inventory count
                  </ThemedText>
                )}
              </VStack>
            </VStack>
          </Pressable>
        </LinearGradient>
      </VStack>
    )
  }

  const renderQuickActions = () => {
    return (
      <VStack className='mb-8' space='lg'>
        <ThemedHeading variant='h3' color='onGradient'>
          Quick Actions
        </ThemedHeading>
        <VStack space='md'>
          {/* Only show Quick Count if no full/cycle count is in progress */}
          <HStack space='md'>
            {activeSession ? null : (
              <Pressable
                className='flex-1'
                onPress={() => {
                  if (activeSession) {
                    // Resume active count by going to the count screen
                    ;(navigation.navigate as any)('Count', {
                      screen: 'CountMain',
                    })
                  } else {
                    // Quick count - go to setup with SPOT type pre-selected
                    ;(navigation.navigate as any)('Count', {
                      screen: 'CountSetup',
                      params: {
                        isQuickCount: true,
                        presetType: 'SPOT',
                      },
                    })
                  }
                }}
              >
                <ThemedCard
                  variant='primary'
                  size='md'
                  className='items-center'
                >
                  <VStack className='items-center' space='sm'>
                    <Box className='size-12 bg-purple-100 rounded-full justify-center items-center'>
                      <Ionicons name='scan' size={24} color='#7C3AED' />
                    </Box>
                    <ThemedText
                      variant='caption'
                      color='primary'
                      weight='semibold'
                      align='center'
                    >
                      Quick Count
                    </ThemedText>
                  </VStack>
                </ThemedCard>
              </Pressable>
            )}
            <Pressable
              className='flex-1'
              onPress={() => {
                Alert.alert(
                  'Create Order',
                  'How would you like to create your order?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Smart Suggestions',
                      onPress: () =>
                        (navigation as any).navigate('OrderSuggestions'),
                    },
                    {
                      text: 'Manual Entry',
                      onPress: () =>
                        (navigation as any).navigate('CreateOrder'),
                    },
                  ]
                )
              }}
            >
              <ThemedCard variant='primary' size='md' className='items-center'>
                <VStack className='items-center' space='sm'>
                  <Box className='size-12 bg-blue-100 rounded-full justify-center items-center'>
                    <Ionicons name='cart' size={24} color='#2563EB' />
                  </Box>
                  <ThemedText
                    variant='caption'
                    color='primary'
                    weight='semibold'
                    align='center'
                  >
                    Create Order
                  </ThemedText>
                </VStack>
              </ThemedCard>
            </Pressable>
            <Pressable
              className='flex-1'
              onPress={() => (navigation as any).navigate('Orders')}
            >
              <ThemedCard variant='primary' size='md' className='items-center'>
                <VStack className='items-center' space='sm'>
                  <Box className='size-12 bg-green-100 rounded-full justify-center items-center'>
                    <Ionicons name='receipt' size={24} color='#059669' />
                  </Box>
                  <ThemedText
                    variant='caption'
                    color='primary'
                    weight='semibold'
                    align='center'
                  >
                    View Orders
                  </ThemedText>
                </VStack>
              </ThemedCard>
            </Pressable>
          </HStack>
        </VStack>
      </VStack>
    )
  }

  const renderAlerts = () => {
    if (isLoading) return null

    return (
      <VStack className='mb-8' space='lg'>
        <ThemedText variant='h3' color='onGradient' weight='bold'>
          Alerts
        </ThemedText>
        <VStack space='md'>
          {analytics && analytics.outOfStockItems > 0 && (
            <ThemedCard
              variant='primary'
              size='md'
              className='bg-red-50/60 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/80 dark:border-red-800/40'
            >
              <HStack className='items-center' space='md'>
                <Box className='size-10 bg-red-100 dark:bg-red-800/50 rounded-full justify-center items-center'>
                  <Ionicons name='alert-circle' size={20} color='#DC2626' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <ThemedText variant='body' weight='bold' color='danger'>
                    {analytics.outOfStockItems} Items Out of Stock
                  </ThemedText>
                  <ThemedText variant='caption' color='danger'>
                    Items need immediate reordering
                  </ThemedText>
                </VStack>
              </HStack>
            </ThemedCard>
          )}

          {analytics && analytics.lowStockItems > 0 && (
            <ThemedCard
              variant='primary'
              size='md'
              className='bg-amber-50/60 dark:bg-amber-900/20 backdrop-blur-sm border border-amber-200/80 dark:border-amber-800/40'
            >
              <HStack className='items-center' space='md'>
                <Box className='size-10 bg-amber-100 dark:bg-amber-800/50 rounded-full justify-center items-center'>
                  <Ionicons name='warning' size={20} color='#D97706' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <ThemedText variant='body' weight='bold' color='warning'>
                    Low Stock Alert
                  </ThemedText>
                  <ThemedText variant='caption' color='warning'>
                    {analytics.lowStockItems} items below par level
                  </ThemedText>
                </VStack>
              </HStack>
            </ThemedCard>
          )}

          {(!analytics ||
            (analytics.outOfStockItems === 0 &&
              analytics.lowStockItems === 0)) && (
            <ThemedCard
              variant='primary'
              size='md'
              className='bg-green-50/90 dark:bg-green-900/20 backdrop-blur-sm border border-green-200/80 dark:border-green-800/40'
            >
              <HStack className='items-center' space='md'>
                <Box className='w-10 h-10 bg-green-100 dark:bg-green-800/50 rounded-full justify-center items-center'>
                  <Ionicons name='checkmark-circle' size={20} color='#059669' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <ThemedText variant='body' weight='bold' color='success'>
                    All Stock Levels Good
                  </ThemedText>
                  <ThemedText variant='caption' color='success'>
                    No critical inventory issues
                  </ThemedText>
                </VStack>
              </HStack>
            </ThemedCard>
          )}
        </VStack>
      </VStack>
    )
  }

  const renderCompletedCounts = () => {
    if (completedCountsLoading || completedCounts.length === 0) {
      return null
    }

    return (
      <VStack className='mb-8' space='lg'>
        <HStack className='justify-between items-center'>
          <ThemedText variant='h3' color='onGradient' weight='bold'>
            Pending Approval
          </ThemedText>
          <ThemedBadge variant='warning' size='sm'>
            {completedCounts.length}
          </ThemedBadge>
        </HStack>
        <VStack space='md'>
          {completedCounts.map((count) => (
            <ThemedCard key={count.id} variant='primary' size='md'>
              <ThemedText variant='body' weight='bold' color='primary'>
                {count.name}
              </ThemedText>
              <HStack className='justify-between items-end'>
                <VStack className='flex-1 mr-4' space='xs'>
                  <ThemedText variant='caption' color='secondary'>
                    {count.type} • {count.location.name}
                  </ThemedText>
                  <ThemedText variant='caption' color='muted'>
                    Completed:{' '}
                    {new Date(count.completedAt).toLocaleDateString()}
                  </ThemedText>
                  {count.itemsCounted && (
                    <ThemedText
                      variant='caption'
                      weight='medium'
                      className='text-blue-600 dark:text-blue-400'
                    >
                      {count.itemsCounted} items counted
                    </ThemedText>
                  )}
                </VStack>
                <ThemedButton
                  variant='outline'
                  size='sm'
                  onPress={() => handleApproveCount(count)}
                  loading={approveCountMutation.isPending}
                  className='bg-green-500 dark:bg-green-600 border-transparent min-w-[80px]'
                  icon={
                    <Ionicons name='checkmark-circle' size={16} color='white' />
                  }
                >
                  <ThemedText
                    variant='caption'
                    weight='bold'
                    color='onGradient'
                  >
                    Approve
                  </ThemedText>
                </ThemedButton>
              </HStack>
            </ThemedCard>
          ))}
        </VStack>
      </VStack>
    )
  }

  return (
    <PageGradient>
      {/* Sticky Header with Safe Area */}
      <Box
        className='px-5 pb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        {renderHeader()}
      </Box>

      {/* Scrollable Content */}
      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          padding: 16,
          paddingTop: 24,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='white'
            colors={['#8B5CF6']}
            progressBackgroundColor='white'
          />
        }
      >
        {renderStartCountButton()}
        {renderCompletedCounts()}
        {renderAlerts()}
        {renderStats()}
        {renderQuickActions()}
      </ScrollView>
    </PageGradient>
  )
}
