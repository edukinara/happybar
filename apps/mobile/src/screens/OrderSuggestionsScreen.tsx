import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'
import { PageGradient } from '../components/PageGradient'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import { api } from '../lib/api'
import { pluralize } from '../utils/pluralize'

type OrderSuggestion = {
  supplier: {
    id: string
    name: string
    contactPerson?: string
    email?: string
    phone?: string
  }
  items: Array<{
    product: {
      id: string
      name: string
      brand?: string
      image?: string
      costPerUnit: number
      costPerCase?: number | null
      category: {
        id: string
        name: string
      }
    }
    currentQuantity: number
    minimumQuantity: number
    suggestedQuantity: number
    unitCost: number
    estimatedCost: number
    orderingUnit: 'UNIT' | 'CASE'
    packSize?: number | null
    location: {
      id: string
      name: string
    }
  }>
  totalEstimatedCost: number
}

export function OrderSuggestionsScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [suggestions, setSuggestions] = useState<OrderSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(
    new Set()
  )
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingQuantities, setEditingQuantities] = useState<{
    [key: string]: number
  }>({})
  const [editingOrderingUnits, setEditingOrderingUnits] = useState<{
    [key: string]: 'UNIT' | 'CASE'
  }>({})
  const [editingUnitCosts, setEditingUnitCosts] = useState<{
    [key: string]: number
  }>({})
  const [isCreatingOrders, setIsCreatingOrders] = useState(false)

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.getOrderSuggestions()
      setSuggestions(data)
    } catch (error) {
      console.error('Failed to load order suggestions:', error)
      Alert.alert(
        'Error',
        'Failed to load order suggestions. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSuggestions()
    }, [loadSuggestions])
  )

  // Toggle supplier selection
  const toggleSupplier = (supplierId: string) => {
    const newSelected = new Set(selectedSuppliers)
    if (newSelected.has(supplierId)) {
      newSelected.delete(supplierId)
      // Deselect all items for this supplier
      const supplier = suggestions.find((s) => s.supplier.id === supplierId)
      if (supplier) {
        supplier.items.forEach((item) => {
          selectedItems.delete(item.product.id)
        })
        setSelectedItems(new Set(selectedItems))
      }
    } else {
      newSelected.add(supplierId)
      // Select all items for this supplier
      const supplier = suggestions.find((s) => s.supplier.id === supplierId)
      if (supplier) {
        supplier.items.forEach((item) => {
          selectedItems.add(item.product.id)
        })
        setSelectedItems(new Set(selectedItems))
      }
    }
    setSelectedSuppliers(newSelected)
  }

  // Toggle individual item selection
  const toggleItem = (productId: string, supplierId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedItems(newSelected)

    // Update supplier selection based on items
    const supplier = suggestions.find((s) => s.supplier.id === supplierId)
    if (supplier) {
      const supplierItemIds = supplier.items.map((item) => item.product.id)
      const selectedSupplierItems = supplierItemIds.filter((id) =>
        newSelected.has(id)
      )

      if (selectedSupplierItems.length === 0) {
        selectedSuppliers.delete(supplierId)
      } else if (selectedSupplierItems.length === supplierItemIds.length) {
        selectedSuppliers.add(supplierId)
      }
      setSelectedSuppliers(new Set(selectedSuppliers))
    }
  }

  // Update quantity
  const updateQuantity = (productId: string, quantity: number) => {
    setEditingQuantities((prev) => ({
      ...prev,
      [productId]: quantity,
    }))
  }

  // Get final quantity (edited or suggested)
  const getFinalQuantity = (productId: string, suggestedQuantity: number) => {
    return editingQuantities[productId] ?? suggestedQuantity
  }

  // Get final ordering unit (edited or suggested)
  const getFinalOrderingUnit = (
    productId: string,
    suggestedUnit: 'UNIT' | 'CASE'
  ) => {
    return editingOrderingUnits[productId] ?? suggestedUnit
  }

  // Get final unit cost (edited or suggested)
  const getFinalUnitCost = (productId: string, suggestedCost: number) => {
    return editingUnitCosts[productId] ?? suggestedCost
  }

  // Update ordering unit with cost recalculation (like web app)
  const updateOrderingUnit = (
    productId: string,
    newUnit: 'UNIT' | 'CASE',
    item: OrderSuggestion['items'][0]
  ) => {
    const quantityNeeded = item.minimumQuantity - item.currentQuantity

    if (newUnit === 'CASE' && item.product.costPerCase && item.packSize) {
      // When switching to case ordering, calculate cases needed
      const casesNeeded = Math.ceil(quantityNeeded / item.packSize)
      const finalCasesNeeded = Math.max(casesNeeded, 1)

      setEditingOrderingUnits((prev) => ({ ...prev, [productId]: 'CASE' }))
      setEditingQuantities((prev) => ({
        ...prev,
        [productId]: finalCasesNeeded,
      }))
      setEditingUnitCosts((prev) => ({
        ...prev,
        [productId]: item.product.costPerCase!,
      }))
    } else if (newUnit === 'UNIT' && item.product.costPerUnit) {
      // When switching to unit ordering, use unit quantities
      let finalQuantity = Math.ceil(Math.max(quantityNeeded, 1))

      // If there's a pack size, round up to full packs for unit ordering
      if (item.packSize && item.packSize > 1) {
        finalQuantity = Math.ceil(finalQuantity / item.packSize) * item.packSize
      }

      setEditingOrderingUnits((prev) => ({ ...prev, [productId]: 'UNIT' }))
      setEditingQuantities((prev) => ({ ...prev, [productId]: finalQuantity }))
      setEditingUnitCosts((prev) => ({
        ...prev,
        [productId]: item.product.costPerUnit,
      }))
    }
  }

  // Calculate total estimated cost for selected items
  const calculateTotalCost = () => {
    let total = 0
    suggestions.forEach((suggestion) => {
      suggestion.items.forEach((item) => {
        if (selectedItems.has(item.product.id)) {
          const finalQuantity = getFinalQuantity(
            item.product.id,
            item.suggestedQuantity
          )
          const finalUnitCost = getFinalUnitCost(item.product.id, item.unitCost)
          total += finalQuantity * finalUnitCost
        }
      })
    })
    return total
  }

  // Create orders from selected suggestions
  const createOrdersFromSelections = async () => {
    if (selectedItems.size === 0) {
      Alert.alert(
        'No Items Selected',
        'Please select some items to create orders.'
      )
      return
    }

    try {
      setIsCreatingOrders(true)

      // Group selected items by supplier
      const ordersBySupplier: {
        [supplierId: string]: {
          supplierId: string
          items: Array<{
            productId: string
            quantityOrdered: number
            unitCost: number
            orderingUnit: 'UNIT' | 'CASE'
          }>
        }
      } = {}

      suggestions.forEach((suggestion) => {
        suggestion.items.forEach((item) => {
          if (selectedItems.has(item.product.id)) {
            if (!ordersBySupplier[suggestion.supplier.id]) {
              ordersBySupplier[suggestion.supplier.id] = {
                supplierId: suggestion.supplier.id,
                items: [],
              }
            }

            const finalQuantity = getFinalQuantity(
              item.product.id,
              item.suggestedQuantity
            )
            const finalOrderingUnit = getFinalOrderingUnit(
              item.product.id,
              item.orderingUnit
            )
            const finalUnitCost = getFinalUnitCost(
              item.product.id,
              item.unitCost
            )
            ordersBySupplier[suggestion.supplier.id].items.push({
              productId: item.product.id,
              quantityOrdered: finalQuantity,
              unitCost: finalUnitCost,
              orderingUnit: finalOrderingUnit,
            })
          }
        })
      })

      // Create orders
      const orderArray = Object.values(ordersBySupplier)
      await api.createOrdersFromSuggestions(orderArray)

      Alert.alert(
        'Success',
        `Created ${orderArray.length} order${orderArray.length === 1 ? '' : 's'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset selections and reload suggestions
              setSelectedSuppliers(new Set())
              setSelectedItems(new Set())
              setEditingQuantities({})
              setEditingOrderingUnits({})
              setEditingUnitCosts({})
              loadSuggestions()
            },
          },
        ]
      )
    } catch (error) {
      console.error('Failed to create orders:', error)
      Alert.alert('Error', 'Failed to create orders. Please try again.', [
        { text: 'OK' },
      ])
    } finally {
      setIsCreatingOrders(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageGradient>
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ActivityIndicator size='large' color='white' />
          <ThemedText
            variant='bodyLarge'
            color='onGradient'
            weight='medium'
            style={{ marginTop: 16 }}
          >
            Loading order suggestions...
          </ThemedText>
        </Box>
      </PageGradient>
    )
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <PageGradient>
        <StatusBar style='light' />

        {/* Header */}
        <Box
          className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
          style={{ paddingTop: insets.top + 4 }}
        >
          <HStack className='justify-between items-center p-2'>
            <HStack className='items-center gap-4'>
              <Pressable onPress={() => navigation.goBack()}>
                <Ionicons name='arrow-back' size={24} color='white' />
              </Pressable>
              <ThemedHeading variant='h2' color='onGradient' weight='bold'>
                Order Suggestions
              </ThemedHeading>
            </HStack>
          </HStack>
        </Box>

        {/* Empty state */}
        <VStack
          className='flex-1 justify-center items-center px-4'
          style={{ gap: 24 }}
        >
          <Box className='w-16 h-16 bg-white/20 rounded-full justify-center items-center'>
            <Ionicons name='checkmark-circle' size={32} color='white' />
          </Box>
          <VStack className='items-center' style={{ gap: 8 }}>
            <ThemedHeading
              variant='h2'
              color='onGradient'
              weight='bold'
              align='center'
            >
              No Suggestions Available
            </ThemedHeading>
            <ThemedText
              variant='bodyLarge'
              color='onGradientMuted'
              align='center'
            >
              All your inventory items are above their minimum levels. Great
              job!
            </ThemedText>
          </VStack>
          <ThemedButton
            onPress={loadSuggestions}
            variant='outline'
            size='lg'
            className='bg-white/20 border-white/40'
          >
            <ThemedText variant='body' weight='medium' color='onGradient'>
              Refresh
            </ThemedText>
          </ThemedButton>
        </VStack>
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
          <HStack className='items-center gap-4'>
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <ThemedHeading variant='h2' color='onGradient' weight='bold'>
              Order Suggestions
            </ThemedHeading>
          </HStack>
          <ThemedButton
            onPress={() => (navigation as any).navigate('CreateOrder')}
            variant='primary'
            className='bg-white/20 dark:bg-white/20 rounded-full size-10 p-0'
          >
            <Ionicons name='add' size={22} color='white' />
          </ThemedButton>
        </HStack>
      </Box>

      {/* Summary */}
      <VStack className='px-4 py-3 bg-white/10' style={{ gap: 8 }}>
        <ThemedText variant='body' color='onGradientMuted'>
          {suggestions.length} supplier{suggestions.length === 1 ? '' : 's'}{' '}
          with low stock items
        </ThemedText>
        {selectedItems.size > 0 && (
          <ThemedText variant='body' color='onGradient' weight='medium'>
            {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}{' '}
            selected • ${calculateTotalCost().toFixed(2)} estimated
          </ThemedText>
        )}
      </VStack>

      {/* Suggestions List */}
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadSuggestions}
            tintColor='white'
            colors={['#8B5CF6']}
            progressBackgroundColor='white'
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <VStack className='py-4 px-2' style={{ gap: 16 }}>
          {suggestions.map((suggestion) => (
            <ThemedCard
              key={suggestion.supplier.id}
              variant='primary'
              size='lg'
              className='bg-white/80'
            >
              {/* Supplier Header */}
              <HStack className='items-center justify-between mb-4'>
                <HStack className='items-center flex-1' space='sm'>
                  <Switch
                    value={selectedSuppliers.has(suggestion.supplier.id)}
                    onValueChange={() => toggleSupplier(suggestion.supplier.id)}
                    trackColor={{
                      false: '#D1D5DB',
                      true: '#EEF2FF',
                    }}
                    thumbColor={
                      selectedSuppliers.has(suggestion.supplier.id)
                        ? '#6366F1'
                        : '#F3F4F6'
                    }
                  />
                  <VStack className='flex-1'>
                    <ThemedText
                      variant='bodyLarge'
                      weight='bold'
                      color='primary'
                    >
                      {suggestion.supplier.name}
                    </ThemedText>
                    <ThemedText variant='caption' color='muted'>
                      {suggestion.items.length} item
                      {suggestion.items.length === 1 ? '' : 's'} • $
                      {suggestion.totalEstimatedCost.toFixed(2)}
                    </ThemedText>
                  </VStack>
                </HStack>
              </HStack>

              {/* Items */}
              <VStack style={{ gap: 12 }}>
                {suggestion.items.map((item) => (
                  <Pressable
                    key={item.product.id}
                    onPress={() =>
                      toggleItem(item.product.id, suggestion.supplier.id)
                    }
                    className='flex-row items-center p-3 bg-white/60 dark:bg-white/10 rounded-xl border border-white/20'
                  >
                    {/* Selection checkbox */}
                    <Box className='mr-3'>
                      <Ionicons
                        name={
                          selectedItems.has(item.product.id)
                            ? 'checkbox'
                            : 'square-outline'
                        }
                        size={20}
                        color={
                          selectedItems.has(item.product.id)
                            ? '#6366F1'
                            : '#9CA3AF'
                        }
                      />
                    </Box>

                    {/* Product Image */}
                    <HStack className='flex-1 items-center'>
                      <Box className='mr-3'>
                        <ProductImage
                          uri={item.product.image}
                          {...ProductImageVariants.small}
                        />
                      </Box>
                      <VStack className='gap-1'>
                        {/* Product Info */}
                        <VStack className='flex-1' style={{ gap: 1 }}>
                          <ThemedText
                            variant='body'
                            weight='bold'
                            color='primary'
                            numberOfLines={1}
                          >
                            {item.product.name}
                          </ThemedText>
                          <HStack className='items-center' style={{ gap: 16 }}>
                            <ThemedText variant='caption' color='muted'>
                              {item.location.name}
                            </ThemedText>
                            <ThemedText
                              variant='caption'
                              weight='medium'
                              color='danger'
                            >
                              {+item.currentQuantity.toFixed(2)}/
                              {item.minimumQuantity}
                            </ThemedText>
                          </HStack>
                        </VStack>
                        {/* Ordering Unit Selector - only show if packSize exists */}
                        {item.packSize && selectedItems.has(item.product.id) ? (
                          <HStack className='items-center gap-2'>
                            <ThemedButton
                              onPress={() =>
                                updateOrderingUnit(
                                  item.product.id,
                                  'UNIT',
                                  item
                                )
                              }
                              variant={
                                getFinalOrderingUnit(
                                  item.product.id,
                                  item.orderingUnit
                                ) === 'UNIT'
                                  ? 'primary'
                                  : 'outline'
                              }
                              size='sm'
                              className='px-3 py-1'
                            >
                              <ThemedText
                                variant='caption'
                                weight={
                                  getFinalOrderingUnit(
                                    item.product.id,
                                    item.orderingUnit
                                  ) === 'UNIT'
                                    ? 'bold'
                                    : 'medium'
                                }
                                color={
                                  getFinalOrderingUnit(
                                    item.product.id,
                                    item.orderingUnit
                                  ) === 'UNIT'
                                    ? 'onGradient'
                                    : 'muted'
                                }
                              >
                                Unit
                              </ThemedText>
                            </ThemedButton>
                            <ThemedButton
                              onPress={() =>
                                updateOrderingUnit(
                                  item.product.id,
                                  'CASE',
                                  item
                                )
                              }
                              variant={
                                getFinalOrderingUnit(
                                  item.product.id,
                                  item.orderingUnit
                                ) === 'CASE'
                                  ? 'primary'
                                  : 'outline'
                              }
                              size='sm'
                              className='px-3 py-1'
                            >
                              <ThemedText
                                variant='caption'
                                weight={
                                  getFinalOrderingUnit(
                                    item.product.id,
                                    item.orderingUnit
                                  ) === 'CASE'
                                    ? 'bold'
                                    : 'medium'
                                }
                                color={
                                  getFinalOrderingUnit(
                                    item.product.id,
                                    item.orderingUnit
                                  ) === 'CASE'
                                    ? 'onGradient'
                                    : 'muted'
                                }
                              >
                                Case
                                {item.packSize ? ` (${item.packSize})` : ''}
                              </ThemedText>
                            </ThemedButton>
                          </HStack>
                        ) : null}
                      </VStack>
                    </HStack>

                    {/* Quantity, Unit & Cost */}
                    <VStack className='items-end' style={{ gap: 4 }}>
                      {selectedItems.has(item.product.id) ? (
                        <VStack className='items-end' style={{ gap: 4 }}>
                          <ThemedInput
                            variant='default'
                            size='sm'
                            fieldProps={{
                              value: getFinalQuantity(
                                item.product.id,
                                item.suggestedQuantity
                              ).toString(),
                              onChangeText: (text: string) => {
                                const quantity =
                                  parseInt(text) || item.suggestedQuantity
                                updateQuantity(item.product.id, quantity)
                              },
                              keyboardType: 'numeric',
                            }}
                            className='w-16'
                          />
                        </VStack>
                      ) : (
                        <ThemedText
                          variant='caption'
                          weight='bold'
                          color='primary'
                        >
                          {item.suggestedQuantity}{' '}
                          {pluralize(item.suggestedQuantity, item.orderingUnit)}
                          {item.orderingUnit === 'CASE' && item.packSize && (
                            <ThemedText variant='caption' color='muted'>
                              {' '}
                              ({item.packSize * item.suggestedQuantity} units)
                            </ThemedText>
                          )}
                        </ThemedText>
                      )}
                      <ThemedText
                        variant='caption'
                        weight='bold'
                        color='success'
                      >
                        $
                        {(
                          getFinalQuantity(
                            item.product.id,
                            item.suggestedQuantity
                          ) * getFinalUnitCost(item.product.id, item.unitCost)
                        ).toFixed(2)}
                      </ThemedText>
                    </VStack>
                  </Pressable>
                ))}
              </VStack>
            </ThemedCard>
          ))}
        </VStack>
      </ScrollView>

      {/* Bottom Actions */}
      {selectedItems.size > 0 && (
        <ThemedCard variant='primary' size='lg' className='m-4'>
          <VStack style={{ gap: 8 }}>
            <HStack className='items-center justify-between'>
              <ThemedText variant='body' color='secondary'>
                {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}{' '}
                selected
              </ThemedText>
              <ThemedText variant='bodyLarge' weight='bold' color='primary'>
                Total: ${calculateTotalCost().toFixed(2)}
              </ThemedText>
            </HStack>

            <ThemedButton
              onPress={createOrdersFromSelections}
              disabled={isCreatingOrders}
              variant={isCreatingOrders ? 'outline' : 'primary'}
              size='lg'
              fullWidth
              className={
                isCreatingOrders ? 'bg-gray-400 border-transparent' : ''
              }
            >
              {isCreatingOrders ? (
                <HStack className='items-center' style={{ gap: 8 }}>
                  <ActivityIndicator size='small' color='white' />
                  <ThemedText
                    variant='bodyLarge'
                    weight='bold'
                    color='onGradient'
                  >
                    Creating Orders...
                  </ThemedText>
                </HStack>
              ) : (
                <ThemedText
                  variant='bodyLarge'
                  weight='bold'
                  color='onGradient'
                >
                  Create Orders (
                  {
                    Object.keys(
                      suggestions.reduce(
                        (acc, s) => {
                          s.items.forEach((item) => {
                            if (selectedItems.has(item.product.id)) {
                              acc[s.supplier.id] = true
                            }
                          })
                          return acc
                        },
                        {} as { [key: string]: boolean }
                      )
                    ).length
                  }
                  )
                </ThemedText>
              )}
            </ThemedButton>
          </VStack>
        </ThemedCard>
      )}
    </PageGradient>
  )
}
