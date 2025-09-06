import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Dimensions } from 'react-native'
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

import pluralize from 'pluralize'
import { useProductByUPC } from '../hooks/useInventoryData'

const { width, height } = Dimensions.get('window')

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [isScanning, setIsScanning] = useState(true)
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
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [flashOn, setFlashOn] = useState(false)
  const [scannedUPC, setScannedUPC] = useState<string | null>(null)
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  // Query to lookup product by UPC
  const {
    data: productData,
    isLoading: isLookingUp,
    isError: lookupError,
  } = useProductByUPC(scannedUPC || '')

  const handleBarCodeScanned = ({ type, data }: any) => {
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

      return () => {
        // Cleanup when screen loses focus
        setIsScanning(false)
        setScannedProduct(null)
        setScannedUPC(null)
        setShowModal(false)
      }
    }, [])
  )

  const handleManualScan = () => {
    // Mock manual scan for testing
    const mockProduct = {
      id: '1',
      inventoryItemId: '1',
      sku: '123456789',
      image: null,
      container: 'bottle',
      parLevel: 12,
      barcode: '123456789',
      name: 'Grey Goose Vodka',
      size: '750ml',
      currentStock: 12,
      unit: 'bottles',
    }

    setScannedProduct(mockProduct)
    setShowModal(true)
  }

  const handleSaveCount = () => {
    const scan = {
      ...scannedProduct,
      quantity: parseFloat(quantity),
      timestamp: new Date().toISOString(),
    }

    setRecentScans([scan, ...recentScans])

    // Reset all scan-related state
    setShowModal(false)
    setScannedProduct(null)
    setScannedUPC(null)
    setQuantity('1')
    setIsScanning(true)

    // Navigate away first to stop camera, then show alert
    navigation.navigate('Home' as never)

    // Show alert after a brief delay to ensure navigation completes
    setTimeout(() => {
      Alert.alert(
        'Success',
        `Count saved: ${scan.quantity} ${scan.unit} of ${scan.name}`
      )
    }, 300)
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
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
      />

      {/* Header Overlay */}
      <Box
        className='absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm'
        style={{ paddingTop: insets.top }}
      >
        <HStack className='justify-between items-center px-5 py-4'>
          <Pressable
            className='w-12 h-12 rounded-full bg-black/30 justify-center items-center'
            onPress={() => setFlashOn(!flashOn)}
          >
            <Ionicons
              name={flashOn ? 'flash' : 'flash-off'}
              size={24}
              color='white'
            />
          </Pressable>
          <Text className='text-white text-xl font-bold'>Quick Count</Text>
          <Pressable className='w-12 h-12 rounded-full bg-black/30 justify-center items-center'>
            <Ionicons name='help-circle-outline' size={24} color='white' />
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
          {/* <HStack className='justify-between items-center'>
            <Text className='text-white text-lg font-bold'>
              Recent Scans ({recentScans.length})
            </Text>
            {recentScans.length > 0 && (
              <Pressable onPress={() => setRecentScans([])}>
                <Text className='text-purple-400 font-medium'>Clear All</Text>
              </Pressable>
            )}
          </HStack> */}

          {/* {recentScans.length > 0 ? (
            <VStack space='sm'>
              {recentScans.slice(0, 3).map((scan, index) => (
                <HStack
                  key={index}
                  className='justify-between py-3 border-b border-white/10'
                >
                  <Text className='text-white font-medium'>{scan.name}</Text>
                  <Text className='text-gray-400'>
                    {scan.quantity} {scan.unit}
                  </Text>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text className='text-gray-400 text-center py-4'>
              No recent scans
            </Text>
          )} */}

          <Button
            size='lg'
            className='bg-purple-600 rounded-xl'
            onPress={handleManualScan}
          >
            <HStack space='sm' className='items-center'>
              <Ionicons name='keypad' size={20} color='white' />
              <ButtonText className='text-white font-bold'>
                Manual Entry
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
                <VStack space='sm'>
                  <Text className='text-xl font-bold text-gray-900'>
                    {scannedProduct.name}
                  </Text>
                  <Text className='text-gray-600'>
                    {scannedProduct.sku && `SKU: ${scannedProduct.sku} • `}
                    Current: {scannedProduct.currentStock}{' '}
                    {scannedProduct.currentStock > 1
                      ? pluralize(scannedProduct.container || 'unit')
                      : scannedProduct.container}
                    {scannedProduct.parLevel > 0 &&
                      ` • Par: ${scannedProduct.parLevel}`}
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
