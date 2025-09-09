import { Box } from '@/components/ui/box'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { useProducts, useSuppliers } from '../hooks/useInventoryData'
import { api } from '../lib/api'

// Design system colors - matching other screens
const colors = {
  primary: '#6366F1', // Primary indigo
  accent: '#8B5CF6', // Accent purple
  success: '#10B981', // Success green
  warning: '#F59E0B', // Warning amber
  error: '#EF4444', // Error red
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',
}

type Product = {
  id: string
  name: string
  sku?: string | null
  image?: string | null
  unit: string
  costPerUnit: number
  category?: {
    id: string
    name: string
  }
}

type Supplier = {
  id: string
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
}

type OrderItem = {
  productId: string
  product: Product
  supplierId: string
  supplier: Supplier
  quantityOrdered: number
  unitCost: number
  orderingUnit: 'UNIT' | 'CASE'
}

export function CreateOrderScreen() {
  const navigation = useNavigation()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [notes, setNotes] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Data hooks
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers()

  // Convert products to simplified format
  const simplifiedProducts: Product[] = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.image,
    unit: p.unit,
    costPerUnit: p.costPerUnit,
    category: p.category,
  }))

  const addOrderItem = (product: Product, supplier: Supplier) => {
    // Check if this product+supplier combo already exists
    const existingItem = orderItems.find(
      item => item.productId === product.id && item.supplierId === supplier.id
    )
    
    if (existingItem) {
      Alert.alert('Item Already Added', 'This product from this supplier is already in the order.')
      return
    }

    const newItem: OrderItem = {
      productId: product.id,
      product,
      supplierId: supplier.id,
      supplier,
      quantityOrdered: 1,
      unitCost: product.costPerUnit,
      orderingUnit: 'UNIT',
    }

    setOrderItems([...orderItems, newItem])
    setShowProductPicker(false)
    setShowSupplierPicker(false)
    setSelectedProduct(null)
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setOrderItems(updatedItems)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0)
  }

  const createOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the order.')
      return
    }

    try {
      setIsCreating(true)

      // Group items by supplier
      const ordersBySupplier: {[supplierId: string]: {
        supplierId: string
        supplier: Supplier
        items: Array<{
          productId: string
          quantityOrdered: number
          unitCost: number
          orderingUnit: 'UNIT' | 'CASE'
        }>
      }} = {}

      orderItems.forEach(item => {
        if (!ordersBySupplier[item.supplierId]) {
          ordersBySupplier[item.supplierId] = {
            supplierId: item.supplierId,
            supplier: item.supplier,
            items: []
          }
        }
        
        ordersBySupplier[item.supplierId].items.push({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit
        })
      })

      // Create orders
      const orders = Object.values(ordersBySupplier)
      let createdCount = 0

      for (const orderData of orders) {
        await api.createOrder({
          supplierId: orderData.supplierId,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items: orderData.items
        })
        createdCount++
      }

      Alert.alert(
        'Success',
        `Created ${createdCount} order${createdCount === 1 ? '' : 's'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.error('Failed to create order:', error)
      Alert.alert('Error', 'Failed to create order. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (productsLoading || suppliersLoading) {
    return (
      <SafeAreaView className='flex-1 bg-white'>
        <VStack className='flex-1 justify-center items-center' space='md'>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text className='text-gray-600'>Loading products and suppliers...</Text>
        </VStack>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className='flex-1 bg-white'>
      <VStack className='flex-1'>
        {/* Header */}
        <HStack className='items-center justify-between p-6 pb-4'>
          <Pressable
            onPress={() => navigation.goBack()}
            className='p-2 -ml-2'
          >
            <Ionicons name='arrow-back' size={24} color='#374151' />
          </Pressable>
          <Heading className='text-xl font-semibold text-gray-900'>
            Create Order
          </Heading>
          <Box className='w-8' />
        </HStack>

        {/* Order Details */}
        <VStack className='px-6 pb-4' space='md'>
          <VStack space='sm'>
            <Text className='font-medium text-gray-700'>Expected Delivery (Optional)</Text>
            <TextInput
              className='p-3 border border-gray-300 rounded-lg bg-white'
              placeholder='YYYY-MM-DD'
              value={expectedDate}
              onChangeText={setExpectedDate}
            />
          </VStack>

          <VStack space='sm'>
            <Text className='font-medium text-gray-700'>Notes (Optional)</Text>
            <TextInput
              className='p-3 border border-gray-300 rounded-lg bg-white'
              placeholder='Add notes for this order...'
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical='top'
            />
          </VStack>
        </VStack>

        {/* Add Item Button */}
        <Box className='px-6 pb-4'>
          <Pressable
            onPress={() => setShowProductPicker(true)}
            className='p-4 bg-indigo-500 rounded-lg flex-row items-center justify-center'
          >
            <Ionicons name='add' size={20} color='white' />
            <Text className='text-white font-medium ml-2'>Add Product</Text>
          </Pressable>
        </Box>

        {/* Order Items */}
        <ScrollView className='flex-1 px-6' showsVerticalScrollIndicator={false}>
          {orderItems.length === 0 ? (
            <VStack className='flex-1 justify-center items-center py-12' space='lg'>
              <Box className='size-16 bg-gray-100 rounded-full justify-center items-center'>
                <Ionicons name='basket-outline' size={32} color={colors.primary} />
              </Box>
              <VStack className='items-center' space='sm'>
                <Heading className='text-lg font-semibold text-gray-900'>
                  No Items Added
                </Heading>
                <Text className='text-gray-600 text-center'>
                  Add products to create your order
                </Text>
              </VStack>
            </VStack>
          ) : (
            <VStack space='md'>
              {orderItems.map((item, index) => (
                <Box
                  key={`${item.productId}-${item.supplierId}-${index}`}
                  className='bg-white border border-gray-200 rounded-xl p-4'
                >
                  {/* Product & Supplier Info */}
                  <HStack className='items-start' space='sm'>
                    <Box>
                      <ProductImage
                        uri={item.product.image}
                        {...ProductImageVariants.small}
                      />
                    </Box>
                    
                    <VStack className='flex-1' space='xs'>
                      <Text className='font-semibold text-gray-900'>
                        {item.product.name}
                      </Text>
                      <Text className='text-sm text-gray-600'>
                        {item.product.sku && `SKU: ${item.product.sku} • `}
                        {item.product.category?.name}
                      </Text>
                      <Text className='text-sm text-indigo-600'>
                        Supplier: {item.supplier.name}
                      </Text>
                    </VStack>

                    <Pressable
                      onPress={() => removeOrderItem(index)}
                      className='p-2'
                    >
                      <Ionicons name='trash-outline' size={20} color={colors.error} />
                    </Pressable>
                  </HStack>

                  {/* Quantity and Cost Controls */}
                  <HStack className='items-center justify-between mt-4' space='md'>
                    <VStack space='xs'>
                      <Text className='text-xs text-gray-500 font-medium'>Quantity</Text>
                      <HStack className='items-center border border-gray-300 rounded-lg'>
                        <Pressable
                          onPress={() => updateOrderItem(index, 'quantityOrdered', Math.max(1, item.quantityOrdered - 1))}
                          className='p-3'
                        >
                          <Ionicons name='remove' size={16} color={colors.primary} />
                        </Pressable>
                        <Text className='px-4 font-medium'>{item.quantityOrdered}</Text>
                        <Pressable
                          onPress={() => updateOrderItem(index, 'quantityOrdered', item.quantityOrdered + 1)}
                          className='p-3'
                        >
                          <Ionicons name='add' size={16} color={colors.primary} />
                        </Pressable>
                      </HStack>
                    </VStack>

                    <VStack space='xs'>
                      <Text className='text-xs text-gray-500 font-medium'>Unit Cost</Text>
                      <TextInput
                        className='w-20 p-2 border border-gray-300 rounded-lg text-center'
                        value={item.unitCost.toString()}
                        onChangeText={(text) => {
                          const cost = parseFloat(text) || 0
                          updateOrderItem(index, 'unitCost', cost)
                        }}
                        keyboardType='numeric'
                        returnKeyType='done'
                      />
                    </VStack>

                    <VStack space='xs' className='items-end'>
                      <Text className='text-xs text-gray-500 font-medium'>Total</Text>
                      <Text className='font-semibold text-gray-900'>
                        ${(item.quantityOrdered * item.unitCost).toFixed(2)}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {orderItems.length > 0 && (
          <Box className='p-6 pt-4 border-t border-gray-200 bg-white'>
            <VStack space='sm'>
              <HStack className='items-center justify-between'>
                <Text className='text-gray-600'>
                  {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
                </Text>
                <Text className='font-semibold text-gray-900 text-lg'>
                  Total: ${calculateTotal().toFixed(2)}
                </Text>
              </HStack>
              
              <Pressable
                onPress={createOrder}
                disabled={isCreating}
                className={`py-4 rounded-xl items-center ${
                  isCreating ? 'bg-gray-300' : 'bg-indigo-500'
                }`}
              >
                {isCreating ? (
                  <HStack className='items-center' space='sm'>
                    <ActivityIndicator size='small' color='white' />
                    <Text className='text-white font-semibold'>Creating Order...</Text>
                  </HStack>
                ) : (
                  <Text className='text-white font-semibold'>
                    Create Order{orderItems.length > 1 ? 's' : ''}
                  </Text>
                )}
              </Pressable>
            </VStack>
          </Box>
        )}
      </VStack>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <SafeAreaView className='flex-1 bg-white'>
          <VStack className='flex-1'>
            <HStack className='items-center justify-between p-6 pb-4 border-b border-gray-200'>
              <Pressable onPress={() => setShowProductPicker(false)}>
                <Text className='text-indigo-500 font-medium'>Cancel</Text>
              </Pressable>
              <Heading className='text-lg font-semibold text-gray-900'>
                Select Product
              </Heading>
              <Box className='w-16' />
            </HStack>

            <ScrollView className='flex-1 p-6' showsVerticalScrollIndicator={false}>
              <VStack space='sm'>
                {simplifiedProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => {
                      setSelectedProduct(product)
                      setShowProductPicker(false)
                      setShowSupplierPicker(true)
                    }}
                    className='p-4 bg-gray-50 rounded-lg flex-row items-center'
                  >
                    <Box className='mr-3'>
                      <ProductImage
                        uri={product.image}
                        {...ProductImageVariants.small}
                      />
                    </Box>
                    
                    <VStack className='flex-1' space='xs'>
                      <Text className='font-medium text-gray-900'>
                        {product.name}
                      </Text>
                      <Text className='text-sm text-gray-600'>
                        {product.sku && `SKU: ${product.sku} • `}
                        ${product.costPerUnit.toFixed(2)}/{product.unit}
                        {product.category && ` • ${product.category.name}`}
                      </Text>
                    </VStack>

                    <Ionicons name='chevron-forward' size={20} color='#9CA3AF' />
                  </Pressable>
                ))}
              </VStack>
            </ScrollView>
          </VStack>
        </SafeAreaView>
      </Modal>

      {/* Supplier Picker Modal */}
      <Modal
        visible={showSupplierPicker}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <SafeAreaView className='flex-1 bg-white'>
          <VStack className='flex-1'>
            <HStack className='items-center justify-between p-6 pb-4 border-b border-gray-200'>
              <Pressable onPress={() => setShowSupplierPicker(false)}>
                <Text className='text-indigo-500 font-medium'>Back</Text>
              </Pressable>
              <Heading className='text-lg font-semibold text-gray-900'>
                Select Supplier
              </Heading>
              <Box className='w-16' />
            </HStack>

            <ScrollView className='flex-1 p-6' showsVerticalScrollIndicator={false}>
              <VStack space='sm'>
                {suppliers.map((supplier) => (
                  <Pressable
                    key={supplier.id}
                    onPress={() => {
                      if (selectedProduct) {
                        addOrderItem(selectedProduct, supplier)
                      }
                    }}
                    className='p-4 bg-gray-50 rounded-lg'
                  >
                    <VStack space='xs'>
                      <Text className='font-medium text-gray-900'>
                        {supplier.name}
                      </Text>
                      {supplier.contactPerson && (
                        <Text className='text-sm text-gray-600'>
                          Contact: {supplier.contactPerson}
                        </Text>
                      )}
                      {supplier.email && (
                        <Text className='text-sm text-gray-600'>
                          {supplier.email}
                        </Text>
                      )}
                    </VStack>
                  </Pressable>
                ))}
              </VStack>
            </ScrollView>
          </VStack>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}