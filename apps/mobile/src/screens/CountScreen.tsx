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
    activeSessionId,
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
                // All areas complete, finish count
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
              } else {
                // Show confirmation that area was completed and moved to next
                console.log(`Area "${currentArea.name}" completed. Moving to "${result.nextArea?.name}"`)
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

    setQuantity(currentStock.toString())
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
      item => item.productId === selectedProduct.id && item.areaId === freshCurrentArea?.id
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
        console.log('Count item updated in API successfully')
      } catch (error) {
        console.error('Failed to update count item in API:', error)
      }
      
      Alert.alert(
        'Count Updated',
        `Updated ${selectedProduct.name} in ${freshCurrentArea?.name || 'current area'} to ${countedQuantity} ${selectedProduct.unit}`
      )
    } else {
      // Create count item object
      const countItem = {
        inventoryItemId: inventoryItem.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
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
        console.log('Count item saved to API successfully')
      } catch (error) {
        console.error('Failed to save count item to API:', error)
        // Item is already saved locally, so we can continue
      }

      Alert.alert(
        'Count Saved',
        `${countedQuantity} ${selectedProduct.unit} of ${selectedProduct.name} in ${freshCurrentArea?.name || 'current area'}`
      )
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
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      className='flex-1'
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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

        {/* Search Input */}
        <Input
          variant='outline'
          size='lg'
          className='bg-white/10 border-white/20 mb-4'
        >
          <InputField
            placeholder='Search products...'
            placeholderTextColor='rgba(255,255,255,0.7)'
            value={searchQuery}
            onChangeText={setSearchQuery}
            className='text-white'
          />
        </Input>

        {/* Action Buttons */}
        <HStack space='md'>
          <Button
            size='lg'
            className='flex-1 bg-white/20 border border-white/30'
            onPress={navigateToScanner}
          >
            <HStack space='sm' className='items-center'>
              <Ionicons name='scan' size={20} color='white' />
              <ButtonText className='text-white font-bold'>
                Scan Barcode
              </ButtonText>
            </HStack>
          </Button>
        </HStack>
      </Box>

      {/* Content */}
      <Box className='flex-1 bg-white rounded-t-3xl'>
        {/* Recent Counts Section */}
        {recentScans.length > 0 && (
          <Box className='p-6 border-b border-gray-100'>
            <HStack className='justify-between items-center mb-4'>
              <Text className='text-lg font-bold text-gray-900'>
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
                    <Text
                      className='font-medium text-gray-900 text-sm'
                      numberOfLines={1}
                    >
                      {item.productName}
                    </Text>
                    <Text className='text-xs text-gray-500 mt-1'>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                    <HStack className='justify-between items-center mt-2'>
                      <Text className='text-sm font-bold text-gray-900'>
                        {item.countedQuantity}{' '}
                        {pluralize(
                          item.countedQuantity,
                          item.container || 'unit'
                        )}
                      </Text>
                      <Text
                        className={`text-xs font-medium ${
                          item.variance === 0
                            ? 'text-green-600'
                            : item.variance > 0
                              ? 'text-blue-600'
                              : 'text-orange-600'
                        }`}
                      >
                        {item.variance > 0 ? '+' : ''}
                        {item.variance}
                      </Text>
                    </HStack>
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
              <Text className='text-gray-600 mt-4'>Loading products...</Text>
            </Box>
          ) : (
            <ScrollView
              className='flex-1'
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <VStack className='p-6' space='sm'>
                <Text className='text-lg font-bold text-gray-900 mb-2'>
                  Select Product to Count
                </Text>

                {filteredProducts.length === 0 ? (
                  <Box className='py-12 items-center'>
                    <Ionicons name='search-outline' size={48} color='#D1D5DB' />
                    <Text className='text-gray-500 text-center mt-4'>
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

                    return (
                      <Pressable
                        key={product.id}
                        className='bg-white border border-gray-200 rounded-xl p-4 mb-3'
                        onPress={() => handleProductSelect(product)}
                      >
                        <HStack className='justify-between items-center'>
                          <VStack className='flex-1 mr-4'>
                            <Text
                              className='font-medium text-gray-900'
                              numberOfLines={1}
                            >
                              {product.name}
                            </Text>
                            <Text className='text-sm text-gray-500'>
                              {product.sku && `SKU: ${product.sku} • `}
                              Current: {currentStock}{' '}
                              {pluralize(
                                currentStock,
                                product.container || 'unit'
                              )}
                              {minStock > 0 && ` • Min: ${minStock}`}
                            </Text>
                          </VStack>

                          <VStack className='items-end'>
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
                            <Ionicons
                              name='chevron-forward'
                              size={20}
                              color='#9CA3AF'
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
            <Text className='text-2xl font-bold text-gray-900'>
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
                  <Text className='text-xl font-bold text-gray-900'>
                    {selectedProduct.name}
                  </Text>
                  <Text className='text-gray-600'>
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
                  <Text className='text-gray-700 font-medium'>
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
                <ButtonText className='text-gray-700'>Cancel</ButtonText>
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
    </LinearGradient>
  )
}
