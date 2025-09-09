import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo, useState } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { Colors } from '../constants/theme'
import { api } from '../lib/api'

export interface Order {
  id: string
  organizationId?: string
  supplierId: string
  orderNumber: string
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  orderDate: string
  expectedDate?: string
  receivedDate?: string
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  supplier: {
    id: string
    name: string
    contactEmail?: string
    contactPhone?: string
  }
  items: Array<{
    id: string
    productId: string
    quantityOrdered: number
    quantityReceived: number
    orderingUnit: 'UNIT' | 'CASE'
    unitCost: number
    totalCost: number
    product: {
      id: string
      name: string
      sku?: string
      caseSize: number
      category: {
        id: string
        name: string
      }
    }
  }>
}

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

const ORDER_STATUS_FILTER_LABELS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_RECEIVED: 'Partial',
  RECEIVED: 'Complete',
  CANCELLED: 'Cancelled',
}

interface OrdersScreenProps {
  navigation: any
}

export default function OrdersScreen({ navigation }: OrdersScreenProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | Order['status']>(
    'ALL'
  )
  const insets = useSafeAreaInsets()

  const loadOrders = async () => {
    try {
      const params: any = {}
      if (statusFilter !== 'ALL') {
        params.status = statusFilter
      }

      const response = await api.getOrders(params)
      setOrders(response.data || [])
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const onRefresh = () => {
    setRefreshing(true)
    loadOrders()
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [orders, searchTerm])

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order['status']
  ) => {
    try {
      await api.updateOrder(orderId, { status: newStatus })
      await loadOrders()
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  const renderOrderCard = (order: Order) => (
    <Card
      key={order.id}
      className='bg-white elevation-sm p-4 rounded-xl border-[1px] border-white/50'
    >
      <Pressable
        onPress={() =>
          navigation.navigate('OrderDetail', { orderId: order.id })
        }
      >
        <HStack space='md' className='items-center justify-center w-full'>
          <VStack className='items-start flex-1 w-full'>
            <HStack className='justify-between items-center w-full'>
              <Text className='text-lg font-bold text-gray-900'>
                {order.orderNumber}
              </Text>
              <Box
                className={`px-2 py-0 rounded-md ${ORDER_STATUS_COLORS[order.status]}`}
              >
                <Text className='text-xs py-0.5 font-medium text-white'>
                  {ORDER_STATUS_LABELS[order.status]}
                </Text>
              </Box>
            </HStack>
            <Text className='text-md text-gray-600'>{order.supplier.name}</Text>

            <HStack className='justify-between items-center gap-1'>
              <Text className='text-sm text-gray-600'>
                Items: {order.items.length}
              </Text>
              <Text className='text-sm text-gray-600'>•</Text>
              <Text className='text-sm text-gray-600'>
                Total: $
                {order.totalAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text className='text-sm text-gray-600'>•</Text>
              <Text className='text-sm text-gray-500'>
                {new Date(order.orderDate).toLocaleDateString()}
              </Text>
            </HStack>
          </VStack>
          <Ionicons name='chevron-forward' size={20} color='rgba(0,0,0,0.5)' />
        </HStack>
        <VStack space='sm'>
          {order.status === 'DRAFT' && (
            <Pressable
              className='flex-row items-center justify-center bg-blue-600 py-2 rounded-lg mt-2'
              onPress={() => handleStatusChange(order.id, 'SENT')}
            >
              <Ionicons name='send' size={16} color='white' />
              <Text className='text-white font-medium ml-1'>Send Order</Text>
            </Pressable>
          )}

          {(order.status === 'SENT' ||
            order.status === 'PARTIALLY_RECEIVED') && (
            <Pressable
              className='flex-row items-center justify-center bg-green-600 py-2 rounded-lg mt-2'
              onPress={() =>
                navigation.navigate('OrderDetail', { orderId: order.id })
              }
            >
              <Ionicons name='checkmark-circle' size={16} color='white' />
              <Text className='text-white font-medium ml-1'>Receive Items</Text>
            </Pressable>
          )}
        </VStack>
      </Pressable>
    </Card>
  )

  if (loading) {
    return (
      <Box className='flex-1 justify-center items-center'>
        <Text className='text-white'>Loading orders...</Text>
      </Box>
    )
  }

  return (
    <LinearGradient
      colors={[Colors.gradStart, Colors.gradMid, Colors.gradEnd]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style='light' />

      {/* Sticky Header with Safe Area */}
      <Box
        className='px-5 pb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center'>
          <HStack space='md' className='items-center'>
            <Pressable className='mr-4' onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <Text className='text-white text-xl font-bold'>Orders</Text>
          </HStack>
        </HStack>
      </Box>

      {/* Search Container */}
      <Box className='p-4'>
        <Input
          className='border-white/30 rounded-xl h-12 bg-white elevation-md'
          size='lg'
        >
          <InputField
            placeholder='Search orders...'
            placeholderTextColor='rgba(0,0,0,0.4)'
            className='text-black/90'
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </Input>
      </Box>

      {/* Filter Buttons */}
      <Box className='bg-white/5 h-11 justify-center'>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 6,
            alignItems: 'center',
          }}
        >
          {(
            [
              'ALL',
              'DRAFT',
              'SENT',
              'PARTIALLY_RECEIVED',
              'RECEIVED',
              'CANCELLED',
            ] as const
          ).map((status) => (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={{
                backgroundColor:
                  statusFilter === status
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.2)',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text
                className='font-semibold text-sm'
                style={{
                  color: statusFilter === status ? Colors.primary : 'white',
                }}
              >
                {status === 'ALL' ? 'All' : ORDER_STATUS_FILTER_LABELS[status]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Box>

      {/* Content */}
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='white'
            colors={['#8B5CF6']}
            progressBackgroundColor='white'
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <VStack className='items-center justify-center py-16 px-4'>
            <Ionicons
              name='receipt-outline'
              size={48}
              color='rgba(255,255,255,0.4)'
            />
            <Text className='text-lg font-bold text-white mt-4 mb-2'>
              No orders found
            </Text>
            <Text className='text-md text-white/80 text-center'>
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Create your first order to get started'}
            </Text>
          </VStack>
        ) : (
          <VStack space='md'>{filteredOrders.map(renderOrderCard)}</VStack>
        )}
      </ScrollView>
    </LinearGradient>
  )
}
