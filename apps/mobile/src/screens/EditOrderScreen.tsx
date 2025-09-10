import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import React, { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import { cn, themeClasses } from '../constants/themeClasses'
import { useProducts, useSuppliers } from '../hooks/useInventoryData'
import { api } from '../lib/api'

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
  id?: string
  productId: string
  product: Product
  supplierId: string
  supplier: Supplier
  quantityOrdered: number
  unitCost: number
  orderingUnit: 'UNIT' | 'CASE'
}

type EditOrderScreenProps = {
  route: {
    params: {
      orderId: string
    }
  }
}

export function EditOrderScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { orderId } = (route.params as any) || {}
  
  const [loading, setLoading] = useState(true)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [notes, setNotes] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [originalOrder, setOriginalOrder] = useState<any>(null)
  const insets = useSafeAreaInsets()

  // Data hooks
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers()

  // Convert products to simplified format
  const simplifiedProducts: Product[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.image,
    unit: p.unit,
    costPerUnit: p.costPerUnit,
    category: p.category,
  }))

  // Load existing order data
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return
      
      try {
        setLoading(true)
        const response = await api.getOrder(orderId)
        
        if (response.success && response.data) {
          const order = response.data
          setOriginalOrder(order)
          setNotes(order.notes || '')
          setExpectedDate(order.expectedDate || '')
          
          // Convert order items to our format
          const items: OrderItem[] = order.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            product: {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
              unit: 'unit', // Default unit
              costPerUnit: item.unitCost,
              category: item.product.category,
            },
            supplierId: order.supplierId,
            supplier: order.supplier,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            orderingUnit: item.orderingUnit,
          }))
          
          setOrderItems(items)
        }
      } catch (error) {
        console.error('Failed to load order:', error)
        Alert.alert('Error', 'Failed to load order data')
        navigation.goBack()
      } finally {
        setLoading(false)
      }
    }
    
    loadOrder()
  }, [orderId, navigation])

  const addOrderItem = (product: Product, supplier: Supplier) => {
    // Check if this product already exists in the order
    const existingItem = orderItems.find(
      (item) => item.productId === product.id
    )

    if (existingItem) {
      Alert.alert(
        'Item Already Added',
        'This product is already in the order.'
      )
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

  const updateOrderItem = (
    index: number,
    field: keyof OrderItem,
    value: any
  ) => {
    const updatedItems = [...orderItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setOrderItems(updatedItems)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0
    )
  }

  const saveOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the order.')
      return
    }

    try {
      setIsUpdating(true)

      const updateData = {
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: orderItems.map(item => ({
          id: item.id,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit,
        })),
      }

      await api.updateOrder(orderId, updateData)

      Alert.alert(
        'Success',
        'Order updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('Failed to update order:', error)
      Alert.alert('Error', 'Failed to update order. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading || productsLoading || suppliersLoading) {
    return (
      <PageGradient>
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ActivityIndicator size='large' color='white' />
          <Text className='text-white text-lg mt-4'>
            Loading order data...
          </Text>
        </Box>
      </PageGradient>
    )
  }

  return (
    <PageGradient>
      <StatusBar style='light' />

      {/* Header */}
      <Box
        className='px-5 pb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center'>
          <HStack space='md' className='items-center'>
            <Pressable className='mr-4' onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <VStack>
              <Text className='text-white text-xl font-bold'>
                Edit Order
              </Text>
              <Text className='text-white/80 text-sm'>
                {originalOrder?.orderNumber}
              </Text>
            </VStack>
          </HStack>
        </HStack>
      </Box>

      {/* Order Details */}
      <VStack className='px-6 py-4' space='md'>
        <VStack space='sm'>
          <Text className='font-medium text-white/90'>
            Expected Delivery (Optional)
          </Text>
          <TextInput
            className={cn('p-3 rounded-lg', themeClasses.input.base)}
            placeholder='YYYY-MM-DD'
            value={expectedDate}
            onChangeText={setExpectedDate}
          />
        </VStack>

        <VStack space='sm'>
          <Text className='font-medium text-white/90'>Notes (Optional)</Text>
          <TextInput
            className={cn('p-3 rounded-lg', themeClasses.input.base)}
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
          <VStack
            className='flex-1 justify-center items-center py-12'
            space='lg'
          >
            <Box className='size-16 bg-gray-100 rounded-full justify-center items-center'>
              <Ionicons
                name='basket-outline'
                size={32}
                color='#8B5CF6'
              />
            </Box>
            <VStack className='items-center' space='sm'>
              <Heading className='text-lg font-semibold text-white'>
                No Items Added
              </Heading>
              <Text className='text-white/60 text-center'>
                Add products to this order
              </Text>
            </VStack>
          </VStack>
        ) : (
          <VStack space='md'>
            {orderItems.map((item, index) => (
              <Box
                key={`${item.productId}-${index}`}
                className={cn('rounded-xl p-4', themeClasses.card.solid)}
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
                    <Text className={cn('font-semibold', themeClasses.text.primary)}>
                      {item.product.name}
                    </Text>
                    <Text className={cn('text-sm', themeClasses.text.muted)}>
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
                    <Ionicons
                      name='trash-outline'
                      size={20}
                      color='#EF4444'
                    />
                  </Pressable>
                </HStack>

                {/* Quantity and Cost Controls */}
                <HStack
                  className='items-center justify-between mt-4'
                  space='md'
                >
                  <VStack space='xs'>
                    <Text
                      className={cn(
                        'text-xs font-medium',
                        themeClasses.text.muted
                      )}
                    >
                      Quantity
                    </Text>
                    <HStack className='items-center border border-gray-300 rounded-lg'>
                      <Pressable
                        onPress={() =>
                          updateOrderItem(
                            index,
                            'quantityOrdered',
                            Math.max(1, item.quantityOrdered - 1)
                          )
                        }
                        className='p-3'
                      >
                        <Ionicons
                          name='remove'
                          size={16}
                          color='#8B5CF6'
                        />
                      </Pressable>
                      <Text className='px-4 font-medium'>
                        {item.quantityOrdered}
                      </Text>
                      <Pressable
                        onPress={() =>
                          updateOrderItem(
                            index,
                            'quantityOrdered',
                            item.quantityOrdered + 1
                          )
                        }
                        className='p-3'
                      >
                        <Ionicons name='add' size={16} color='#8B5CF6' />
                      </Pressable>
                    </HStack>
                  </VStack>

                  <VStack space='xs'>
                    <Text
                      className={cn(
                        'text-xs font-medium',
                        themeClasses.text.muted
                      )}
                    >
                      Unit Cost
                    </Text>
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
                    <Text
                      className={cn(
                        'text-xs font-medium',
                        themeClasses.text.muted
                      )}
                    >
                      Total
                    </Text>
                    <Text className={cn('font-semibold', themeClasses.text.primary)}>
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
        <Box className={cn('p-6 pt-4 border-t border-gray-200 dark:border-gray-700', themeClasses.bg.card)}>
          <VStack space='sm'>
            <HStack className='items-center justify-between'>
              <Text className={cn(themeClasses.text.muted)}>
                {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
              </Text>
              <Text className={cn('font-semibold text-lg', themeClasses.text.primary)}>
                Total: ${calculateTotal().toFixed(2)}
              </Text>
            </HStack>

            <Pressable
              onPress={saveOrder}
              disabled={isUpdating}
              className={`py-4 rounded-xl items-center ${
                isUpdating ? 'bg-gray-300' : 'bg-green-600'
              }`}
            >
              {isUpdating ? (
                <HStack className='items-center' space='sm'>
                  <ActivityIndicator size='small' color='white' />
                  <Text className='text-white font-semibold'>
                    Updating Order...
                  </Text>
                </HStack>
              ) : (
                <Text className='text-white font-semibold'>
                  Save Changes
                </Text>
              )}
            </Pressable>
          </VStack>
        </Box>
      )}

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <SafeAreaView className={cn('flex-1', themeClasses.bg.modal)}>
          <VStack className='flex-1'>
            <HStack className='items-center justify-between p-6 pb-4 border-b border-gray-200'>
              <Pressable onPress={() => setShowProductPicker(false)}>
                <Text className='text-indigo-500 font-medium'>Cancel</Text>
              </Pressable>
              <Heading className={cn('text-lg font-semibold', themeClasses.text.primary)}>
                Select Product
              </Heading>
              <Box className='w-16' />
            </HStack>

            <ScrollView
              className='flex-1 p-6'
              showsVerticalScrollIndicator={false}
            >
              <VStack space='sm'>
                {simplifiedProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => {
                      setSelectedProduct(product)
                      setShowProductPicker(false)
                      setShowSupplierPicker(true)
                    }}
                    className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex-row items-center'
                  >
                    <Box className='mr-3'>
                      <ProductImage
                        uri={product.image}
                        {...ProductImageVariants.small}
                      />
                    </Box>

                    <VStack className='flex-1' space='xs'>
                      <Text className={cn('font-medium', themeClasses.text.primary)}>
                        {product.name}
                      </Text>
                      <Text className={cn('text-sm', themeClasses.text.muted)}>
                        {product.sku && `SKU: ${product.sku} • `}$
                        {product.costPerUnit.toFixed(2)}/{product.unit}
                        {product.category && ` • ${product.category.name}`}
                      </Text>
                    </VStack>

                    <Ionicons
                      name='chevron-forward'
                      size={20}
                      color='#9CA3AF'
                    />
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
        <SafeAreaView className={cn('flex-1', themeClasses.bg.modal)}>
          <VStack className='flex-1'>
            <HStack className='items-center justify-between p-6 pb-4 border-b border-gray-200'>
              <Pressable onPress={() => setShowSupplierPicker(false)}>
                <Text className='text-indigo-500 font-medium'>Back</Text>
              </Pressable>
              <Heading className={cn('text-lg font-semibold', themeClasses.text.primary)}>
                Select Supplier
              </Heading>
              <Box className='w-16' />
            </HStack>

            <ScrollView
              className='flex-1 p-6'
              showsVerticalScrollIndicator={false}
            >
              <VStack space='sm'>
                {suppliers.map((supplier) => (
                  <Pressable
                    key={supplier.id}
                    onPress={() => {
                      if (selectedProduct) {
                        addOrderItem(selectedProduct, supplier)
                      }
                    }}
                    className={cn('p-4 rounded-lg', themeClasses.card.primary)}
                  >
                    <VStack space='xs'>
                      <Text className={cn('font-medium', themeClasses.text.primary)}>
                        {supplier.name}
                      </Text>
                      {supplier.contactEmail && (
                        <Text className={cn('text-sm', themeClasses.text.muted)}>
                          Contact: {supplier.contactEmail}
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
    </PageGradient>
  )
}