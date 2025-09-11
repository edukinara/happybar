import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
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

  const addOrderItem = (product: Product, supplier: Supplier) => {
    // Check if this product+supplier combo already exists
    const existingItem = orderItems.find(
      (item) => item.productId === product.id && item.supplierId === supplier.id
    )

    if (existingItem) {
      Alert.alert(
        'Item Already Added',
        'This product from this supplier is already in the order.'
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

  const createOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the order.')
      return
    }

    try {
      setIsCreating(true)

      // Group items by supplier
      const ordersBySupplier: {
        [supplierId: string]: {
          supplierId: string
          supplier: Supplier
          items: Array<{
            productId: string
            quantityOrdered: number
            unitCost: number
            orderingUnit: 'UNIT' | 'CASE'
          }>
        }
      } = {}

      orderItems.forEach((item) => {
        if (!ordersBySupplier[item.supplierId]) {
          ordersBySupplier[item.supplierId] = {
            supplierId: item.supplierId,
            supplier: item.supplier,
            items: [],
          }
        }

        ordersBySupplier[item.supplierId].items.push({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          orderingUnit: item.orderingUnit,
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
          items: orderData.items,
        })
        createdCount++
      }

      Alert.alert(
        'Success',
        `Created ${createdCount} order${createdCount === 1 ? '' : 's'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
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
      <PageGradient>
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ActivityIndicator size='large' color='white' />
          <ThemedText
            variant='body'
            color='onGradient'
            weight='medium'
            style={{ marginTop: 16 }}
          >
            Loading products and suppliers...
          </ThemedText>
        </Box>
      </PageGradient>
    )
  }

  return (
    <PageGradient>
      <StatusBar style='light' />

      {/* Header */}
      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center p-2'>
          <HStack space='md' className='items-center'>
            <Pressable className='mr-4' onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <ThemedHeading variant='h2' color='onGradient' weight='bold'>
              Create Order
            </ThemedHeading>
          </HStack>
        </HStack>
      </Box>

      {/* Content ScrollView */}
      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Order Details */}
        <VStack space='xl' className='pt-4'>
          <VStack className='px-6' space='lg'>
            <VStack space='sm'>
              <ThemedText
                variant='body'
                color='onGradientMuted'
                weight='medium'
              >
                Expected Delivery (Optional)
              </ThemedText>
              <ThemedInput
                variant='default'
                size='md'
                fieldProps={{
                  placeholder: 'YYYY-MM-DD',
                  value: expectedDate,
                  onChangeText: setExpectedDate,
                }}
              />
            </VStack>

            <VStack space='sm'>
              <ThemedText
                variant='body'
                color='onGradientMuted'
                weight='medium'
              >
                Notes (Optional)
              </ThemedText>
              <ThemedInput
                variant='default'
                size='md'
                fieldProps={{
                  placeholder: 'Add notes for this order...',
                  value: notes,
                  onChangeText: setNotes,
                  multiline: true,
                  numberOfLines: 3,
                  textAlignVertical: 'top',
                  style: {
                    textAlignVertical: 'top',
                    paddingTop: 12,
                    minHeight: 100,
                  },
                }}
              />
            </VStack>
          </VStack>

          {/* Add Item Button */}
          <Box className='px-6'>
            <ThemedButton
              onPress={() => setShowProductPicker(true)}
              variant='primary'
              size='lg'
              fullWidth
              className='rounded-lg elevation-sm border border-white/30 h-12'
            >
              <HStack className='items-center justify-center' space='sm'>
                <Ionicons name='add' size={20} color='white' />
                <ThemedText variant='body' color='onGradient' weight='medium'>
                  Add Product
                </ThemedText>
              </HStack>
            </ThemedButton>
          </Box>

          {/* Order Items */}
          <Box className='px-6'>
            {orderItems.length === 0 ? (
              <VStack
                className='flex-1 justify-center items-center py-12'
                space='lg'
              >
                <Box className='size-16 bg-white/20 dark:bg-white/20 rounded-full justify-center items-center'>
                  <Ionicons name='basket-outline' size={32} color='white' />
                </Box>
                <VStack className='items-center' space='sm'>
                  <ThemedHeading
                    variant='h3'
                    color='onGradient'
                    weight='semibold'
                  >
                    No Items Added
                  </ThemedHeading>
                  <ThemedText
                    variant='body'
                    color='onGradientMuted'
                    align='center'
                  >
                    Add products to create your order
                  </ThemedText>
                </VStack>
              </VStack>
            ) : (
              <VStack space='md'>
                {orderItems.map((item, index) => (
                  <ThemedCard
                    key={`${item.productId}-${item.supplierId}-${index}`}
                    variant='primary'
                    size='md'
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
                        <ThemedText
                          variant='body'
                          color='primary'
                          weight='semibold'
                        >
                          {item.product.name}
                        </ThemedText>
                        <ThemedText variant='caption' color='muted'>
                          {item.product.sku && `SKU: ${item.product.sku} • `}
                          {item.product.category?.name}
                        </ThemedText>
                        <ThemedText
                          variant='caption'
                          color='primary'
                          style={{ color: '#8B5CF6' }}
                        >
                          Supplier: {item.supplier.name}
                        </ThemedText>
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
                        <ThemedText
                          variant='caption'
                          color='muted'
                          weight='medium'
                        >
                          Quantity
                        </ThemedText>
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
                            <Ionicons name='remove' size={16} color='#8B5CF6' />
                          </Pressable>
                          <ThemedText
                            variant='body'
                            color='primary'
                            weight='medium'
                            className='px-4'
                          >
                            {item.quantityOrdered}
                          </ThemedText>
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
                        <ThemedText
                          variant='caption'
                          color='muted'
                          weight='medium'
                        >
                          Unit Cost
                        </ThemedText>
                        <ThemedInput
                          variant='default'
                          size='sm'
                          fieldProps={{
                            value: item.unitCost.toString(),
                            onChangeText: (text: string) => {
                              const cost = parseFloat(text) || 0
                              updateOrderItem(index, 'unitCost', cost)
                            },
                            keyboardType: 'numeric',
                            returnKeyType: 'done',
                          }}
                          className='w-24 text-center'
                        />
                      </VStack>

                      <VStack space='xs' className='items-end'>
                        <ThemedText
                          variant='caption'
                          color='muted'
                          weight='medium'
                        >
                          Total
                        </ThemedText>
                        <ThemedText
                          variant='body'
                          color='primary'
                          weight='semibold'
                        >
                          ${(item.quantityOrdered * item.unitCost).toFixed(2)}
                        </ThemedText>
                      </VStack>
                    </HStack>
                  </ThemedCard>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </ScrollView>

      {/* Bottom Actions */}
      {orderItems.length > 0 && (
        <ThemedCard
          variant='primary'
          size='lg'
          className='rounded-t-2xl rounded-b-none border-t border-white/20 pb-16'
        >
          <VStack space='md'>
            <HStack className='items-center justify-between'>
              <ThemedText variant='body' color='muted'>
                {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText variant='h3' color='primary' weight='semibold'>
                Total: ${calculateTotal().toFixed(2)}
              </ThemedText>
            </HStack>

            <ThemedButton
              onPress={createOrder}
              disabled={isCreating}
              variant='primary'
              size='lg'
              fullWidth
              className={cn(
                'rounded-lg border border-white/30 h-12',
                isCreating ? 'bg-gray-400 dark:bg-gray-600' : ''
              )}
            >
              {isCreating ? (
                <HStack className='items-center justify-center' space='sm'>
                  <ActivityIndicator size='small' color='white' />
                  <ThemedText
                    variant='body'
                    color='onGradient'
                    weight='semibold'
                  >
                    Creating Order...
                  </ThemedText>
                </HStack>
              ) : (
                <ThemedText variant='body' color='onGradient' weight='semibold'>
                  Create Order{orderItems.length > 1 ? 's' : ''}
                </ThemedText>
              )}
            </ThemedButton>
          </VStack>
        </ThemedCard>
      )}

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <SafeAreaView className={cn('flex-1', themeClasses.bg.modal)}>
          <VStack className='flex-1'>
            <HStack className='items-center justify-between p-6 pb-4 border-b border-white/20 dark:border-white/10'>
              <Pressable onPress={() => setShowProductPicker(false)}>
                <ThemedText variant='body' color='warning' weight='medium'>
                  Cancel
                </ThemedText>
              </Pressable>
              <ThemedHeading variant='h3' color='primary' weight='semibold'>
                Select Product
              </ThemedHeading>
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
                      <ThemedText
                        variant='body'
                        color='primary'
                        weight='medium'
                      >
                        {product.name}
                      </ThemedText>
                      <ThemedText variant='caption' color='muted'>
                        {product.sku && `SKU: ${product.sku} • `}$
                        {product.costPerUnit.toFixed(2)}/{product.unit}
                        {product.category && ` • ${product.category.name}`}
                      </ThemedText>
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
            <HStack className='items-center justify-between p-6 pb-4 border-b border-white/20 dark:border-white/10'>
              <Pressable onPress={() => setShowSupplierPicker(false)}>
                <ThemedText variant='body' color='warning' weight='medium'>
                  Back
                </ThemedText>
              </Pressable>
              <ThemedHeading variant='h3' color='primary' weight='semibold'>
                Select Supplier
              </ThemedHeading>
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
                      <ThemedText
                        variant='body'
                        color='primary'
                        weight='medium'
                      >
                        {supplier.name}
                      </ThemedText>
                      {supplier.contactEmail && (
                        <ThemedText variant='caption' color='muted'>
                          Contact: {supplier.contactEmail}
                        </ThemedText>
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
