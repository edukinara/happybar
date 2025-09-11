import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import React, {
  Profiler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Alert, BackHandler, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraErrorBoundary } from '../components/CameraErrorBoundary'

import { Box } from '@/components/ui/box'
import { Center } from '@/components/ui/center'
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
import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { ThemedButton, ThemedInput, ThemedText } from '../components/themed'
import { useProductByUPC } from '../hooks/useInventoryData'
import { useCountStore } from '../stores/countStore'
import { pluralize } from '../utils/pluralize'

// Removed unused Dimensions import

function ScanScreenComponent() {
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
  const [scannedUPC, setScannedUPC] = useState<string | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const [isCompletingArea, setIsCompletingArea] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isFlashChanging, setIsFlashChanging] = useState(false)
  const [flashDebounceTimer, setFlashDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null)
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const queryClient = useQueryClient()

  // Count store
  const {
    addCountItem,
    getRecentCountItems,
    getActiveSession,
    completeCountSession,
    saveCountItemToAPI,
    updateCountItem,
    getCountItemsBySession,
    completeCurrentArea,
    getAreaProgress,
  } = useCountStore()
  const recentScans = getRecentCountItems(1)
  const activeSession = getActiveSession()
  const currentArea = useMemo(
    () =>
      activeSession?.areas?.find(
        (area) => area.id === activeSession.currentAreaId
      ),
    [activeSession]
  )
  const areaProgress = useMemo(
    () =>
      activeSession
        ? getAreaProgress(activeSession.id)
        : { completed: 0, total: 0 },
    [activeSession, getAreaProgress]
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

  const handleBarCodeScanned = useCallback(
    ({ data }: any) => {
      if (!isScanning) return

      setIsScanning(false)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Set the scanned UPC to trigger the lookup
      setScannedUPC(data)
    },
    [isScanning]
  )

  // Handle the result of the UPC lookup - memoized to prevent excessive re-renders
  const handleUPCLookupResult = useCallback(() => {
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
                navigation.getParent()?.navigate('Inventory', {
                  screen: 'AddProduct',
                  params: { upc: scannedUPC },
                })
                setScannedUPC(null)
              },
            },
          ]
        )
      }
    }
  }, [productData, isLookingUp, lookupError, scannedUPC, navigation])

  // Use effect to handle UPC lookup results
  useEffect(() => {
    handleUPCLookupResult()
  }, [handleUPCLookupResult])

  // Memoized camera ready callback
  const onCameraReady = useCallback(() => {
    // Camera hardware is ready, ensure we're in ready state
    if (!isCameraReady) {
      setIsCameraReady(true)
    }
  }, [isCameraReady])

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
      setFlashOn(false)
      setIsCameraActive(true) // Activate camera when screen gains focus

      // Initialize camera when screen gains focus
      const initializeCamera = async () => {
        if (!permission?.granted) {
          try {
            const result = await requestPermission()
            if (!result.granted) {
              setIsCameraActive(false)
              return
            }
          } catch (error) {
            console.error('Failed to request camera permission:', error)
            setIsCameraActive(false)
            return
          }
        }

        // Camera initialization with platform-specific timing
        const delay = Platform.OS === 'ios' ? 300 : 100
        setTimeout(() => {
          if (isCameraActive) {
            // Only set ready if camera should still be active
            setIsCameraReady(true)
          }
        }, delay)
      }

      initializeCamera()

      return () => {
        // Cleanup when screen loses focus - CRITICAL for preventing heat issues
        setIsScanning(false)
        setScannedProduct(null)
        setScannedUPC(null)
        setShowModal(false)
        setIsCameraReady(false)
        setFlashOn(false)
        setIsCameraActive(false) // Deactivate camera to free resources
        setIsFlashChanging(false)
        // Clean up any pending flash timer
        if (flashDebounceTimer) {
          clearTimeout(flashDebounceTimer)
          setFlashDebounceTimer(null)
        }
      }
    }, [permission?.granted, requestPermission])
  )

  const navigateToCount = () => {
    navigation.goBack() // Go back to the count screen
  }

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
      <PageGradient>
        <Center className='flex-1'>
          <Spinner size='large' color='white' />
          <ThemedText variant='body' color='onGradient' className='mt-4'>
            Requesting camera permission...
          </ThemedText>
        </Center>
      </PageGradient>
    )
  }

  if (!permission.granted) {
    return (
      <PageGradient>
        <Center className='flex-1 px-6'>
          <Box className='w-20 h-20 bg-white/20 rounded-full justify-center items-center mb-6'>
            <Ionicons name='camera-outline' size={40} color='white' />
          </Box>
          <ThemedText
            variant='h3'
            color='onGradient'
            weight='bold'
            align='center'
            className='mb-4'
          >
            Camera Permission Required
          </ThemedText>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            className='mb-8'
          >
            We need camera access to scan barcodes for inventory counting
          </ThemedText>
          <ThemedButton
            variant='outline'
            size='lg'
            onPress={async () => {
              await requestPermission()
            }}
          >
            Grant Permission
          </ThemedButton>
        </Center>
      </PageGradient>
    )
  }

  return (
    <Box className='flex-1 bg-black'>
      {/* Camera View - Only render when permission granted and camera should be active */}
      {permission?.granted && isCameraActive && (
        <CameraView
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
          facing='back'
          enableTorch={flashOn}
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
          onCameraReady={onCameraReady}
          // Additional performance settings
          ratio='4:3' // Use 4:3 ratio instead of full screen for better performance
        />
      )}

      {/* Camera Loading Overlay */}
      {!isCameraReady && (
        <Box className='absolute inset-0 bg-black/70 justify-center items-center'>
          <Spinner size='large' color='white' />
          <ThemedText variant='body' color='onGradient' className='mt-4'>
            Initializing camera...
          </ThemedText>
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

            {/* Flash Button with Debouncing */}
            <Pressable
              className={`w-10 h-10 rounded-full justify-center items-center ${
                flashOn ? 'bg-yellow-500' : 'bg-black/30'
              } ${isFlashChanging ? 'opacity-50' : ''}`}
              onPress={() => {
                // Prevent rapid flash toggling that can crash the device
                if (!isCameraReady || isFlashChanging) return

                setIsFlashChanging(true)

                // Clear any existing timer
                if (flashDebounceTimer) {
                  clearTimeout(flashDebounceTimer)
                }

                try {
                  // Immediate visual feedback
                  setFlashOn(!flashOn)
                  Haptics.selectionAsync()

                  // Debounce the flash state to prevent hardware overload
                  const timer = setTimeout(() => {
                    setIsFlashChanging(false)
                    setFlashDebounceTimer(null)
                  }, 500) // 500ms delay to prevent rapid toggling

                  setFlashDebounceTimer(timer)
                } catch (error) {
                  console.error('Flash toggle error:', error)
                  setIsFlashChanging(false)
                  // Revert flash state on error
                  setFlashOn(flashOn)
                }
              }}
              disabled={isFlashChanging}
            >
              <Ionicons
                name={
                  isFlashChanging
                    ? 'flash-off'
                    : flashOn
                      ? 'flash'
                      : 'flash-outline'
                }
                size={20}
                color={flashOn ? 'black' : 'white'}
              />
            </Pressable>
          </HStack>
          <VStack className='items-end flex-1'>
            <ThemedText variant='body' color='onGradient' weight='bold'>
              {activeSession ? activeSession.name : 'Quick Count'}
            </ThemedText>
            {activeSession && (
              <ThemedText variant='caption' color='onGradientMuted'>
                {activeSession.type} • {activeSession.locationName}
              </ThemedText>
            )}
            {currentArea && (
              <VStack className='items-center' space='xs'>
                <HStack className='items-center' space='xs'>
                  <ThemedText
                    variant='caption'
                    color='onGradient'
                    weight='medium'
                  >
                    Area: {currentArea.name}
                  </ThemedText>
                  {areaProgress.total > 0 && (
                    <ThemedText variant='caption' color='onGradientMuted'>
                      ({areaProgress.completed + 1}/{areaProgress.total})
                    </ThemedText>
                  )}
                </HStack>
                {/* <Pressable
                  onPress={handleCompleteArea}
                  className='px-3 py-1 bg-white/20 rounded-full'
                >
                  <ThemedText
                    variant='caption'
                    color='onGradient'
                    weight='medium'
                  >
                    Complete Area
                  </ThemedText>
                </Pressable> */}

                <ThemedButton
                  variant='primary'
                  size='lg'
                  onPress={handleCompleteArea}
                >
                  <ThemedText color='onGradient'>
                    Complete Area Count
                  </ThemedText>
                </ThemedButton>
              </VStack>
            )}
          </VStack>
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

        <ThemedText
          variant='body'
          color='onGradient'
          weight='medium'
          align='center'
          className='mt-8 px-8'
        >
          {isScanning
            ? 'Point camera at barcode'
            : isLookingUp
              ? 'Looking up product...'
              : 'Processing scan...'}
        </ThemedText>
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
                <ThemedText variant='body' color='onGradient' weight='bold'>
                  Last Scanned
                </ThemedText>
                <Pressable
                  onPress={() => navigation.navigate('CountHistory' as never)}
                >
                  <ThemedText color='purple' weight='medium'>
                    View All
                  </ThemedText>
                </Pressable>
              </HStack>

              <HStack className='justify-between items-center py-3 px-4 bg-white/10 rounded-lg backdrop-blur-sm'>
                <VStack className='flex-1'>
                  <ThemedText
                    color='onGradient'
                    weight='medium'
                    numberOfLines={1}
                  >
                    {recentScans[0].productName}
                  </ThemedText>
                  <ThemedText variant='caption' color='onGradientMuted'>
                    {new Date(recentScans[0].timestamp).toLocaleTimeString()}
                  </ThemedText>
                </VStack>
                <VStack className='items-end'>
                  <ThemedText color='onGradient' weight='bold'>
                    {recentScans[0].countedQuantity}{' '}
                    {pluralize(
                      recentScans[0].countedQuantity,
                      recentScans[0].container || 'unit'
                    )}
                  </ThemedText>
                  <ThemedText
                    variant='caption'
                    weight='medium'
                    color={
                      recentScans[0].variance === 0
                        ? 'success'
                        : recentScans[0].variance > 0
                          ? 'primary'
                          : 'warning'
                    }
                  >
                    {recentScans[0].variance > 0 ? '+' : ''}
                    {recentScans[0].variance}
                  </ThemedText>
                </VStack>
              </HStack>
            </VStack>
          )}

          <ThemedButton variant='primary' size='lg' onPress={navigateToCount}>
            <HStack space='xs'>
              <Ionicons name='list' size={20} color='white' />
              <ThemedText color='onGradient'>Select from List</ThemedText>
            </HStack>
          </ThemedButton>
        </VStack>
      </Box>

      {/* Product Scan Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalBackdrop className='bg-black/70' />
        <ModalContent className='m-6 max-w-md'>
          <ModalHeader>
            <ThemedText variant='h3' color='primary' weight='bold'>
              Product Scanned
            </ThemedText>
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
                    <ThemedText variant='h4' color='primary' weight='bold'>
                      {scannedProduct.name}
                    </ThemedText>
                    <ThemedText color='muted'>
                      {scannedProduct.sku && `SKU: ${scannedProduct.sku} • `}
                      Current: {scannedProduct.currentStock}{' '}
                      {pluralize(
                        scannedProduct.currentStock,
                        scannedProduct.container || 'unit'
                      )}
                      {scannedProduct.parLevel > 0 &&
                        ` • Par: ${scannedProduct.parLevel}`}
                    </ThemedText>
                  </VStack>
                </HStack>

                <VStack space='sm'>
                  <ThemedText color='secondary' weight='medium'>
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
                  setShowModal(false)
                  setScannedProduct(null)
                  setScannedUPC(null)
                  setIsScanning(true)
                }}
              >
                Cancel
              </ThemedButton>

              <ThemedButton
                variant='primary'
                size='lg'
                className='flex-1'
                onPress={handleSaveCount}
              >
                <ThemedText color='onGradient'>Save Count</ThemedText>
              </ThemedButton>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Loading Overlay for Area Completion */}
      {isCompletingArea && (
        <Box className='absolute inset-0 bg-black/70 justify-center items-center z-50'>
          <VStack space='md' className='items-center'>
            <Spinner size='large' color='white' />
            <ThemedText variant='body' color='onGradient' weight='medium'>
              Completing area...
            </ThemedText>
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export function ScanScreen() {
  const onRender = (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number
  ) => {
    if (actualDuration > 16) {
      // Longer than 1 frame at 60fps
      console.log(`🔄 ScanScreen ${phase}: ${actualDuration.toFixed(2)}ms`)
    }
  }

  return (
    <CameraErrorBoundary
      onReset={() => {
        // Reset any camera-related state if needed
      }}
    >
      <Profiler id='ScanScreen' onRender={onRender}>
        <ScanScreenComponent />
      </Profiler>
    </CameraErrorBoundary>
  )
}
