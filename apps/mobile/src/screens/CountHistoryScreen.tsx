import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { ThemedCard, ThemedHeading, ThemedText } from '../components/themed'
import { CountItem, useCountStore } from '../stores/countStore'
import { pluralize } from '../utils/pluralize'

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
    if (variance === 0) return '#10B981'
    if (Math.abs(variance) <= 2) return '#F59E0B'
    return '#EF4444'
  }

  const getVarianceBackground = (variance: number) => {
    if (variance === 0) return '#ECFDF5'
    if (Math.abs(variance) <= 2) return '#FFFBEB'
    return '#FEF2F2'
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
      <ThemedCard variant='primary' size='md' className='mb-3'>
        <Pressable onLongPress={() => handleDeleteItem(item)}>
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
              <ThemedText
                variant='body'
                color='primary'
                weight='semibold'
                className='mb-1'
              >
                {item.productName}
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                {item.sku && `SKU: ${item.sku} • `}
                {formatTimestamp(item.timestamp)}
              </ThemedText>
              <HStack className='items-center mt-1' space='sm'>
                {item.countSessionId && (
                  <ThemedText variant='caption' color='primary'>
                    Session Count
                  </ThemedText>
                )}
                {areaName && (
                  <>
                    {item.countSessionId && (
                      <ThemedText variant='caption' color='muted'>
                        •
                      </ThemedText>
                    )}
                    <ThemedText
                      variant='caption'
                      color='purple'
                      numberOfLines={1}
                      className='flex-1'
                    >
                      {areaName}
                    </ThemedText>
                  </>
                )}
              </HStack>
            </VStack>

            {/* Count Details */}
            <VStack className='items-center' style={{ marginRight: 16 }}>
              <ThemedText variant='h4' color='primary' weight='bold'>
                {item.countedQuantity}
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                {pluralize(item.countedQuantity, item.container || 'unit')}
              </ThemedText>
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
                <ThemedText
                  variant='caption'
                  weight='bold'
                  align='center'
                  style={{ color: getVarianceColor(item.variance) }}
                >
                  {item.variance > 0 ? '+' : ''}
                  {item.variance}
                </ThemedText>
              </Box>
              <ThemedText variant='caption' color='muted' className='mt-1'>
                vs {item.currentStock}
              </ThemedText>
            </VStack>
          </HStack>
        </Pressable>
      </ThemedCard>
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
    <PageGradient>
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
            <ThemedHeading variant='h2' color='onGradient' weight='bold'>
              Count History
            </ThemedHeading>
            <ThemedText variant='caption' color='onGradientMuted'>
              {getTotalCounts()} total counts
            </ThemedText>
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
                <ThemedText
                  variant='caption'
                  weight='semibold'
                  align='center'
                  color={filter === item.key ? 'purple' : 'onGradient'}
                >
                  {item.label} ({item.count})
                </ThemedText>
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
          <ThemedCard
            variant='primary'
            size='lg'
            className='mt-10 items-center p-10'
          >
            <Box
              style={{
                backgroundColor: '#F3E8FF',
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name='clipboard-outline' size={28} color='#8B5CF6' />
            </Box>
            <ThemedText
              variant='h3'
              color='primary'
              weight='semibold'
              align='center'
            >
              No counts found
            </ThemedText>
            <ThemedText color='muted' align='center' className='mt-2'>
              {filter === 'all'
                ? 'Start scanning items to see count history'
                : `No counts found for "${filterButtons.find((b) => b.key === filter)?.label}" filter`}
            </ThemedText>
          </ThemedCard>
        )}
      </VStack>
    </PageGradient>
  )
}
