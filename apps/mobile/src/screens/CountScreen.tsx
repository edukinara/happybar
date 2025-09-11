import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal'
import { Pressable } from '@/components/ui/pressable'
import { Spinner } from '@/components/ui/spinner'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useState } from 'react'
import { Alert, BackHandler, RefreshControl, ScrollView } from 'react-native'
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
import { useCountSync } from '../hooks/useCountSync'
import { useProducts, type InventoryProduct } from '../hooks/useInventoryData'
import { useCountStore } from '../stores/countStore'
import { pluralize } from '../utils/pluralize'

export function CountScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] =
    useState<InventoryProduct | null>(null)
  const [quantity, setQuantity] = useState('0')
  const [showCountModal, setShowCountModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isCompletingArea, setIsCompletingArea] = useState(false)

  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const queryClient = useQueryClient()

  // Count sync hook
  const { syncNow } = useCountSync()

  // Count store
  const {
    addCountItem,
    getRecentCountItems,
    getActiveSession,
    completeCountSession,
    saveCountItemToAPI,
    completeCurrentArea,
    getAreaProgress,
    updateCountItem,
    getCountItemsBySession,
    rehydrateCurrentSessionItems,
  } = useCountStore()

  const recentScans = getRecentCountItems(5)
  const activeSession = getActiveSession()
  const currentArea = activeSession?.areas?.find(
    (area) => area.id === activeSession.currentAreaId
  )
  const areaProgress = activeSession
    ? getAreaProgress(activeSession.id)
    : { completed: 0, total: 0 }

  // Handle hardware back button press
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Navigate to home screen instead of going back in stack
        navigation.getParent()?.navigate('Home' as never)
        return true // Prevent default back behavior
      }

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      )
      return () => subscription.remove()
    }, [navigation])
  )

  // Query to get all products
  const { data: products = [], isLoading, refetch } = useProducts()

  // Filter products based on search query
  const filteredProducts = products.filter(
    (product: InventoryProduct) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Handle area completion
  const handleCompleteArea = () => {
    if (!activeSession || !currentArea) return

    Alert.alert(
      'Complete Area',
      `Are you sure you want to complete counting for "${currentArea.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setIsCompletingArea(true)
            try {
              // Complete current area and get result (now async)
              const result = await completeCurrentArea(activeSession.id)

              if (!result.hasMoreAreas) {
                if (result.countCompleted) {
                  // Count was auto-completed - show success and navigate home
                  Alert.alert(
                    'Count Complete!',
                    'All areas have been counted and the count has been completed. It is now ready for approval.',
                    [
                      {
                        text: 'Done',
                        onPress: () => {
                          // Invalidate queries to refresh data on home screen
                          queryClient.invalidateQueries({
                            queryKey: ['completed-counts'],
                          })
                          navigation.getParent()?.navigate('Home' as never)
                        },
                      },
                    ]
                  )
                } else {
                  // Fallback: manual completion (shouldn't happen with new auto-complete)
                  Alert.alert(
                    'Count Complete',
                    'All areas have been counted. The count session will be marked as complete.',
                    [
                      {
                        text: 'Finish Count',
                        onPress: async () => {
                          try {
                            await completeCountSession(activeSession.id)
                            // Invalidate queries to refresh data on home screen
                            queryClient.invalidateQueries({
                              queryKey: ['completed-counts'],
                            })
                            navigation.getParent()?.navigate('Home' as never)
                          } catch (error) {
                            console.error('Failed to complete count:', error)
                            Alert.alert(
                              'Error',
                              'Failed to complete count. Please try again.'
                            )
                          }
                        },
                      },
                    ]
                  )
                }
              }
            } catch (error) {
              console.error('Failed to complete area:', error)
              Alert.alert(
                'Error',
                'Failed to complete area. Please check your connection and try again.'
              )
            } finally {
              setIsCompletingArea(false)
            }
          },
        },
      ]
    )
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Refresh products and rehydrate current session items
      await Promise.all([refetch(), rehydrateCurrentSessionItems()])
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refetch, rehydrateCurrentSessionItems])

  // Reset search when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setSearchQuery('')
      setSelectedProduct(null)
      setShowCountModal(false)
    }, [])
  )

  const handleProductSelect = (product: InventoryProduct) => {
    setSelectedProduct(product)

    // Get current stock from inventory items
    const currentStock = product.inventoryItems.reduce(
      (total: number, item: any) => total + item.currentQuantity,
      0
    )

    setQuantity((+currentStock.toFixed(2)).toString())
    setShowCountModal(true)
  }

  const handleSaveCount = async () => {
    if (!selectedProduct) return

    // Get FRESH session and area data at save time, not render time
    const freshActiveSession = getActiveSession()
    if (!freshActiveSession) return

    const freshCurrentArea = freshActiveSession?.areas?.find(
      (area) => area.id === freshActiveSession.currentAreaId
    )

    const countedQuantity = parseFloat(quantity)
    const currentStock = selectedProduct.inventoryItems.reduce(
      (total: number, item: any) => total + item.currentQuantity,
      0
    )
    const variance = countedQuantity - currentStock

    // Get the first inventory item (in a real app, you'd need to handle multiple locations)
    const inventoryItem = selectedProduct.inventoryItems[0]

    if (!inventoryItem) {
      Alert.alert('Error', 'No inventory data found for this product')
      return
    }

    // Check for existing count item in the same area for this product
    const sessionItems = getCountItemsBySession(freshActiveSession.id)
    const existingItem = sessionItems.find(
      (item) =>
        item.productId === selectedProduct.id &&
        item.areaId === freshCurrentArea?.id
    )

    if (existingItem) {
      // Update existing item instead of creating new one
      const updatedItem = {
        ...existingItem,
        countedQuantity,
        variance,
        timestamp: new Date().toISOString(),
      }

      updateCountItem(existingItem.id, updatedItem)

      // Update API in the background
      try {
        await saveCountItemToAPI(updatedItem)
      } catch (error) {
        console.error('Failed to update count item in API:', error)
      }
    } else {
      // Create count item object
      const countItem = {
        inventoryItemId: inventoryItem.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productImage: selectedProduct.image,
        sku: selectedProduct.sku,
        barcode: selectedProduct.sku || selectedProduct.id, // Use SKU as barcode fallback
        unit: selectedProduct.unit,
        container: selectedProduct.container,
        currentStock,
        countedQuantity,
        variance,
        parLevel: inventoryItem.minimumQuantity,
        countSessionId: freshActiveSession.id,
        areaId: freshCurrentArea?.id,
      }

      // Save to count store locally first
      addCountItem(countItem)

      // Save to API in the background
      try {
        const fullCountItem = {
          ...countItem,
          id: `count-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
        }
        await saveCountItemToAPI(fullCountItem)
      } catch (error) {
        console.error('Failed to save count item to API:', error)
        // Item is already saved locally, so we can continue
      }
    }

    // Reset modal state
    setShowCountModal(false)
    setSelectedProduct(null)
    setQuantity('0')
    setSearchQuery('')
  }

  const navigateToScanner = () => {
    // Navigate within the same stack navigator
    ;(navigation as any).navigate('Scan')
  }
  const { countItems } = useCountStore()

  return (
    <PageGradient>
      <StatusBar style='light' />

      {/* Header */}
      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack space='sm' className='items-start'>
          <Pressable
            className='mr-4'
            onPress={() => {
              // Navigate back to home screen (exit count tab)
              navigation.getParent()?.navigate('Home' as never)
            }}
          >
            <Ionicons name='arrow-back' size={24} color='white' />
          </Pressable>
          <VStack className='flex-1'>
            <ThemedHeading variant='h3' color='onGradient' weight='bold'>
              {activeSession ? activeSession.name : 'Quick Count'}
            </ThemedHeading>
            <HStack space='md' className='w-full justify-between'>
              <VStack>
                {activeSession && (
                  <ThemedText variant='caption' color='onGradientMuted'>
                    {activeSession.type} • {activeSession.locationName}
                  </ThemedText>
                )}
                {currentArea && (
                  <HStack className='items-center' space='xs'>
                    <ThemedText variant='caption' color='onGradientMuted'>
                      Area: {currentArea.name}
                    </ThemedText>
                    <ThemedText variant='caption' color='onGradientMuted'>
                      ({areaProgress.completed + 1}/{areaProgress.total})
                    </ThemedText>
                  </HStack>
                )}
              </VStack>
              <ThemedButton
                variant='primary'
                size='md'
                onPress={handleCompleteArea}
                className='border-transparent rounded-2xl w-16 p-0'
              >
                <Ionicons
                  name={currentArea ? 'checkmark' : 'help-circle-outline'}
                  size={24}
                  color='white'
                />
              </ThemedButton>
            </HStack>
          </VStack>
        </HStack>

        {/* Area Progress Bar */}
        {activeSession?.areas && activeSession.areas.length > 1 && (
          <Box className='mt-2 px-2'>
            <HStack className='justify-between items-center mb-2'>
              <ThemedText variant='body' color='onGradient' weight='medium'>
                Area Progress
              </ThemedText>
              <ThemedText variant='caption' color='onGradientMuted'>
                {areaProgress.completed}/{areaProgress.total} completed
              </ThemedText>
            </HStack>
            <Box className='h-2 bg-white/20 rounded-full'>
              <Box
                className='h-full bg-white/80 rounded-full'
                style={{
                  width: `${areaProgress.total > 0 ? (areaProgress.completed / areaProgress.total) * 100 : 0}%`,
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Prominent Scan Button */}
      <Box className='px-4 pb-4'>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 16 }}
        >
          <Pressable
            className='w-full rounded-2xl border-2 border-white/20 shadow-xl'
            onPress={navigateToScanner}
          >
            <HStack
              space='md'
              className='items-center justify-center py-4 px-6'
            >
              <Box className='w-12 h-12 bg-white/20 rounded-full items-center justify-center'>
                <Ionicons name='scan' size={24} color='white' />
              </Box>
              <VStack className='items-start flex-1'>
                <ThemedText variant='h4' color='onGradient' weight='bold'>
                  Scan Barcode
                </ThemedText>
                <ThemedText variant='caption' color='onGradientMuted'>
                  Point camera at product barcode
                </ThemedText>
              </VStack>
              <Ionicons name='chevron-forward' size={20} color='white' />
            </HStack>
          </Pressable>
        </LinearGradient>
      </Box>

      {/* Content */}
      {/* Recent Counts Section */}
      {recentScans.length > 0 && (
        <Box className='px-4 pb-3 mb-3 border-b border-gray-100'>
          <HStack className='justify-between items-center mb-2'>
            <ThemedHeading variant='h3' color='onGradient' weight='bold'>
              Recent Counts
            </ThemedHeading>
            <Pressable
              onPress={() => navigation.navigate('CountHistory' as never)}
            >
              <ThemedText variant='body' color='onGradient' weight='medium'>
                View All
              </ThemedText>
            </Pressable>
          </HStack>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space='md'>
              {recentScans.map((item) => (
                <ThemedCard
                  key={item.id}
                  variant='secondary'
                  size='sm'
                  className='min-w-[160px]'
                >
                  <HStack className='justify-between items-center'>
                    <ThemedText
                      variant='body'
                      color='primary'
                      weight='medium'
                      numberOfLines={1}
                    >
                      {item.productName}
                    </ThemedText>
                    <ThemedText variant='h4' color='purple' weight='bold'>
                      {item.countedQuantity}
                    </ThemedText>
                  </HStack>
                  <ThemedText
                    variant='caption'
                    color='muted'
                    style={{ marginTop: 4 }}
                  >
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </ThemedText>
                </ThemedCard>
              ))}
            </HStack>
          </ScrollView>
        </Box>
      )}

      {/* Products List */}
      <Box className='flex-1'>
        {isLoading ? (
          <Box className='flex-1 justify-center items-center'>
            <Spinner size='large' color='#8B5CF6' />
            <ThemedText variant='body' color='muted' style={{ marginTop: 16 }}>
              Loading products...
            </ThemedText>
          </Box>
        ) : (
          <>
            {/* Search Input */}
            <Box className='pb-3 px-4'>
              <ThemedInput
                variant='default'
                size='lg'
                fieldProps={{
                  placeholder: 'Search products...',
                  value: searchQuery,
                  onChangeText: setSearchQuery,
                }}
              />
            </Box>
            <ScrollView
              className='flex-1'
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <VStack className='px-4 pt-3 pb-36' space='sm'>
                <ThemedHeading variant='h3' color='onGradient' weight='bold'>
                  Select Product to Count
                </ThemedHeading>

                {filteredProducts.length === 0 ? (
                  <Box className='py-12 items-center'>
                    <Ionicons name='search-outline' size={48} color='#D1D5DB' />
                    <ThemedText
                      variant='body'
                      color='muted'
                      align='center'
                      style={{ marginTop: 16 }}
                    >
                      {searchQuery
                        ? 'No products found matching your search'
                        : 'No products available'}
                    </ThemedText>
                  </Box>
                ) : (
                  filteredProducts.map((product) => {
                    const currentStock = product.inventoryItems.reduce(
                      (total: number, item: any) =>
                        total + item.currentQuantity,
                      0
                    )
                    const minStock = product.inventoryItems.reduce(
                      (total: number, item: any) =>
                        total + item.minimumQuantity,
                      0
                    )

                    // Check if this product has been counted in the current area
                    const sessionItems = activeSession
                      ? getCountItemsBySession(activeSession.id)
                      : []
                    const countedItem = sessionItems.find(
                      (item) =>
                        item.productId === product.id &&
                        item.areaId === currentArea?.id
                    )

                    return (
                      <ThemedCard key={product.id} variant='primary' size='md'>
                        <Pressable onPress={() => handleProductSelect(product)}>
                          <HStack className='justify-between items-center'>
                            {/* Product Image */}
                            <Box style={{ marginRight: 12 }}>
                              <ProductImage
                                uri={product.image}
                                {...ProductImageVariants.listItem}
                              />
                            </Box>

                            <VStack className='flex-1 mr-4'>
                              <HStack className='items-center' space='sm'>
                                <ThemedText
                                  variant='body'
                                  color={countedItem ? 'purple' : 'primary'}
                                  weight='medium'
                                  numberOfLines={1}
                                >
                                  {product.name}
                                </ThemedText>
                                {countedItem && (
                                  <Box className='w-2 h-2 bg-purple-500 rounded-full' />
                                )}
                              </HStack>
                              <ThemedText
                                variant='caption'
                                color={countedItem ? 'purple' : 'muted'}
                              >
                                {product.sku && `SKU: ${product.sku} • `}
                                Current: {+currentStock.toFixed(2)}{' '}
                                {pluralize(
                                  currentStock,
                                  product.container || 'unit'
                                )}
                                {minStock > 0 && ` • Min: ${minStock}`}
                                {countedItem && (
                                  <ThemedText
                                    variant='caption'
                                    color='purple'
                                    weight='medium'
                                  >
                                    {` • Counted: ${countedItem.countedQuantity} ${pluralize(
                                      countedItem.countedQuantity,
                                      product.container || 'unit'
                                    )}`}
                                  </ThemedText>
                                )}
                              </ThemedText>
                            </VStack>

                            <VStack className='items-end'>
                              {countedItem ? (
                                <Box className='px-3 py-1 rounded-full bg-purple-100'>
                                  <ThemedText
                                    variant='caption'
                                    color='purple'
                                    weight='medium'
                                  >
                                    Counted
                                  </ThemedText>
                                </Box>
                              ) : (
                                <Box
                                  className={`px-3 py-1 rounded-full ${
                                    currentStock <= minStock
                                      ? 'bg-red-100'
                                      : currentStock <= minStock * 1.5
                                        ? 'bg-yellow-100'
                                        : 'bg-green-100'
                                  }`}
                                >
                                  <ThemedText
                                    variant='caption'
                                    weight='medium'
                                    color={
                                      currentStock <= minStock
                                        ? 'danger'
                                        : currentStock <= minStock * 1.5
                                          ? 'warning'
                                          : 'success'
                                    }
                                  >
                                    {currentStock <= minStock
                                      ? 'Low Stock'
                                      : 'In Stock'}
                                  </ThemedText>
                                </Box>
                              )}
                              <Ionicons
                                name='chevron-forward'
                                size={20}
                                color={countedItem ? '#8B5CF6' : '#9CA3AF'}
                              />
                            </VStack>
                          </HStack>
                        </Pressable>
                      </ThemedCard>
                    )
                  })
                )}
              </VStack>
            </ScrollView>
          </>
        )}
      </Box>

      {/* Count Modal */}
      <Modal isOpen={showCountModal} onClose={() => setShowCountModal(false)}>
        <ModalBackdrop className='bg-black/70' />
        <ModalContent className='m-6 max-w-md bg-white dark:bg-gray-900'>
          <ModalHeader>
            <ThemedHeading variant='h2' color='primary' weight='bold'>
              Count Product
            </ThemedHeading>
            <ModalCloseButton
              onPress={() => {
                setShowCountModal(false)
                setSelectedProduct(null)
              }}
            >
              <Ionicons name='close' size={24} color='#6B7280' />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            {selectedProduct && (
              <VStack space='lg'>
                <VStack space='sm'>
                  <ThemedHeading variant='h3' color='primary' weight='bold'>
                    {selectedProduct.name}
                  </ThemedHeading>
                  <ThemedText variant='body' color='muted'>
                    {selectedProduct.sku && `SKU: ${selectedProduct.sku} • `}
                    Current:{' '}
                    {selectedProduct.inventoryItems.reduce(
                      (total: number, item: any) =>
                        total + item.currentQuantity,
                      0
                    )}{' '}
                    {pluralize(
                      selectedProduct.inventoryItems.reduce(
                        (total: number, item: any) =>
                          total + item.currentQuantity,
                        0
                      ),
                      selectedProduct.container || 'unit'
                    )}
                  </ThemedText>
                </VStack>

                <VStack space='sm'>
                  <ThemedText variant='body' color='secondary' weight='medium'>
                    Count Quantity
                  </ThemedText>
                  <HStack space='sm' className='items-center w-full flex-1'>
                    <ThemedButton
                      variant='secondary'
                      size='md'
                      onPress={() =>
                        setQuantity(
                          String(Math.max(0, parseFloat(quantity) - 1))
                        )
                      }
                      className='size-12 p-0'
                    >
                      <Ionicons name='remove' size={24} color='#8B5CF6' />
                    </ThemedButton>
                    <Box className='items-center w-24'>
                      <ThemedInput
                        variant='default'
                        size='md'
                        fieldProps={{
                          placeholder: 'YYYY-MM-DD',
                          value: quantity,
                          onChangeText: setQuantity,
                          keyboardType: 'decimal-pad',
                          style: {
                            fontWeight: 'bold',
                          },
                        }}
                      />
                    </Box>

                    <ThemedButton
                      variant='secondary'
                      size='md'
                      onPress={() =>
                        setQuantity(String(parseFloat(quantity) + 1))
                      }
                      className='size-12 p-0'
                    >
                      <Ionicons name='add' size={24} color='#8B5CF6' />
                    </ThemedButton>
                  </HStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack space='md' className='w-full'>
              <ThemedButton
                variant='outline'
                size='lg'
                className='flex-1'
                onPress={() => {
                  setShowCountModal(false)
                  setSelectedProduct(null)
                }}
              >
                <ThemedText variant='body' color='secondary' weight='semibold'>
                  Cancel
                </ThemedText>
              </ThemedButton>

              <ThemedButton
                variant='primary'
                size='lg'
                className='flex-1 bg-purple-600 dark:bg-purple-600'
                onPress={handleSaveCount}
              >
                <ThemedText variant='body' color='onGradient' weight='bold'>
                  Save Count
                </ThemedText>
              </ThemedButton>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Loading Overlay for Area Completion */}
      {isCompletingArea && (
        <Box className='absolute inset-0 bg-black/50 justify-center items-center z-50'>
          <VStack
            className='bg-white dark:bg-gray-800 p-6 rounded-2xl items-center'
            space='md'
          >
            <Spinner size='large' />
            <ThemedText variant='body' weight='medium'>
              Completing area...
            </ThemedText>
          </VStack>
        </Box>
      )}
    </PageGradient>
  )
}
