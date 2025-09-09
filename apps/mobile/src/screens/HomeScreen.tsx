import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { HappyBarLogo } from '../components/brand/HappyBarLogo'
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
          <Text className='text-white text-xl font-bold'>
            Welcome back, {user?.name || 'Bar Manager'}!
          </Text>
          <Text className='text-white/80 text-sm'>
            Here's your inventory overview
          </Text>
        </VStack>
      </HStack>
      <Pressable className='size-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 justify-center items-center'>
        <Ionicons name='notifications-outline' size={24} color='white' />
      </Pressable>
    </HStack>
  )

  const renderStats = () => (
    <VStack className='mb-8' space='lg'>
      <Text className='text-white text-xl font-bold'>Analytics</Text>
      <VStack space='md'>
        <HStack space='md'>
          <Card className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-green-100 rounded-full justify-center items-center'>
                <Ionicons name='trending-up' size={16} color='#059669' />
              </Box>
              <Text className='text-xs font-bold text-green-600'>+12%</Text>
            </HStack>
            <VStack space='xs'>
              <Text className='text-2xl font-bold text-gray-900'>
                {analytics?.totalValue
                  ? `$${(analytics.totalValue / 1000).toFixed(1)}K`
                  : '$0'}
              </Text>
              <Text className='text-sm text-gray-600'>Total Value</Text>
            </VStack>
          </Card>

          <Card className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-purple-100 rounded-full justify-center items-center'>
                <Ionicons name='cube-outline' size={16} color='#7C3AED' />
              </Box>
              <Text className='text-xs font-bold text-purple-600'>+3</Text>
            </HStack>
            <VStack space='xs'>
              <Text className='text-2xl font-bold text-gray-900'>
                {analytics?.totalProducts?.toString() || '0'}
              </Text>
              <Text className='text-sm text-gray-600'>Products</Text>
            </VStack>
          </Card>
        </HStack>

        <HStack space='md'>
          <Card className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-amber-100 rounded-full justify-center items-center'>
                <Ionicons name='speedometer' size={16} color='#D97706' />
              </Box>
              <Text className='text-xs font-bold text-amber-600'>-5%</Text>
            </HStack>
            <VStack space='xs'>
              <Text className='text-2xl font-bold text-gray-900'>
                {analytics?.turnoverRate
                  ? `${analytics.turnoverRate.toFixed(1)}x`
                  : '0x'}
              </Text>
              <Text className='text-sm text-gray-600'>Turnover</Text>
            </VStack>
          </Card>

          <Card className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50'>
            <HStack className='justify-between items-center mb-3'>
              <Box className='w-8 h-8 bg-blue-100 rounded-full justify-center items-center'>
                <Ionicons name='analytics' size={16} color='#2563EB' />
              </Box>
              <Text className='text-xs font-bold text-blue-600'>-0.5%</Text>
            </HStack>
            <VStack space='xs'>
              <Text className='text-2xl font-bold text-gray-900'>
                {analytics?.wastePercentage
                  ? `${analytics.wastePercentage.toFixed(1)}%`
                  : '0%'}
              </Text>
              <Text className='text-sm text-gray-600'>Waste</Text>
            </VStack>
          </Card>
        </HStack>
      </VStack>
    </VStack>
  )

  const renderStartCountButton = () => {
    return (
      <VStack className='mb-8' space='lg'>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
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
                <Text className='text-white text-xl font-bold'>
                  {activeSession ? 'Resume Count' : 'Start New Count'}
                </Text>
                {activeSession ? (
                  <VStack className='items-center' space='xs'>
                    <Text className='text-white/80 text-sm text-center'>
                      {activeSession.name}
                    </Text>
                    <Text className='text-white/60 text-xs'>
                      {activeSession.type} • {activeSession.locationName}
                    </Text>
                  </VStack>
                ) : (
                  <Text className='text-white/80 text-sm text-center'>
                    Create a new inventory count
                  </Text>
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
        <Text className='text-white text-xl font-bold'>Quick Actions</Text>
        <VStack space='md'>
          {/* Only show Quick Count if no full/cycle count is in progress */}
          <HStack space='md'>
            {activeSession ? null : (
              <Pressable
                className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 items-center shadow-lg'
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
                <VStack className='items-center' space='sm'>
                  <Box className='size-12 bg-purple-100 rounded-full justify-center items-center'>
                    <Ionicons name='scan' size={24} color='#7C3AED' />
                  </Box>
                  <Text className='text-sm font-semibold text-gray-900'>
                    Quick Count
                  </Text>
                  {totalCounts > 0 && (
                    <Text className='text-xs text-purple-600 font-medium'>
                      {totalCounts} counted
                    </Text>
                  )}
                </VStack>
              </Pressable>
            )}
            <Pressable 
              onPress={() => {
                Alert.alert(
                  'Create Order',
                  'How would you like to create your order?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Smart Suggestions',
                      onPress: () => (navigation as any).navigate('OrderSuggestions')
                    },
                    {
                      text: 'Manual Entry',
                      onPress: () => (navigation as any).navigate('CreateOrder')
                    }
                  ]
                )
              }}
              className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 items-center shadow-lg'
            >
              <VStack className='items-center' space='sm'>
                <Box className='size-12 bg-blue-100 rounded-full justify-center items-center'>
                  <Ionicons name='cart' size={24} color='#2563EB' />
                </Box>
                <Text className='text-sm font-semibold text-gray-900'>
                  Create Order
                </Text>
              </VStack>
            </Pressable>
            <Pressable 
              onPress={() => (navigation as any).navigate('Orders')}
              className='flex-1 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 items-center shadow-lg'
            >
              <VStack className='items-center' space='sm'>
                <Box className='size-12 bg-green-100 rounded-full justify-center items-center'>
                  <Ionicons name='receipt' size={24} color='#059669' />
                </Box>
                <Text className='text-sm font-semibold text-gray-900'>
                  View Orders
                </Text>
              </VStack>
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
        <Text className='text-white text-xl font-bold'>Alerts</Text>
        <VStack space='md'>
          {analytics && analytics.outOfStockItems > 0 && (
            <Card className='p-4 bg-red-50/60 backdrop-blur-sm border border-red-200/80 rounded-2xl shadow-lg'>
              <HStack className='items-center' space='md'>
                <Box className='size-10 bg-red-100 rounded-full justify-center items-center'>
                  <Ionicons name='alert-circle' size={20} color='#DC2626' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <Text className='font-bold text-red-800'>
                    {analytics.outOfStockItems} Items Out of Stock
                  </Text>
                  <Text className='text-sm text-red-600'>
                    Items need immediate reordering
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {analytics && analytics.lowStockItems > 0 && (
            <Card className='p-4 bg-amber-50/60 backdrop-blur-sm border border-amber-200/80 rounded-2xl shadow-lg'>
              <HStack className='items-center' space='md'>
                <Box className='size-10 bg-amber-100 rounded-full justify-center items-center'>
                  <Ionicons name='warning' size={20} color='#D97706' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <Text className='font-bold text-amber-800'>
                    Low Stock Alert
                  </Text>
                  <Text className='text-sm text-amber-600'>
                    {analytics.lowStockItems} items below par level
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {(!analytics ||
            (analytics.outOfStockItems === 0 &&
              analytics.lowStockItems === 0)) && (
            <Card className='p-4 bg-green-50/90 backdrop-blur-sm border border-green-200/80 rounded-2xl shadow-lg'>
              <HStack className='items-center' space='md'>
                <Box className='w-10 h-10 bg-green-100 rounded-full justify-center items-center'>
                  <Ionicons name='checkmark-circle' size={20} color='#059669' />
                </Box>
                <VStack className='flex-1' space='xs'>
                  <Text className='font-bold text-green-800'>
                    All Stock Levels Good
                  </Text>
                  <Text className='text-sm text-green-600'>
                    No critical inventory issues
                  </Text>
                </VStack>
              </HStack>
            </Card>
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
          <Text className='text-white text-xl font-bold'>Pending Approval</Text>
          <Box className='px-2 py-1 bg-orange-500 rounded-full'>
            <Text className='text-white text-xs font-bold'>
              {completedCounts.length}
            </Text>
          </Box>
        </HStack>
        <VStack space='md'>
          {completedCounts.map((count) => (
            <Card
              key={count.id}
              className='p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg'
            >
              <HStack className='justify-between items-start'>
                <VStack className='flex-1 mr-4' space='xs'>
                  <Text className='text-lg font-bold text-gray-900'>
                    {count.name}
                  </Text>
                  <Text className='text-sm text-gray-600'>
                    {count.type} • {count.location.name}
                  </Text>
                  <Text className='text-xs text-gray-500'>
                    Completed:{' '}
                    {new Date(count.completedAt).toLocaleDateString()}
                  </Text>
                  {count.itemsCounted && (
                    <Text className='text-xs text-blue-600 font-medium'>
                      {count.itemsCounted} items counted
                    </Text>
                  )}
                </VStack>
                <Pressable
                  className='px-4 py-2 bg-green-500 rounded-lg items-center justify-center min-w-[80px]'
                  onPress={() => handleApproveCount(count)}
                  disabled={approveCountMutation.isPending}
                >
                  {approveCountMutation.isPending ? (
                    <Text className='text-white text-sm font-bold'>...</Text>
                  ) : (
                    <>
                      <Ionicons
                        name='checkmark-circle'
                        size={16}
                        color='white'
                      />
                      <Text className='text-white text-sm font-bold mt-1'>
                        Approve
                      </Text>
                    </>
                  )}
                </Pressable>
              </HStack>
            </Card>
          ))}
        </VStack>
      </VStack>
    )
  }

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
          padding: 20,
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
    </LinearGradient>
  )
}
