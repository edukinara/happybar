import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, BackHandler, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Center } from '@/components/ui/center'
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
import { Spinner } from '@/components/ui/spinner'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { useProductByUPC } from '../hooks/useInventoryData'
import { useCountStore } from '../stores/countStore'
import { pluralize } from '../utils/pluralize'

// Removed unused Dimensions import

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [isScanning, setIsScanning] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<{
    id: string
    inventoryItemId: string
    barcode: string
    name: string
    sku: string | null
    unit: string
    image: string | null
    container: string | null
    currentStock: number
    parLevel: number
  } | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [showModal, setShowModal] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [scannedUPC, setScannedUPC] = useState<string | null>(null)
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
    updateCountItem,
    getCountItemsBySession,
  } = useCountStore()
  const recentScans = getRecentCountItems(1)
  const activeSession = getActiveSession()
  const currentArea = activeSession?.areas?.find(
    (area) => area.id === activeSession.currentAreaId
  )

  // Handle hardware back button press
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Navigate to home tab instead of going back in stack
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

  // Query to lookup product by UPC
  const {
    data: productData,
    isLoading: isLookingUp,
    isError: lookupError,
  } = useProductByUPC(scannedUPC || '')

  const handleBarCodeScanned = ({ data }: any) => {
    if (!isScanning) return

    setIsScanning(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Set the scanned UPC to trigger the lookup
    setScannedUPC(data)
  }

  // Handle the result of the UPC lookup
  useEffect(() => {
    if (scannedUPC && !isLookingUp) {
      if (productData && !lookupError) {
        // Product found in inventory
        const product = {
          id: productData.id,
          inventoryItemId: productData.inventoryItems[0]?.id,
          barcode: scannedUPC,
          name: productData.name,
          sku: productData.sku,
          unit: productData.unit,
          image: productData.image,
          container: productData.container,
          currentStock: productData.inventoryItems[0]?.currentQuantity || 0,
          parLevel: productData.inventoryItems[0]?.minimumQuantity || 0,
        }
        setQuantity(product.currentStock.toString() || '1')
        setScannedProduct(product)
        setShowModal(true)
      } else {
        // Product not found in inventory
        Alert.alert(
          'Product Not Found',
          `UPC ${scannedUPC} was not found in your inventory. Would you like to add it as a new product?`,
          [
            {
              text: 'Cancel',
              onPress: () => {
                setScannedUPC(null)
                setIsScanning(true)
              },
              style: 'cancel',
            },
            {
              text: 'Add Product',
              onPress: () => {
                // Navigate to add product screen with UPC pre-filled
                navigation.navigate([
                  'Inventory',
                  {
                    screen: 'AddProduct',
                    params: { upc: scannedUPC },
                  },
                ] as never)
                setScannedUPC(null)
              },
            },
          ]
        )
      }
    }
  }, [productData, isLookingUp, lookupError, scannedUPC, navigation])

  // Reset scanning state when screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Reset all scan-related state when returning to the screen
      setIsScanning(true)
      setScannedProduct(null)
      setScannedUPC(null)
      setQuantity('1')
      setShowModal(false)
      setIsCameraReady(false)

      // iOS specific camera initialization
      if (Platform.OS === 'ios') {
        // Add a small delay for iOS camera initialization
        setTimeout(() => {
          if (permission?.granted) {
            setIsCameraReady(true)
          }
        }, 500)
      }

      // Request permission on focus if not granted
      if (!permission?.granted) {
        requestPermission().then((result) => {
          if (result.granted && Platform.OS === 'ios') {
            // Additional delay after permission granted on iOS
            setTimeout(() => {
              setIsCameraReady(true)
            }, 1000)
          }
        })
      }

      return () => {
        // Cleanup when screen loses focus
        setIsScanning(false)
        setScannedProduct(null)
        setScannedUPC(null)
        setShowModal(false)
        setIsCameraReady(false)
      }
    }, [permission, requestPermission])
  )

  // Handle camera ready state for Android and other platforms
  useEffect(() => {
    if (permission?.granted && Platform.OS !== 'ios') {
      // For Android, camera is usually ready immediately after permission is granted
      setIsCameraReady(true)
    }
  }, [permission?.granted])

  const navigateToCount = () => {
    navigation.goBack() // Go back to the count screen
  }

  const handleSaveCount = async () => {
    if (!scannedProduct) return

    // Get FRESH session and area data at save time, not render time
    const freshActiveSession = getActiveSession()
    if (!freshActiveSession) return

    const freshCurrentArea = freshActiveSession?.areas?.find(
      (area) => area.id === freshActiveSession.currentAreaId
    )

    const countedQuantity = parseFloat(quantity)
    const variance = countedQuantity - scannedProduct.currentStock

    // Check for existing count item in the same area for this product
    const sessionItems = getCountItemsBySession(freshActiveSession.id)
    const existingItem = sessionItems.find(
      (item) =>
        item.productId === scannedProduct.id &&
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

      Alert.alert(
        'Count Updated',
        `Updated ${scannedProduct.name} in ${freshCurrentArea?.name || 'current area'} to ${countedQuantity} ${pluralize(countedQuantity, scannedProduct.container || 'unit')}`
      )
    } else {
      // Create new count item object with area ID
      const countItem = {
        inventoryItemId: scannedProduct.inventoryItemId,
        productId: scannedProduct.id,
        productName: scannedProduct.name,
        productImage: scannedProduct.image,
        sku: scannedProduct.sku,
        barcode: scannedProduct.barcode,
        unit: scannedProduct.unit,
        container: scannedProduct.container,
        currentStock: scannedProduct.currentStock,
        countedQuantity,
        variance,
        parLevel: scannedProduct.parLevel,
        countSessionId: freshActiveSession.id,
        areaId: freshCurrentArea?.id, // Add current area ID
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

      Alert.alert(
        'Count Saved',
        `${countedQuantity} ${pluralize(countedQuantity, scannedProduct.container || 'unit')} of ${scannedProduct.name} in ${freshCurrentArea?.name || 'current area'}`
      )
    }

    // Reset all scan-related state
    setShowModal(false)
    setScannedProduct(null)
    setScannedUPC(null)
    setQuantity('1')
    setIsScanning(true)

    // Navigate back to count screen
    navigation.goBack()
  }

  if (!permission) {
    return (
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        className='flex-1'
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Center className='flex-1'>
          <Spinner size='large' color='white' />
          <Text className='text-white text-lg mt-4'>
            Requesting camera permission...
          </Text>
        </Center>
      </LinearGradient>
    )
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        className='flex-1'
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Center className='flex-1 px-6'>
          <Box className='w-20 h-20 bg-white/20 rounded-full justify-center items-center mb-6'>
            <Ionicons name='camera-outline' size={40} color='white' />
          </Box>
          <Text className='text-white text-xl font-bold text-center mb-4'>
            Camera Permission Required
          </Text>
          <Text className='text-white/80 text-base text-center mb-8'>
            We need camera access to scan barcodes for inventory counting
          </Text>
          <Button
            size='lg'
            className='bg-white rounded-xl px-8'
            onPress={requestPermission}
          >
            <ButtonText className='text-purple-600 font-bold'>
              Grant Permission
            </ButtonText>
          </Button>
        </Center>
      </LinearGradient>
    )
  }

  return (
    <Box className='flex-1 bg-black'>
      {/* Camera View */}
      <CameraView
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
        facing='back'
        flash={flashOn ? 'on' : 'off'}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'pdf417',
            'aztec',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code39',
            'code93',
            'code128',
            'codabar',
          ],
        }}
        onBarcodeScanned={
          isScanning && isCameraReady ? handleBarCodeScanned : undefined
        }
        onCameraReady={() => {
          if (Platform.OS !== 'ios') {
            // For non-iOS platforms, set ready immediately
            setIsCameraReady(true)
          } else {
            // For iOS, add a small delay to ensure camera is fully initialized
            setTimeout(() => {
              setIsCameraReady(true)
            }, 200)
          }
        }}
      />

      {/* Camera Loading Overlay */}
      {!isCameraReady && (
        <Box className='absolute inset-0 bg-black/70 justify-center items-center'>
          <Spinner size='large' color='white' />
          <Text className='text-white text-lg mt-4'>
            Initializing camera...
          </Text>
        </Box>
      )}

      {/* Header Overlay */}
      <Box
        className='absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm'
        style={{ paddingTop: insets.top }}
      >
        <HStack className='justify-between items-center px-5 py-4'>
          <HStack className='items-center' space='sm'>
            <Pressable
              className='w-10 h-10 rounded-full bg-black/30 justify-center items-center'
              onPress={() => {
                // Navigate back to home screen (exit count tab)
                navigation.getParent()?.navigate('Home' as never)
              }}
            >
              <Ionicons name='arrow-back' size={20} color='white' />
            </Pressable>
            <Pressable
              className='w-10 h-10 rounded-full bg-black/30 justify-center items-center'
              onPress={() => setFlashOn(!flashOn)}
            >
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={20}
                color='white'
              />
            </Pressable>
          </HStack>
          <VStack className='items-center flex-1'>
            <Text className='text-white text-lg font-bold'>
              {activeSession ? activeSession.name : 'Quick Count'}
            </Text>
            {activeSession && (
              <Text className='text-white/70 text-xs'>
                {activeSession.type} • {activeSession.locationName}
              </Text>
            )}
            {currentArea && (
              <Text className='text-white/80 text-sm font-medium'>
                Area: {currentArea.name}
              </Text>
            )}
          </VStack>
          <Pressable
            className='w-10 h-10 rounded-full bg-black/30 justify-center items-center'
            onPress={async () => {
              if (activeSession) {
                try {
                  await completeCountSession(activeSession.id)
                  // After completing, go back to home
                  navigation.getParent()?.navigate('Home' as never)
                } catch (error) {
                  console.error('Failed to complete count session:', error)
                  Alert.alert(
                    'Error',
                    'Failed to complete count. Please try again.'
                  )
                }
              }
            }}
          >
            <Ionicons
              name={activeSession ? 'checkmark' : 'help-circle-outline'}
              size={20}
              color='white'
            />
          </Pressable>
        </HStack>
      </Box>

      {/* Scan Frame Overlay */}
      <Center className='flex-1'>
        <Box className='relative' style={{ width: 280, height: 280 }}>
          {/* Corner brackets */}
          <Box className='absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-white rounded-tl-lg' />
          <Box className='absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-white rounded-tr-lg' />
          <Box className='absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-white rounded-bl-lg' />
          <Box className='absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-white rounded-br-lg' />

          {/* Scanning line animation */}
          {isScanning && (
            <Box className='absolute inset-x-4 top-1/2 h-0.5 bg-white opacity-80' />
          )}
        </Box>

        <Text className='text-white text-lg font-medium mt-8 text-center px-8'>
          {isScanning
            ? 'Point camera at barcode'
            : isLookingUp
              ? 'Looking up product...'
              : 'Processing scan...'}
        </Text>
      </Center>

      {/* Bottom Footer */}
      <Box
        className='absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl rounded-t-3xl'
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <VStack className='p-6 mb-16' space='lg'>
          {recentScans.length > 0 && (
            <VStack space='sm'>
              <HStack className='justify-between items-center'>
                <Text className='text-white text-lg font-bold'>
                  Last Scanned
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('CountHistory' as never)}
                >
                  <Text className='text-purple-400 font-medium'>View All</Text>
                </Pressable>
              </HStack>

              <HStack className='justify-between items-center py-3 px-4 bg-white/10 rounded-lg backdrop-blur-sm'>
                <VStack className='flex-1'>
                  <Text className='text-white font-medium' numberOfLines={1}>
                    {recentScans[0].productName}
                  </Text>
                  <Text className='text-gray-400 text-sm'>
                    {new Date(recentScans[0].timestamp).toLocaleTimeString()}
                  </Text>
                </VStack>
                <VStack className='items-end'>
                  <Text className='text-white font-bold'>
                    {recentScans[0].countedQuantity}{' '}
                    {pluralize(
                      recentScans[0].countedQuantity,
                      recentScans[0].container || 'unit'
                    )}
                  </Text>
                  <Text
                    className={`text-sm font-medium ${
                      recentScans[0].variance === 0
                        ? 'text-green-400'
                        : recentScans[0].variance > 0
                          ? 'text-blue-400'
                          : 'text-orange-400'
                    }`}
                  >
                    {recentScans[0].variance > 0 ? '+' : ''}
                    {recentScans[0].variance}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          )}

          <Button
            size='lg'
            className='bg-purple-600 rounded-xl'
            onPress={navigateToCount}
          >
            <HStack space='sm' className='items-center'>
              <Ionicons name='list' size={20} color='white' />
              <ButtonText className='text-white font-bold'>
                Select from List
              </ButtonText>
            </HStack>
          </Button>
        </VStack>
      </Box>

      {/* Product Scan Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalBackdrop className='bg-black/70' />
        <ModalContent className='m-6 max-w-md bg-white'>
          <ModalHeader>
            <Text className='text-2xl font-bold text-gray-900'>
              Product Scanned
            </Text>
            <ModalCloseButton
              onPress={() => {
                setShowModal(false)
                setScannedProduct(null)
                setScannedUPC(null)
                setIsScanning(true)
              }}
            >
              <Ionicons name='close' size={24} color='#6B7280' />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            {scannedProduct && (
              <VStack space='lg'>
                {/* Product Image and Info */}
                <HStack space='md' className='items-center'>
                  <ProductImage
                    uri={scannedProduct.image}
                    {...ProductImageVariants.modal}
                  />

                  <VStack space='sm' className='flex-1'>
                    <Text className='text-xl font-bold text-gray-900'>
                      {scannedProduct.name}
                    </Text>
                    <Text className='text-gray-600'>
                      {scannedProduct.sku && `SKU: ${scannedProduct.sku} • `}
                      Current: {scannedProduct.currentStock}{' '}
                      {pluralize(
                        scannedProduct.currentStock,
                        scannedProduct.container || 'unit'
                      )}
                      {scannedProduct.parLevel > 0 &&
                        ` • Par: ${scannedProduct.parLevel}`}
                    </Text>
                  </VStack>
                </HStack>

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

                    <Input variant='outline' size='md' className='w-20'>
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
                  setShowModal(false)
                  setScannedProduct(null)
                  setScannedUPC(null)
                  setIsScanning(true)
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
    </Box>
  )
}
