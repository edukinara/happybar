import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { CountItem, useCountStore } from '../stores/countStore'
import { pluralize } from '../utils/pluralize'

// Design system colors
const colors = {
  primary: '#6366F1',
  accent: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  primaryLight: '#EEF2FF',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',
  errorLight: '#FEF2F2',
}

type FilterType = 'all' | 'today' | 'variance' | 'session'

export function CountHistoryScreen() {
  const navigation = useNavigation()
  const [filter, setFilter] = useState<FilterType>('all')
  const [refreshing, setRefreshing] = useState(false)

  const {
    countItems,
    countSessions,
    clearCountItems,
    removeCountItem,
    getTotalCounts,
  } = useCountStore()

  // Helper function to get area name by ID
  const getAreaName = (
    areaId: string | undefined,
    sessionId: string | null
  ) => {
    if (!areaId || !sessionId) return null
    const session = countSessions.find((s) => s.id === sessionId)
    const area = session?.areas?.find((a) => a.id === areaId)
    return area?.name || null
  }

  const onRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const getFilteredItems = () => {
    const today = new Date().toDateString()

    switch (filter) {
      case 'today':
        return countItems.filter(
          (item) => new Date(item.timestamp).toDateString() === today
        )
      case 'variance':
        return countItems.filter((item) => item.variance !== 0)
      case 'session':
        return countItems.filter((item) => item.countSessionId !== null)
      default:
        return countItems
    }
  }

  const filteredItems = getFilteredItems()

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Counts',
      'Are you sure you want to clear all count history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearCountItems(),
        },
      ]
    )
  }

  const handleDeleteItem = (item: CountItem) => {
    Alert.alert('Delete Count', `Delete count for ${item.productName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeCountItem(item.id),
      },
    ])
  }

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return colors.success
    if (Math.abs(variance) <= 2) return colors.warning
    return colors.error
  }

  const getVarianceBackground = (variance: number) => {
    if (variance === 0) return colors.successLight
    if (Math.abs(variance) <= 2) return colors.warningLight
    return colors.errorLight
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      )
    }
  }

  const renderCountItem = ({ item }: { item: CountItem }) => {
    const areaName = getAreaName(item.areaId, item.countSessionId)
    return (
      <Box
        className='bg-white'
        style={{
          borderRadius: 16,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Pressable
          style={{ padding: 16 }}
          onLongPress={() => handleDeleteItem(item)}
        >
          <HStack className='items-center justify-between'>
            {/* Product Image */}
            <Box style={{ marginRight: 12 }}>
              <ProductImage
                uri={item.productImage}
                {...ProductImageVariants.small}
              />
            </Box>

            {/* Product Info */}
            <VStack className='flex-1' style={{ marginRight: 16 }}>
              <Text className='text-gray-900 font-semibold text-base mb-1'>
                {item.productName}
              </Text>
              <Text className='text-gray-500 text-sm'>
                {item.sku && `SKU: ${item.sku} • `}
                {formatTimestamp(item.timestamp)}
              </Text>
              <HStack className='items-center mt-1' space='sm'>
                {item.countSessionId && (
                  <Text className='text-blue-600 text-xs'>Session Count</Text>
                )}
                {areaName && (
                  <>
                    {item.countSessionId && (
                      <Text className='text-gray-400 text-xs'>•</Text>
                    )}
                    <Text
                      className='text-purple-600 text-xs text-ellipsis w-full'
                      style={{ textWrap: 'nowrap' }}
                    >
                      {areaName}
                    </Text>
                  </>
                )}
              </HStack>
            </VStack>

            {/* Count Details */}
            <VStack className='items-center' style={{ marginRight: 16 }}>
              <Text className='text-gray-900 font-bold text-lg'>
                {item.countedQuantity}
              </Text>
              <Text className='text-gray-500 text-xs'>
                {pluralize(item.countedQuantity, item.container || 'unit')}
              </Text>
            </VStack>

            {/* Variance Indicator */}
            <VStack className='items-center'>
              <Box
                style={{
                  backgroundColor: getVarianceBackground(item.variance),
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  minWidth: 60,
                }}
              >
                <Text
                  className='font-bold text-sm text-center'
                  style={{ color: getVarianceColor(item.variance) }}
                >
                  {item.variance > 0 ? '+' : ''}
                  {item.variance}
                </Text>
              </Box>
              <Text className='text-gray-400 text-xs mt-1'>
                vs {item.currentStock}
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      </Box>
    )
  }

  const filterButtons = [
    { key: 'all', label: 'All', count: countItems.length },
    {
      key: 'today',
      label: 'Today',
      count: countItems.filter(
        (item) =>
          new Date(item.timestamp).toDateString() === new Date().toDateString()
      ).length,
    },
    {
      key: 'variance',
      label: 'Variance',
      count: countItems.filter((item) => item.variance !== 0).length,
    },
    {
      key: 'session',
      label: 'Sessions',
      count: countItems.filter((item) => item.countSessionId !== null).length,
    },
  ]

  return (
    <LinearGradient
      colors={[colors.primary, colors.accent, '#A855F7']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <SafeAreaView>
        <HStack className='items-center justify-between p-4'>
          <Pressable
            onPress={() => navigation.goBack()}
            className='p-3 rounded-xl'
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Ionicons name='arrow-back' size={24} color='white' />
          </Pressable>

          <VStack className='items-center'>
            <Heading className='text-white font-bold text-xl'>
              Count History
            </Heading>
            <Text className='text-white/80 text-sm'>
              {getTotalCounts()} total counts
            </Text>
          </VStack>

          <Pressable
            onPress={handleClearAll}
            disabled={countItems.length === 0}
            className='p-3 rounded-xl'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              opacity: countItems.length === 0 ? 0.5 : 1,
            }}
          >
            <Ionicons name='trash' size={24} color='white' />
          </Pressable>
        </HStack>
      </SafeAreaView>

      {/* Content */}
      <VStack className='flex-1' style={{ paddingHorizontal: 16 }}>
        {/* Filter Buttons */}
        <HStack className='mb-4' space='sm'>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterButtons}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setFilter(item.key as FilterType)}
                style={{
                  backgroundColor:
                    filter === item.key
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.2)',
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  marginRight: 8,
                  minWidth: 70,
                }}
              >
                <Text
                  className='font-semibold text-center text-sm'
                  style={{
                    color: filter === item.key ? colors.primary : 'white',
                  }}
                >
                  {item.label} ({item.count})
                </Text>
              </Pressable>
            )}
          />
        </HStack>

        {/* Count List */}
        {filteredItems.length > 0 ? (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderCountItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <Box
            className='bg-white'
            style={{
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              marginTop: 40,
            }}
          >
            <Box
              style={{
                backgroundColor: colors.primaryLight,
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons
                name='clipboard-outline'
                size={28}
                color={colors.primary}
              />
            </Box>
            <Text className='text-gray-900 font-semibold text-lg text-center'>
              No counts found
            </Text>
            <Text className='text-gray-500 text-center mt-2'>
              {filter === 'all'
                ? 'Start scanning items to see count history'
                : `No counts found for "${filterButtons.find((b) => b.key === filter)?.label}" filter`}
            </Text>

            <Button
              onPress={() => navigation.navigate('Main' as never)}
              className='bg-purple-600 mt-6'
            >
              <ButtonText className='text-white font-semibold'>
                Go to Scanner
              </ButtonText>
            </Button>
          </Box>
        )}
      </VStack>
    </LinearGradient>
  )
}
