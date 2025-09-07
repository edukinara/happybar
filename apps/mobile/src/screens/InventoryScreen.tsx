import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import pluralize from 'pluralize'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInventoryLevels, useLowStockItems } from '../hooks/useInventoryData'

// Design system colors - matching count screens
const colors = {
  primary: '#6366F1', // Primary indigo
  accent: '#8B5CF6', // Accent purple
  success: '#10B981', // Success green
  warning: '#F59E0B', // Warning amber
  error: '#EF4444', // Error red
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
}

export function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all')

  const {
    data: inventoryLevels,
    isLoading,
    refetch,
    isFetching,
  } = useInventoryLevels()
  const { data: lowStockItems } = useLowStockItems()

  const filteredItems = React.useMemo(() => {
    if (!inventoryLevels) return []

    let filtered = inventoryLevels

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.product?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply stock level filter
    if (filterType === 'low') {
      const lowStockIds = lowStockItems?.map((item) => item.productId) || []
      filtered = filtered.filter((item) => lowStockIds.includes(item.productId))
    } else if (filterType === 'out') {
      filtered = filtered.filter((item) => item.currentQuantity <= 0)
    }

    return filtered
  }, [inventoryLevels, searchQuery, filterType, lowStockItems])

  const getStockStatus = (item: any) => {
    if (item.currentQuantity <= 0) {
      return { icon: 'alert-circle', color: colors.error, text: 'Out of Stock' }
    }
    if (
      lowStockItems?.some((lowItem) => lowItem.productId === item.productId)
    ) {
      return { icon: 'warning', color: colors.warning, text: 'Low Stock' }
    }
    return { icon: 'checkmark-circle', color: colors.success, text: 'In Stock' }
  }

  const renderInventoryItem = ({ item }: { item: any }) => {
    const status = getStockStatus(item)

    return (
      <Pressable style={{ marginBottom: 12 }}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <HStack
            style={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            {/* Product Info */}
            <VStack className='flex-1' style={{ marginRight: 16 }}>
              <Heading size='sm' className='text-gray-900 font-semibold'>
                {item.product?.name || 'Unknown Product'}
              </Heading>
              <Text className='text-gray-500 text-sm' style={{ marginTop: 2 }}>
                SKU: {item.product?.sku || 'N/A'}
              </Text>
              <Text className='text-gray-600 text-sm' style={{ marginTop: 2 }}>
                {item.product.unitSize}
                {item.product?.unit} • {item.product?.container}
              </Text>
            </VStack>

            {/* Quantity Info */}
            <VStack style={{ alignItems: 'flex-end', marginRight: 16 }}>
              <Text
                className='font-bold text-xl'
                style={{ color: status.color, marginBottom: 2 }}
              >
                {item.currentQuantity}
              </Text>
              <Text className='text-gray-500 text-xs'>
                {item.currentQuantity > 1
                  ? pluralize(item.product?.container || 'units')
                  : item.product?.container || 'unit'}
              </Text>
              {item.parLevel && (
                <Text
                  className='text-gray-400 text-xs'
                  style={{ marginTop: 2 }}
                >
                  Par: {item.parLevel}
                </Text>
              )}
            </VStack>

            {/* Status Icon */}
            <Box
              style={{
                backgroundColor: status.color + '20',
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={status.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={status.color}
              />
            </Box>
          </HStack>
        </LinearGradient>
      </Pressable>
    )
  }

  const filterButtons = [
    { key: 'all', label: `All (${inventoryLevels?.length || 0})` },
    { key: 'low', label: `Low Stock (${lowStockItems?.length || 0})` },
    {
      key: 'out',
      label: `Out of Stock (${inventoryLevels?.filter((item) => item.currentQuantity <= 0).length || 0})`,
    },
  ]

  return (
    <LinearGradient
      colors={[colors.primary, colors.accent, '#A855F7']}
      style={{ flex: 1, paddingBottom: 16 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <HStack className='items-center justify-between p-4'>
          <VStack>
            <Heading size='xl' className='text-white font-bold'>
              Inventory
            </Heading>
            {isFetching && !isLoading && (
              <HStack className='items-center' style={{ marginTop: 4 }}>
                <ActivityIndicator size='small' color='white' />
                <Text className='text-white/80 text-sm ml-2'>
                  Refreshing...
                </Text>
              </HStack>
            )}
          </VStack>
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
            <Ionicons name='add' size={24} color='white' />
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
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor='white'
          />
        }
      >
        <VStack style={{ gap: 16 }}>
          {/* Search Bar */}
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder='Search products...'
            style={{
              flex: 1,
              backgroundColor: 'rgb(255, 255, 255)',
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: '#374151',
              borderWidth: 1,
              borderColor: 'rgba(99, 102, 241, 0.2)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
            }}
            placeholderTextColor='#9CA3AF'
          />

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack style={{ gap: 8, paddingHorizontal: 4 }}>
              {filterButtons.map((button) => (
                <Pressable
                  key={button.key}
                  onPress={() => setFilterType(button.key as any)}
                  style={{
                    backgroundColor:
                      filterType === button.key
                        ? 'rgba(255, 255, 255, 0.95)'
                        : 'rgba(255, 255, 255, 0.2)',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      filterType === button.key
                        ? 'rgba(255, 255, 255, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Text
                    className='font-semibold text-sm'
                    style={{
                      color:
                        filterType === button.key ? colors.primary : 'white',
                    }}
                  >
                    {button.label}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </ScrollView>

          {/* Inventory List */}
          {isLoading ? (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 40,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <ActivityIndicator size='large' color={colors.primary} />
              <Text
                className='text-gray-600 font-medium'
                style={{ marginTop: 12 }}
              >
                Loading inventory...
              </Text>
            </LinearGradient>
          ) : (
            <VStack style={{ gap: 4 }}>
              {filteredItems.map((item) => (
                <Box key={item.id}>{renderInventoryItem({ item })}</Box>
              ))}
              {filteredItems.length === 0 && (
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.95)',
                    'rgba(255, 255, 255, 0.9)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 40,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 5,
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
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons
                      name='cube-outline'
                      size={28}
                      color={colors.primary}
                    />
                  </Box>
                  <Text className='text-gray-900 font-semibold text-center'>
                    No items found
                  </Text>
                  <Text
                    className='text-gray-500 text-center'
                    style={{ marginTop: 4 }}
                  >
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Add products to get started'}
                  </Text>
                </LinearGradient>
              )}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </LinearGradient>
  )
}
