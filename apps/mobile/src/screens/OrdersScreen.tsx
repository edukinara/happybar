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
  ThemedCard, 
  ThemedButton, 
  ThemedInput, 
  ThemedText, 
  ThemedHeading, 
  ThemedBadge 
} from '../components/themed'
import { themeClasses, cn } from '../constants/themeClasses'
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

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'DRAFT': return 'default'
      case 'SENT': return 'info'  
      case 'PARTIALLY_RECEIVED': return 'warning'
      case 'RECEIVED': return 'success'
      case 'CANCELLED': return 'danger'
      default: return 'default'
    }
  }

  const renderOrderCard = (order: Order) => (
    <ThemedCard
      key={order.id}
      variant="elevated"
      size="md"
    >
      <Pressable
        onPress={() =>
          navigation.navigate('OrderDetail', { orderId: order.id })
        }
      >
        <HStack space='md' className='items-center justify-center w-full'>
          <VStack className='items-start flex-1 w-full'>
            <HStack className='justify-between items-center w-full'>
              <ThemedText variant="h4" color="primary">
                {order.orderNumber}
              </ThemedText>
              <ThemedBadge
                variant={getStatusVariant(order.status)}
                size="sm"
              >
                {ORDER_STATUS_LABELS[order.status]}
              </ThemedBadge>
            </HStack>
            <ThemedText color="secondary">{order.supplier.name}</ThemedText>

            <HStack className='justify-between items-center gap-1'>
              <ThemedText variant="caption" color="muted">
                Items: {order.items.length}
              </ThemedText>
              <ThemedText variant="caption" color="muted">•</ThemedText>
              <ThemedText variant="caption" color="muted">
                Total: $
                {order.totalAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </ThemedText>
              <ThemedText variant="caption" color="muted">•</ThemedText>
              <ThemedText variant="caption" color="muted">
                {new Date(order.orderDate).toLocaleDateString()}
              </ThemedText>
            </HStack>
          </VStack>
          <Ionicons name='chevron-forward' size={20} color='rgba(0,0,0,0.5)' />
        </HStack>
        <VStack space='sm'>
          {order.status === 'DRAFT' && (
            <HStack space='sm' className='mt-2'>
              <ThemedButton
                variant="warning"
                size="sm"
                icon={<Ionicons name='create' size={16} color='white' />}
                className="flex-1"
                onPress={() =>
                  navigation.navigate('EditOrder', { orderId: order.id })
                }
              >
                Edit
              </ThemedButton>
              <ThemedButton
                variant="primary"
                size="sm"
                icon={<Ionicons name='send' size={16} color='white' />}
                className="flex-1"
                onPress={() => handleStatusChange(order.id, 'SENT')}
              >
                Send
              </ThemedButton>
            </HStack>
          )}

          {(order.status === 'SENT' ||
            order.status === 'PARTIALLY_RECEIVED') && (
            <ThemedButton
              variant="success"
              size="sm"
              icon={<Ionicons name='checkmark-circle' size={16} color='white' />}
              fullWidth
              className="mt-2"
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
        <Box className='flex-1 justify-center items-center'>
          <ThemedText color="white" align="center">Loading orders...</ThemedText>
        </Box>
      </PageGradient>
    )
  }

  return (
    <PageGradient>
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
            <ThemedHeading variant="h3" color="white">Orders</ThemedHeading>
          </HStack>
        </HStack>
      </Box>

      {/* Search Container */}
      <Box className='p-4'>
        <ThemedInput
          variant="filled"
          size="lg"
          leftIcon={<Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />}
          fieldProps={{
            placeholder: 'Search orders...',
            value: searchTerm,
            onChangeText: setSearchTerm,
          }}
        />
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
              <ThemedText
                variant="caption"
                weight="semibold"
                style={{
                  color: statusFilter === status ? '#8B5CF6' : 'white',
                }}
              >
                {status === 'ALL' ? 'All' : ORDER_STATUS_FILTER_LABELS[status]}
              </ThemedText>
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
            <ThemedHeading variant="h3" color="white" align="center" className="mt-4 mb-2">
              No orders found
            </ThemedHeading>
            <ThemedText color="white" align="center" className="opacity-80">
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
