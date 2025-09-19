import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'

import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import { api } from '../lib/api'
import { pluralize } from '../utils/pluralize'
import type { Order } from './OrdersScreen'

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

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'default'
      case 'SENT':
        return 'info'
      case 'PARTIALLY_RECEIVED':
        return 'warning'
      case 'RECEIVED':
        return 'success'
      case 'CANCELLED':
        return 'danger'
      default:
        return 'default'
    }
  }

  const canReceiveItems =
    order?.status === 'SENT' || order?.status === 'PARTIALLY_RECEIVED'
  const canSendOrder = order?.status === 'DRAFT'
  const canCancelOrder = order?.status === 'DRAFT' || order?.status === 'SENT'
  const canCloseOrder = order?.status === 'PARTIALLY_RECEIVED'

  if (loading) {
    return (
      <PageGradient>
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ThemedText
            variant='body'
            color='onGradient'
            weight='medium'
            align='center'
          >
            Loading order details...
          </ThemedText>
        </Box>
      </PageGradient>
    )
  }

  if (!order) {
    return (
      <PageGradient>
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ThemedText
            variant='body'
            color='onGradient'
            weight='medium'
            align='center'
          >
            Order not found
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
        className='px-5 pb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center p-2'>
          <HStack space='md' className='items-center'>
            <Pressable className='mr-4' onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <ThemedHeading variant='h2' color='onGradient' weight='bold'>
              Order Details
            </ThemedHeading>
          </HStack>
        </HStack>
      </Box>

      {/* Order Summary (not in card) */}
      <Box className='px-4 pt-4 pb-4 bg-black/20 dark:bg-white/5'>
        <VStack space='md'>
          <HStack className='justify-between items-start'>
            <VStack space='xs'>
              <ThemedHeading variant='h2' color='onGradient' weight='bold'>
                {order.orderNumber}
              </ThemedHeading>
              <ThemedText variant='h4' color='onGradientMuted'>
                {order.supplier.name}
              </ThemedText>
            </VStack>
            <ThemedBadge variant={getStatusVariant(order.status)} size='md'>
              {ORDER_STATUS_LABELS[order.status]}
            </ThemedBadge>
          </HStack>

          {/* Order Details Grid */}
          <VStack space='xs'>
            <HStack className='justify-between'>
              <ThemedText variant='body' color='onGradientMuted'>
                Order Date:
              </ThemedText>
              <ThemedText variant='body' color='onGradient' weight='medium'>
                {new Date(order.orderDate).toLocaleDateString()}
              </ThemedText>
            </HStack>

            {order.expectedDate && (
              <HStack className='justify-between'>
                <ThemedText variant='body' color='onGradientMuted'>
                  Expected Date:
                </ThemedText>
                <ThemedText variant='body' color='onGradient' weight='medium'>
                  {new Date(order.expectedDate).toLocaleDateString()}
                </ThemedText>
              </HStack>
            )}

            {order.receivedDate && (
              <HStack className='justify-between'>
                <ThemedText variant='body' color='onGradientMuted'>
                  Received Date:
                </ThemedText>
                <ThemedText variant='body' color='onGradient' weight='medium'>
                  {new Date(order.receivedDate).toLocaleDateString()}
                </ThemedText>
              </HStack>
            )}

            <HStack className='justify-between'>
              <ThemedText variant='body' color='onGradientMuted'>
                Total Amount:
              </ThemedText>
              <ThemedText variant='h3' color='onGradient' weight='bold'>
                $
                {order.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </ThemedText>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* Content */}
      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Items Section Header */}
        <Box className='p-4 pb-3'>
          <ThemedHeading variant='h3' color='onGradient' weight='bold'>
            Items ({order.items.length})
          </ThemedHeading>
        </Box>

        {/* Items List */}
        <VStack space='md' className='px-4'>
          {order.items.map((item) => (
            <ThemedCard key={item.id} variant='primary' size='lg'>
              <VStack space='md'>
                <HStack space='sm'>
                  {/* Product Image */}
                  <ProductImage
                    uri={item.product.image}
                    {...ProductImageVariants.small}
                  />
                  <VStack space='md' className='flex-1'>
                    <HStack className='justify-between items-start'>
                      <VStack className='flex-1 mr-4' space='xs'>
                        <ThemedText variant='h4' color='primary' weight='bold'>
                          {item.product.name}
                        </ThemedText>
                        <ThemedText variant='caption' color='muted'>
                          {item.product.category.name}
                        </ThemedText>
                        {item.product.sku && (
                          <ThemedText variant='caption' color='muted'>
                            SKU: {item.product.sku}
                          </ThemedText>
                        )}
                      </VStack>
                      <ThemedText variant='h4' color='success' weight='bold'>
                        ${item.totalCost.toFixed(2)}
                      </ThemedText>
                    </HStack>
                  </VStack>
                </HStack>

                {/* Quantity Information */}
                <HStack className='items-start justify-between'>
                  <VStack space='xs'>
                    <ThemedText variant='caption' color='muted'>
                      Ordered
                    </ThemedText>
                    <ThemedText variant='body' color='primary' weight='medium'>
                      {item.quantityOrdered}{' '}
                      {pluralize(
                        item.quantityOrdered,
                        item.orderingUnit.toLowerCase()
                      )}
                      {item.orderingUnit === 'CASE' &&
                        item.product.caseSize &&
                        ` (${item.quantityOrdered * item.product.caseSize} units)`}
                    </ThemedText>
                  </VStack>

                  {canReceiveItems ? (
                    <VStack space='xs' className='ml-4'>
                      <ThemedText variant='caption' color='muted'>
                        Received
                      </ThemedText>
                      <HStack className='flex flex-1 items-center gap-4 justify-between'>
                        <ThemedButton
                          variant='secondary'
                          size='sm'
                          onPress={() =>
                            updateReceivedQuantity(
                              item.id,
                              (receivedQuantities[item.id] || 0) - 1
                            )
                          }
                          className='size-12 p-0'
                        >
                          <Ionicons name='remove' size={16} color='#8B5CF6' />
                        </ThemedButton>
                        <Box>
                          <ThemedInput
                            variant='default'
                            size='md'
                            className='w-24'
                            fieldProps={{
                              value: String(receivedQuantities[item.id] || 0),
                              onChangeText: (text) => {
                                const num = parseInt(text) || 0
                                updateReceivedQuantity(item.id, num)
                              },
                              keyboardType: 'numeric',
                              textAlign: 'center',
                            }}
                          />
                        </Box>

                        <ThemedButton
                          variant='secondary'
                          size='sm'
                          onPress={() =>
                            updateReceivedQuantity(
                              item.id,
                              (receivedQuantities[item.id] || 0) + 1
                            )
                          }
                          className='size-12 p-0'
                        >
                          <Ionicons name='add' size={16} color='#8B5CF6' />
                        </ThemedButton>
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack space='xs'>
                      <ThemedText variant='caption' color='muted'>
                        Received
                      </ThemedText>
                      <ThemedText
                        variant='body'
                        color='primary'
                        weight='medium'
                      >
                        {item.quantityReceived}{' '}
                        {pluralize(
                          item.quantityReceived,
                          item.orderingUnit.toLowerCase()
                        )}
                      </ThemedText>
                    </VStack>
                  )}
                </HStack>

                <Box className='border-t border-gray-200 pt-3'>
                  <ThemedText variant='caption' color='muted'>
                    Unit Cost: ${item.unitCost.toFixed(2)} per{' '}
                    {item.orderingUnit.toLowerCase()}
                  </ThemedText>
                </Box>
              </VStack>
            </ThemedCard>
          ))}
        </VStack>

        {/* Notes Section */}
        {(canReceiveItems || order.notes) && (
          <Box className='p-6'>
            <ThemedCard variant='primary' size='lg'>
              <VStack space='md'>
                <ThemedHeading variant='h4' color='primary' weight='bold'>
                  Notes
                </ThemedHeading>
                {canReceiveItems ? (
                  <ThemedInput
                    variant='default'
                    size='lg'
                    fieldProps={{
                      value: notes,
                      onChangeText: setNotes,
                      placeholder: 'Add notes about this order...',
                      multiline: true,
                      numberOfLines: 3,
                    }}
                  />
                ) : (
                  <ThemedText
                    variant='body'
                    color='secondary'
                    style={{ fontStyle: 'italic' }}
                  >
                    {order.notes || 'No notes'}
                  </ThemedText>
                )}
              </VStack>
            </ThemedCard>
          </Box>
        )}

        {/* Action Buttons */}
        <VStack space='md' className='px-6 pb-6'>
          {canSendOrder && (
            <ThemedButton
              variant='primary'
              size='lg'
              onPress={() => handleStatusChange('SENT')}
              fullWidth
              icon={<Ionicons name='send' size={20} color='white' />}
            >
              <ThemedText variant='body' color='onGradient' weight='semibold'>
                Send Order
              </ThemedText>
            </ThemedButton>
          )}

          {canReceiveItems && (
            <ThemedButton
              variant='success'
              size='lg'
              onPress={handleReceiveItems}
              fullWidth
              icon={
                <Ionicons name='checkmark-circle' size={20} color='white' />
              }
            >
              <ThemedText variant='body' color='onGradient' weight='semibold'>
                Update Received Items
              </ThemedText>
            </ThemedButton>
          )}

          {order.status === 'SENT' && (
            <ThemedButton
              variant='success'
              size='lg'
              onPress={() => handleStatusChange('RECEIVED')}
              fullWidth
              icon={<Ionicons name='checkmark-done' size={20} color='white' />}
              className='bg-green-700 dark:bg-green-700'
            >
              <ThemedText variant='body' color='onGradient' weight='semibold'>
                Mark as Fully Received
              </ThemedText>
            </ThemedButton>
          )}

          {canCloseOrder && (
            <ThemedButton
              variant='primary'
              size='lg'
              onPress={() => {
                Alert.alert(
                  'Close Order',
                  'Are you sure you want to close this order? This will mark it as complete even though not all items were received.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Close Order',
                      style: 'default',
                      onPress: () => handleStatusChange('RECEIVED'),
                    },
                  ]
                )
              }}
              fullWidth
              icon={
                <Ionicons name='checkmark-circle' size={20} color='white' />
              }
              className='bg-blue-600 dark:bg-blue-600'
            >
              <ThemedText variant='body' color='onGradient' weight='semibold'>
                Close Order
              </ThemedText>
            </ThemedButton>
          )}

          {canCancelOrder && (
            <ThemedButton
              variant='danger'
              size='lg'
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
              fullWidth
              icon={<Ionicons name='close-circle' size={20} color='white' />}
            >
              <ThemedText variant='body' color='onGradient' weight='semibold'>
                Cancel Order
              </ThemedText>
            </ThemedButton>
          )}
        </VStack>
      </ScrollView>
    </PageGradient>
  )
}
