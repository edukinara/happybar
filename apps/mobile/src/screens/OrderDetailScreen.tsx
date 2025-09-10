import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { PageGradient } from '../components/PageGradient'
import { cn, themeClasses } from '../constants/themeClasses'
import { api } from '../lib/api'
import { pluralize } from '../utils/pluralize'
import type { Order } from './OrdersScreen'

const ORDER_STATUS_COLORS = {
  DRAFT: 'bg-blue-100',
  SENT: 'bg-blue-600',
  PARTIALLY_RECEIVED: 'bg-amber-600',
  RECEIVED: 'bg-green-600',
  CANCELLED: 'bg-red-600',
}

const ORDER_STATUS_LABELS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

interface OrderDetailScreenProps {
  navigation: any
  route: {
    params: {
      orderId: string
    }
  }
}

export default function OrderDetailScreen({
  navigation,
  route,
}: OrderDetailScreenProps) {
  const { orderId } = route.params
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number>
  >({})
  const [notes, setNotes] = useState('')
  const insets = useSafeAreaInsets()

  const loadOrder = async () => {
    try {
      const response = await api.getOrder(orderId)
      setOrder(response.data)

      // Initialize received quantities with current values
      const quantities: Record<string, number> = {}
      response.data.items.forEach((item: any) => {
        quantities[item.id] = item.quantityReceived
      })
      setReceivedQuantities(quantities)
      setNotes(response.data.notes || '')
    } catch (error) {
      console.error('Failed to load order:', error)
      Alert.alert('Error', 'Failed to load order details')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const handleStatusChange = async (newStatus: Order['status']) => {
    if (!order) return

    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'RECEIVED') {
        updateData.receivedDate = new Date().toISOString()

        // Set all items to fully received if marking as received
        const updatedItems = order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityOrdered,
          unitCost: item.unitCost,
        }))
        updateData.items = updatedItems
      }

      await api.updateOrder(orderId, updateData)
      await loadOrder()
    } catch (error) {
      console.error('Failed to update order status:', error)
      Alert.alert('Error', 'Failed to update order status')
    }
  }

  const handleReceiveItems = async () => {
    if (!order) return

    try {
      const updatedItems = order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: receivedQuantities[item.id] || 0,
        unitCost: item.unitCost,
      }))

      // Determine new status based on received quantities
      const allReceived = order.items.every(
        (item) => (receivedQuantities[item.id] || 0) >= item.quantityOrdered
      )
      const noneReceived = order.items.every(
        (item) => (receivedQuantities[item.id] || 0) === 0
      )

      let newStatus: Order['status']
      if (allReceived) {
        newStatus = 'RECEIVED'
      } else if (noneReceived) {
        newStatus = 'SENT'
      } else {
        newStatus = 'PARTIALLY_RECEIVED'
      }

      const updateData: any = {
        status: newStatus,
        items: updatedItems,
        notes,
      }

      if (newStatus === 'RECEIVED') {
        updateData.receivedDate = new Date().toISOString()
      }

      await api.updateOrder(orderId, updateData)
      await loadOrder()

      Alert.alert('Success', 'Order updated successfully')
    } catch (error) {
      console.error('Failed to update order:', error)
      Alert.alert('Error', 'Failed to update order')
    }
  }

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, quantity),
    }))
  }

  const canReceiveItems =
    order?.status === 'SENT' || order?.status === 'PARTIALLY_RECEIVED'
  const canSendOrder = order?.status === 'DRAFT'
  const canCancelOrder = order?.status === 'DRAFT' || order?.status === 'SENT'

  if (loading) {
    return (
      <PageGradient>
        <Box className='flex-1 justify-center items-center'>
          <Text className='text-white text-lg'>Loading order details...</Text>
        </Box>
      </PageGradient>
    )
  }

  if (!order) {
    return (
      <PageGradient>
        <Box className='flex-1 justify-center items-center'>
          <Text className='text-white text-lg'>Order not found</Text>
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
            <Text className='text-white text-xl font-bold'>Order Details</Text>
          </HStack>
        </HStack>
      </Box>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Info Section */}
        <Card className='m-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50'>
          <VStack space='md'>
            <HStack className='justify-between items-start'>
              <VStack space='xs'>
                <Text
                  className={cn('text-xl font-bold', themeClasses.text.primary)}
                >
                  {order.orderNumber}
                </Text>
                <Text className={cn('text-lg', themeClasses.text.muted)}>
                  {order.supplier.name}
                </Text>
              </VStack>
              <Box
                className={`px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}
              >
                <Text className='text-sm font-medium text-white'>
                  {ORDER_STATUS_LABELS[order.status]}
                </Text>
              </Box>
            </HStack>

            {/* Order Details Grid */}
            <VStack space='sm'>
              <HStack className='justify-between'>
                <Text className={cn('text-sm', themeClasses.text.muted)}>
                  Order Date:
                </Text>
                <Text
                  className={cn(
                    'text-sm font-medium',
                    themeClasses.text.primary
                  )}
                >
                  {new Date(order.orderDate).toLocaleDateString()}
                </Text>
              </HStack>

              {order.expectedDate && (
                <HStack className='justify-between'>
                  <Text className={cn('text-sm', themeClasses.text.muted)}>
                    Expected Date:
                  </Text>
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      themeClasses.text.primary
                    )}
                  >
                    {new Date(order.expectedDate).toLocaleDateString()}
                  </Text>
                </HStack>
              )}

              {order.receivedDate && (
                <HStack className='justify-between'>
                  <Text className={cn('text-sm', themeClasses.text.muted)}>
                    Received Date:
                  </Text>
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      themeClasses.text.primary
                    )}
                  >
                    {new Date(order.receivedDate).toLocaleDateString()}
                  </Text>
                </HStack>
              )}

              <HStack className='justify-between'>
                <Text className={cn('text-sm', themeClasses.text.muted)}>
                  Total Amount:
                </Text>
                <Text className='text-lg font-bold text-green-600'>
                  ${order.totalAmount.toFixed(2)}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Card>

        {/* Items Section */}
        <VStack space='md' className='px-4'>
          <Text className='text-white text-xl font-bold'>Items</Text>

          {order.items.map((item) => (
            <Card
              key={item.id}
              className='p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50'
            >
              <VStack space='sm'>
                <HStack className='justify-between items-start'>
                  <VStack className='flex-1 mr-4' space='xs'>
                    <Text
                      className={cn(
                        'text-lg font-bold',
                        themeClasses.text.primary
                      )}
                    >
                      {item.product.name}
                    </Text>
                    <Text className={cn('text-sm', themeClasses.text.muted)}>
                      {item.product.category.name}
                    </Text>
                    {item.product.sku && (
                      <Text className={cn('text-xs', themeClasses.text.muted)}>
                        SKU: {item.product.sku}
                      </Text>
                    )}
                  </VStack>
                  <Text className='text-lg font-bold text-green-600'>
                    ${item.totalCost.toFixed(2)}
                  </Text>
                </HStack>

                {/* Quantity Information */}
                <HStack className='justify-between items-center'>
                  <VStack space='xs'>
                    <Text className={cn('text-sm', themeClasses.text.muted)}>
                      Ordered
                    </Text>
                    <Text
                      className={cn(
                        'text-md font-medium',
                        themeClasses.text.primary
                      )}
                    >
                      {item.quantityOrdered}{' '}
                      {pluralize(
                        item.quantityOrdered,
                        item.orderingUnit.toLowerCase()
                      )}
                      {item.orderingUnit === 'CASE' &&
                        item.product.caseSize &&
                        ` (${item.quantityOrdered * item.product.caseSize} units)`}
                    </Text>
                  </VStack>

                  {canReceiveItems ? (
                    <VStack space='xs' className='ml-4'>
                      <Text className={cn('text-sm', themeClasses.text.muted)}>
                        Received
                      </Text>
                      <HStack className='items-center bg-white border border-gray-300 rounded-lg'>
                        <Pressable
                          className='p-2'
                          onPress={() =>
                            updateReceivedQuantity(
                              item.id,
                              (receivedQuantities[item.id] || 0) - 1
                            )
                          }
                        >
                          <Ionicons name='remove' size={16} color='#2563EB' />
                        </Pressable>

                        <Input className='w-16 text-center border-0'>
                          <InputField
                            value={String(receivedQuantities[item.id] || 0)}
                            onChangeText={(text) => {
                              const num = parseInt(text) || 0
                              updateReceivedQuantity(item.id, num)
                            }}
                            keyboardType='numeric'
                            className={cn(
                              'text-center',
                              themeClasses.text.primary
                            )}
                          />
                        </Input>

                        <Pressable
                          className='p-2'
                          onPress={() =>
                            updateReceivedQuantity(
                              item.id,
                              (receivedQuantities[item.id] || 0) + 1
                            )
                          }
                        >
                          <Ionicons name='add' size={16} color='#2563EB' />
                        </Pressable>
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack space='xs'>
                      <Text className={cn('text-sm', themeClasses.text.muted)}>
                        Received
                      </Text>
                      <Text
                        className={cn(
                          'text-md font-medium',
                          themeClasses.text.primary
                        )}
                      >
                        {item.quantityReceived}{' '}
                        {pluralize(
                          item.quantityReceived,
                          item.orderingUnit.toLowerCase()
                        )}
                      </Text>
                    </VStack>
                  )}
                </HStack>

                <Box className='border-t border-gray-200 pt-2'>
                  <Text className={cn('text-sm', themeClasses.text.muted)}>
                    Unit Cost: ${item.unitCost.toFixed(2)} per{' '}
                    {item.orderingUnit.toLowerCase()}
                  </Text>
                </Box>
              </VStack>
            </Card>
          ))}
        </VStack>

        {/* Notes Section */}
        <Card className='m-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50'>
          <VStack space='sm'>
            <Text
              className={cn('text-lg font-bold', themeClasses.text.primary)}
            >
              Notes
            </Text>
            {canReceiveItems ? (
              <Input className='bg-gray-50 border border-gray-300 rounded-lg'>
                <InputField
                  value={notes}
                  onChangeText={setNotes}
                  placeholder='Add notes about this order...'
                  multiline
                  numberOfLines={3}
                  className={themeClasses.text.primary}
                />
              </Input>
            ) : (
              <Text className={cn('italic', themeClasses.text.secondary)}>
                {order.notes || 'No notes'}
              </Text>
            )}
          </VStack>
        </Card>

        {/* Action Buttons */}
        <VStack space='md' className='px-4'>
          {canSendOrder && (
            <Pressable
              className='flex-row items-center justify-center bg-blue-600 py-3 rounded-xl'
              onPress={() => handleStatusChange('SENT')}
            >
              <Ionicons name='send' size={20} color='white' />
              <Text className='text-white font-medium text-lg ml-2'>
                Send Order
              </Text>
            </Pressable>
          )}

          {canReceiveItems && (
            <Pressable
              className='flex-row items-center justify-center bg-green-600 py-3 rounded-xl'
              onPress={handleReceiveItems}
            >
              <Ionicons name='checkmark-circle' size={20} color='white' />
              <Text className='text-white font-medium text-lg ml-2'>
                Update Received Items
              </Text>
            </Pressable>
          )}

          {order.status === 'SENT' && (
            <Pressable
              className='flex-row items-center justify-center bg-green-700 py-3 rounded-xl'
              onPress={() => handleStatusChange('RECEIVED')}
            >
              <Ionicons name='checkmark-done' size={20} color='white' />
              <Text className='text-white font-medium text-lg ml-2'>
                Mark as Fully Received
              </Text>
            </Pressable>
          )}

          {canCancelOrder && (
            <Pressable
              className='flex-row items-center justify-center bg-red-600 py-3 rounded-xl'
              onPress={() => {
                Alert.alert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order?',
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes',
                      style: 'destructive',
                      onPress: () => handleStatusChange('CANCELLED'),
                    },
                  ]
                )
              }}
            >
              <Ionicons name='close-circle' size={20} color='white' />
              <Text className='text-white font-medium text-lg ml-2'>
                Cancel Order
              </Text>
            </Pressable>
          )}
        </VStack>
      </ScrollView>
    </PageGradient>
  )
}
