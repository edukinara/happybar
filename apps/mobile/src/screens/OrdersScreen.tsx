import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo, useState } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'

import { PageGradient } from '../components/PageGradient'
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import { cn } from '../constants/themeClasses'
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
      image?: string
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

  const renderOrderCard = (order: Order) => (
    <ThemedCard key={order.id} variant='primary' size='md'>
      <Pressable
        onPress={() =>
          navigation.navigate('OrderDetail', { orderId: order.id })
        }
      >
        <HStack space='md' className='items-center justify-center w-full'>
          <VStack className='items-start flex-1 w-full'>
            <HStack className='justify-between items-center w-full'>
              <ThemedText variant='h4' color='primary'>
                {order.orderNumber}
              </ThemedText>
              <ThemedBadge variant={getStatusVariant(order.status)} size='sm'>
                {ORDER_STATUS_LABELS[order.status]}
              </ThemedBadge>
            </HStack>
            <ThemedText color='secondary'>{order.supplier.name}</ThemedText>

            <HStack className='justify-between items-center gap-1'>
              <ThemedText variant='caption' color='muted'>
                Items: {order.items.length}
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                •
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                Total: $
                {order.totalAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                •
              </ThemedText>
              <ThemedText variant='caption' color='muted'>
                {new Date(order.orderDate).toLocaleDateString()}
              </ThemedText>
            </HStack>
          </VStack>
          <Ionicons name='chevron-forward' size={20} color='#9CA3AF' />
        </HStack>
        <VStack space='sm'>
          {order.status === 'DRAFT' && (
            <HStack space='sm' className='mt-2'>
              <ThemedButton
                variant='warning'
                size='sm'
                className='flex-1'
                onPress={() =>
                  navigation.navigate('EditOrder', { orderId: order.id })
                }
              >
                <HStack className='gap-2 items-center'>
                  <Ionicons name='create' size={16} color='white' />
                  <ThemedText color='onGradient' weight='medium'>
                    Edit
                  </ThemedText>
                </HStack>
              </ThemedButton>
              <ThemedButton
                variant='primary'
                size='sm'
                className='flex-1'
                onPress={() => handleStatusChange(order.id, 'SENT')}
              >
                <HStack className='gap-2 items-center'>
                  <Ionicons name='send' size={16} color='white' />
                  <ThemedText color='onGradient' weight='medium'>
                    Send
                  </ThemedText>
                </HStack>
              </ThemedButton>
            </HStack>
          )}

          {(order.status === 'SENT' ||
            order.status === 'PARTIALLY_RECEIVED') && (
            <ThemedButton
              variant='success'
              size='sm'
              icon={
                <Ionicons name='checkmark-circle' size={16} color='white' />
              }
              fullWidth
              className='mt-2'
              onPress={() =>
                navigation.navigate('OrderDetail', { orderId: order.id })
              }
            >
              Receive Items
            </ThemedButton>
          )}
        </VStack>
      </Pressable>
    </ThemedCard>
  )

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
            Loading orders...
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
              Orders
            </ThemedHeading>
          </HStack>
        </HStack>
      </Box>

      {/* Search Container */}
      <Box className='p-4'>
        <ThemedInput
          variant='filled'
          size='lg'
          fieldProps={{
            placeholder: 'Search orders...',
            value: searchTerm,
            onChangeText: setSearchTerm,
          }}
        />
      </Box>

      {/* Filter Buttons */}
      <Box className='px-4 pb-2'>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingBottom: 8 }}
        >
          <HStack style={{ gap: 12, paddingHorizontal: 4 }}>
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
              <ThemedButton
                key={status}
                variant={statusFilter === status ? 'primary' : 'outline'}
                size='lg'
                onPress={() => setStatusFilter(status)}
                className={cn(
                  'h-10 px-5',
                  statusFilter === status
                    ? 'border border-white/80 dark:border-white/80'
                    : 'bg-white/20 dark:bg-white/10 border-transparent dark:border-transparent'
                )}
              >
                <ThemedText
                  variant='caption'
                  weight='semibold'
                  color='onGradient'
                  className='text-[14px]'
                >
                  {status === 'ALL'
                    ? 'All'
                    : ORDER_STATUS_FILTER_LABELS[status]}
                </ThemedText>
              </ThemedButton>
            ))}
          </HStack>
        </ScrollView>
      </Box>

      {/* Content */}
      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 32,
        }}
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
            <Box className='size-16 bg-white/20 dark:bg-white/20 rounded-full justify-center items-center mb-4'>
              <Ionicons name='receipt-outline' size={32} color='white' />
            </Box>
            <ThemedHeading
              variant='h3'
              color='onGradient'
              weight='semibold'
              align='center'
            >
              No orders found
            </ThemedHeading>
            <ThemedText
              variant='body'
              color='onGradientMuted'
              align='center'
              style={{ marginTop: 8 }}
            >
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Create your first order to get started'}
            </ThemedText>
          </VStack>
        ) : (
          <VStack space='md'>{filteredOrders.map(renderOrderCard)}</VStack>
        )}
      </ScrollView>
    </PageGradient>
  )
}
