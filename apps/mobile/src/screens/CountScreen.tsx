import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
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
import { ScrollView } from '@/components/ui/scroll-view'
import { Spinner } from '@/components/ui/spinner'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useState } from 'react'
import { Alert, BackHandler, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { cn, themeClasses } from '../constants/themeClasses'
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

  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

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
            }
          },
        },
      ]
    )
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

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

      // Alert.alert(
      //   'Count Updated',
      //   `Updated ${selectedProduct.name} in ${freshCurrentArea?.name || 'current area'} to ${countedQuantity} ${pluralize(countedQuantity, selectedProduct.container || 'unit')}`
      // )
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

      // Alert.alert(
      //   'Count Saved',
      //   `${countedQuantity} ${pluralize(countedQuantity, selectedProduct.container || 'unit')} of ${selectedProduct.name} in ${freshCurrentArea?.name || 'current area'}`
      // )
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

  return (
    <PageGradient>
      {/* Header */}
      <Box className='px-6 pb-4' style={{ paddingTop: insets.top + 16 }}>
        <HStack className='justify-between items-center mb-4'>
          <HStack className='items-center flex-1' space='md'>
            <Pressable
              className='w-10 h-10 rounded-full bg-white/20 justify-center items-center'
              onPress={() => {
                // Navigate back to home screen (exit count tab)
                navigation.getParent()?.navigate('Home' as never)
              }}
            >
              <Ionicons name='arrow-back' size={20} color='white' />
            </Pressable>
            <VStack className='flex-1'>
              <Text className='text-white text-xl font-bold'>
                {activeSession ? activeSession.name : 'Quick Count'}
              </Text>
              {activeSession && (
                <Text className='text-white/80 text-sm'>
                  {activeSession.type} • {activeSession.locationName}
                </Text>
              )}
              {currentArea && (
                <HStack className='items-center' space='sm'>
                  <Text className='text-white/70 text-xs'>
                    Area: {currentArea.name}
                  </Text>
                  <Text className='text-white/60 text-xs'>
                    ({areaProgress.completed + 1}/{areaProgress.total})
                  </Text>
                </HStack>
              )}
            </VStack>
          </HStack>
          <Pressable
            className='w-12 h-12 rounded-full bg-white/20 justify-center items-center'
            onPress={handleCompleteArea}
          >
            <Ionicons
              name={currentArea ? 'checkmark' : 'help-circle-outline'}
              size={24}
              color='white'
            />
          </Pressable>
        </HStack>

        {/* Area Progress Bar */}
        {activeSession?.areas && activeSession.areas.length > 1 && (
          <Box className='mb-4'>
            <HStack className='justify-between items-center mb-2'>
              <Text className='text-white/80 text-sm font-medium'>
                Area Progress
              </Text>
              <Text className='text-white/60 text-xs'>
                {areaProgress.completed}/{areaProgress.total} completed
              </Text>
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

        {/* Prominent Scan Button */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ marginBottom: 8 }}
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
                <Text className='text-white font-bold text-lg'>
                  Scan Barcode
                </Text>
                <Text className='text-white/80 text-sm'>
                  Point camera at product barcode
                </Text>
              </VStack>
              <Ionicons name='chevron-forward' size={20} color='white' />
            </HStack>
          </Pressable>
        </LinearGradient>
      </Box>

      {/* Content */}
      <Box className='flex-1 bg-white rounded-t-3xl'>
        {/* Recent Counts Section */}
        {recentScans.length > 0 && (
          <Box className='p-6 pb-3 border-b border-gray-100'>
            <HStack className='justify-between items-center mb-2'>
              <Text
                className={cn('text-lg font-bold', themeClasses.text.primary)}
              >
                Recent Counts
              </Text>
              <Pressable
                onPress={() => navigation.navigate('CountHistory' as never)}
              >
                <Text className='text-purple-600 font-medium'>View All</Text>
              </Pressable>
            </HStack>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space='md'>
                {recentScans.map((item) => (
                  <Box
                    key={item.id}
                    className='bg-gray-50 rounded-xl p-4 min-w-[160px]'
                  >
                    <HStack className='justify-between items-center'>
                      <Text
                        className={cn(
                          'font-medium text-sm',
                          themeClasses.text.primary
                        )}
                        numberOfLines={1}
                      >
                        {item.productName}
                      </Text>
                      <Text className={`text-md font-bold text-blue-600`}>
                        {item.countedQuantity}
                      </Text>
                    </HStack>
                    <Text
                      className={cn('text-xs mt-1', themeClasses.text.muted)}
                    >
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </Box>
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
              <Text className='{themeClasses.text.muted} mt-4'>
                Loading products...
              </Text>
            </Box>
          ) : (
            <ScrollView
              className='flex-1'
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <VStack className='px-6 py-3' space='sm'>
                {/* Search Input */}
                <Input
                  variant='outline'
                  size='lg'
                  className='bg-white/10 border-white/20'
                >
                  <InputField
                    placeholder='Search products...'
                    // placeholderTextColor='rgba(255,255,255,0.7)'
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className='border-[1px] border-black/10 rounded-lg'
                  />
                </Input>
                <Text
                  className={cn('text-lg font-bold', themeClasses.text.primary)}
                >
                  Select Product to Count
                </Text>

                {filteredProducts.length === 0 ? (
                  <Box className='py-12 items-center'>
                    <Ionicons name='search-outline' size={48} color='#D1D5DB' />
                    <Text className='{themeClasses.text.muted} text-center mt-4'>
                      {searchQuery
                        ? 'No products found matching your search'
                        : 'No products available'}
                    </Text>
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
                      <Pressable
                        key={product.id}
                        className={`border rounded-xl p-4 mb-1 ${
                          countedItem
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-white border-gray-200'
                        }`}
                        onPress={() => handleProductSelect(product)}
                      >
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
                              <Text
                                className={`font-medium ${
                                  countedItem
                                    ? 'text-purple-900'
                                    : themeClasses.text.primary
                                }`}
                                numberOfLines={1}
                              >
                                {product.name}
                              </Text>
                              {countedItem && (
                                <Box className='w-2 h-2 bg-purple-500 rounded-full' />
                              )}
                            </HStack>
                            <Text
                              className={`text-sm ${
                                countedItem
                                  ? 'text-purple-600'
                                  : themeClasses.text.muted
                              }`}
                            >
                              {product.sku && `SKU: ${product.sku} • `}
                              Current: {+currentStock.toFixed(2)}{' '}
                              {pluralize(
                                currentStock,
                                product.container || 'unit'
                              )}
                              {minStock > 0 && ` • Min: ${minStock}`}
                              {countedItem && (
                                <Text className='text-purple-700 font-medium'>
                                  {` • Counted: ${countedItem.countedQuantity} ${pluralize(
                                    countedItem.countedQuantity,
                                    product.container || 'unit'
                                  )}`}
                                </Text>
                              )}
                            </Text>
                          </VStack>

                          <VStack className='items-end'>
                            {countedItem ? (
                              <Box className='px-3 py-1 rounded-full bg-purple-100'>
                                <Text className='text-xs font-medium text-purple-700'>
                                  Counted
                                </Text>
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
                                <Text
                                  className={`text-xs font-medium ${
                                    currentStock <= minStock
                                      ? 'text-red-700'
                                      : currentStock <= minStock * 1.5
                                        ? 'text-yellow-700'
                                        : 'text-green-700'
                                  }`}
                                >
                                  {currentStock <= minStock
                                    ? 'Low Stock'
                                    : 'In Stock'}
                                </Text>
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
                    )
                  })
                )}
              </VStack>
            </ScrollView>
          )}
        </Box>
      </Box>

      {/* Count Modal */}
      <Modal isOpen={showCountModal} onClose={() => setShowCountModal(false)}>
        <ModalBackdrop className='bg-black/70' />
        <ModalContent className='m-6 max-w-md bg-white'>
          <ModalHeader>
            <Text
              className={cn('text-2xl font-bold', themeClasses.text.primary)}
            >
              Count Product
            </Text>
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
                  <Text
                    className={cn(
                      'text-xl font-bold',
                      themeClasses.text.primary
                    )}
                  >
                    {selectedProduct.name}
                  </Text>
                  <Text className={themeClasses.text.muted}>
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
                  </Text>
                </VStack>

                <VStack space='sm'>
                  <Text
                    className={cn('font-medium', themeClasses.text.secondary)}
                  >
                    Count Quantity
                  </Text>
                  <HStack className='justify-center items-center' space='lg'>
                    <Pressable
                      className='w-12 h-12 bg-gray-100 rounded-lg justify-center items-center'
                      onPress={() =>
                        setQuantity(
                          String(Math.max(0, parseFloat(quantity) - 1))
                        )
                      }
                    >
                      <Ionicons name='remove' size={24} color='#8B5CF6' />
                    </Pressable>

                    <Input variant='outline' size='md' className='w-24'>
                      <InputField
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType='decimal-pad'
                        className='text-center text-2xl font-bold'
                        selectTextOnFocus
                      />
                    </Input>

                    <Pressable
                      className='w-12 h-12 bg-gray-100 rounded-lg justify-center items-center'
                      onPress={() =>
                        setQuantity(String(parseFloat(quantity) + 1))
                      }
                    >
                      <Ionicons name='add' size={24} color='#8B5CF6' />
                    </Pressable>
                  </HStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack space='md' className='w-full'>
              <Button
                variant='outline'
                size='lg'
                className='flex-1 border-gray-300'
                onPress={() => {
                  setShowCountModal(false)
                  setSelectedProduct(null)
                }}
              >
                <ButtonText className={themeClasses.text.secondary}>
                  Cancel
                </ButtonText>
              </Button>

              <Button
                size='lg'
                className='flex-1 bg-purple-600'
                onPress={handleSaveCount}
              >
                <ButtonText className='text-white font-bold'>
                  Save Count
                </ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageGradient>
  )
}
