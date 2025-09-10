import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import pluralize from 'pluralize'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import { Colors } from '../constants/theme'
import { cn } from '../constants/themeClasses'
import { useInventoryLevels, useLowStockItems } from '../hooks/useInventoryData'

export function InventoryScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
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
      return { icon: 'alert-circle', color: Colors.error, text: 'Out of Stock' }
    }
    if (
      lowStockItems?.some((lowItem) => lowItem.productId === item.productId)
    ) {
      return { icon: 'warning', color: Colors.warning, text: 'Low Stock' }
    }
    return { icon: 'checkmark-circle', color: Colors.success, text: 'In Stock' }
  }

  const renderInventoryItem = ({ item }: { item: any }) => {
    const status = getStockStatus(item)

    return (
      <Pressable style={{ marginBottom: 12 }}>
        <ThemedCard variant='primary' size='md'>
          <HStack
            style={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            {/* Product Image */}
            <Box style={{ marginRight: 12 }}>
              <ProductImage
                uri={item.product?.image}
                {...ProductImageVariants.listItemLarge}
              />
            </Box>

            {/* Product Info */}
            <VStack className='flex-1' style={{ marginRight: 16 }}>
              <ThemedText variant='body' weight='semibold' color='primary'>
                {item.product?.name || 'Unknown Product'}
              </ThemedText>
              <ThemedText
                variant='caption'
                color='muted'
                style={{ marginTop: 2 }}
              >
                SKU: {item.product?.sku || 'N/A'}
              </ThemedText>
              <ThemedText
                variant='caption'
                color='muted'
                style={{ marginTop: 2 }}
              >
                {item.product.unitSize}
                {item.product?.unit} • {item.product?.container}
              </ThemedText>
            </VStack>

            {/* Quantity Info */}
            <VStack style={{ alignItems: 'flex-end', marginRight: 16 }}>
              <ThemedText
                variant='h3'
                weight='bold'
                style={{ color: status.color, marginBottom: 2 }}
              >
                {+item.currentQuantity.toFixed(2)}
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                {item.currentQuantity > 1
                  ? pluralize(item.product?.container || 'units')
                  : item.product?.container || 'unit'}
              </ThemedText>
              {item.parLevel && (
                <ThemedText
                  variant='caption'
                  color='muted'
                  style={{ marginTop: 2 }}
                >
                  Par: {item.parLevel}
                </ThemedText>
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
        </ThemedCard>
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
    <PageGradient style={{ paddingBottom: 16 }}>
      {/* Header */}
      <StatusBar style='light' />

      {/* Header */}

      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center p-2'>
          <ThemedHeading variant='h2' color='onGradient' weight='bold'>
            Inventory
          </ThemedHeading>
          <ThemedButton
            onPress={() => navigation.navigate('AddProduct' as never)}
            variant='primary'
            className='bg-white/20 dark:bg-white/20 rounded-full size-10 p-0'
          >
            <Ionicons name='add' size={22} color='white' />
          </ThemedButton>
        </HStack>
      </Box>

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
            colors={['#8B5CF6']}
            tintColor='#8B5CF6'
            progressBackgroundColor='white'
          />
        }
      >
        <VStack style={{ gap: 16 }}>
          {/* Search Bar */}
          <ThemedInput
            variant='default'
            size='md'
            fieldProps={{
              placeholder: 'Search inventory...',
              value: searchQuery,
              onChangeText: setSearchQuery,
            }}
            className='elevation-md'
          />

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack style={{ gap: 12, paddingHorizontal: 4 }}>
              {filterButtons.map((button) => (
                <ThemedButton
                  key={button.key}
                  variant={filterType === button.key ? 'primary' : 'outline'}
                  size='sm'
                  onPress={() => setFilterType(button.key as any)}
                  className={cn(
                    'h-10 px-4',
                    filterType === button.key
                      ? 'bg-white dark:bg-white/25 border-transparent dark:border dark:border-white/80'
                      : 'bg-white/20 dark:bg-white/10 border-white/40 dark:border-transparent'
                  )}
                >
                  <ThemedText
                    variant='caption'
                    weight='semibold'
                    color={filterType === button.key ? 'primary' : 'onGradient'}
                  >
                    {button.label}
                  </ThemedText>
                </ThemedButton>
              ))}
            </HStack>
          </ScrollView>

          {/* Inventory List */}
          {isLoading ? (
            <Box className='items-center justify-center'>
              <ActivityIndicator size='large' color='white' />
              <ThemedText
                variant='body'
                color='onGradientMuted'
                weight='medium'
                style={{ marginTop: 12 }}
              >
                Loading inventory...
              </ThemedText>
            </Box>
          ) : (
            <VStack style={{ gap: 4 }}>
              {filteredItems.map((item) => (
                <Box key={item.id}>{renderInventoryItem({ item })}</Box>
              ))}
              {filteredItems.length === 0 && (
                <ThemedCard variant='primary' size='lg'>
                  <Box
                    style={{
                      backgroundColor: Colors.primaryLight,
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
                      color={Colors.primary}
                    />
                  </Box>
                  <ThemedText
                    variant='body'
                    weight='semibold'
                    color='primary'
                    align='center'
                  >
                    No items found
                  </ThemedText>
                  <ThemedText
                    variant='caption'
                    color='muted'
                    align='center'
                    style={{ marginTop: 4 }}
                  >
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Add products to get started'}
                  </ThemedText>
                </ThemedCard>
              )}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </PageGradient>
  )
}
