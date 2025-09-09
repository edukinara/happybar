import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
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
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { ProductImage, ProductImageVariants } from '../components/ProductImage'
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
  const getFinalOrderingUnit = (productId: string, suggestedUnit: 'UNIT' | 'CASE') => {
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
      
      setEditingOrderingUnits(prev => ({ ...prev, [productId]: 'CASE' }))
      setEditingQuantities(prev => ({ ...prev, [productId]: finalCasesNeeded }))
      setEditingUnitCosts(prev => ({ ...prev, [productId]: item.product.costPerCase! }))
    } else if (newUnit === 'UNIT' && item.product.costPerUnit) {
      // When switching to unit ordering, use unit quantities
      let finalQuantity = Math.ceil(Math.max(quantityNeeded, 1))
      
      // If there's a pack size, round up to full packs for unit ordering
      if (item.packSize && item.packSize > 1) {
        finalQuantity = Math.ceil(finalQuantity / item.packSize) * item.packSize
      }
      
      setEditingOrderingUnits(prev => ({ ...prev, [productId]: 'UNIT' }))
      setEditingQuantities(prev => ({ ...prev, [productId]: finalQuantity }))
      setEditingUnitCosts(prev => ({ ...prev, [productId]: item.product.costPerUnit }))
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
          const finalUnitCost = getFinalUnitCost(
            item.product.id,
            item.unitCost
          )
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
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar style='light' />
        <Box className='flex-1 justify-center items-center'>
          <ActivityIndicator size='large' color='white' />
          <Text className='text-white text-lg mt-4'>Loading order suggestions...</Text>
        </Box>
      </LinearGradient>
    )
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
              <Text className='text-white text-xl font-bold'>Order Suggestions</Text>
            </HStack>
          </HStack>
        </Box>

        {/* Empty state */}
        <VStack className='flex-1 justify-center items-center px-4' space='lg'>
          <Box className='w-16 h-16 bg-white/20 rounded-full justify-center items-center'>
            <Ionicons
              name='checkmark-circle'
              size={32}
              color='white'
            />
          </Box>
          <VStack className='items-center' space='sm'>
            <Text className='text-white text-xl font-bold'>
              No Suggestions Available
            </Text>
            <Text className='text-white/80 text-center text-lg'>
              All your inventory items are above their minimum levels. Great job!
            </Text>
          </VStack>
          <Pressable
            onPress={loadSuggestions}
            className='px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30'
          >
            <Text className='text-white font-medium'>Refresh</Text>
          </Pressable>
        </VStack>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
            <Text className='text-white text-xl font-bold'>Order Suggestions</Text>
          </HStack>
          <Pressable
            onPress={() => (navigation as any).navigate('CreateOrder')}
            className='p-2'
          >
            <Ionicons name='add' size={24} color='white' />
          </Pressable>
        </HStack>
      </Box>

      {/* Summary */}
      <VStack className='px-4 py-3 bg-white/10' space='sm'>
        <Text className='text-white/90'>
          {suggestions.length} supplier{suggestions.length === 1 ? '' : 's'}{' '}
          with low stock items
        </Text>
        {selectedItems.size > 0 && (
          <Text className='text-white font-medium'>
            {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}{' '}
            selected • ${calculateTotalCost().toFixed(2)} estimated
          </Text>
        )}
      </VStack>

      {/* Suggestions List */}
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 120 }}
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
        <VStack className='px-4 py-4' space='md'>
          {suggestions.map((suggestion) => (
            <Card
              key={suggestion.supplier.id}
              className='p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50'
            >
              {/* Supplier Header */}
              <HStack className='items-center justify-between mb-4'>
                <HStack className='items-center flex-1' space='sm'>
                  <Switch
                    value={selectedSuppliers.has(suggestion.supplier.id)}
                    onValueChange={() =>
                      toggleSupplier(suggestion.supplier.id)
                    }
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
                    <Text className='font-bold text-gray-900 text-lg'>
                      {suggestion.supplier.name}
                    </Text>
                    <Text className='text-sm text-gray-600'>
                      {suggestion.items.length} item
                      {suggestion.items.length === 1 ? '' : 's'} •{' '}
                      ${suggestion.totalEstimatedCost.toFixed(2)}
                    </Text>
                  </VStack>
                </HStack>
              </HStack>

              {/* Items */}
              <VStack space='sm'>
                {suggestion.items.map((item) => (
                  <Pressable
                    key={item.product.id}
                    onPress={() =>
                      toggleItem(item.product.id, suggestion.supplier.id)
                    }
                    className='flex-row items-center p-3 bg-white/50 rounded-xl border border-white/30'
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
                    <Box className='mr-3'>
                      <ProductImage
                        uri={item.product.image}
                        {...ProductImageVariants.small}
                      />
                    </Box>

                    {/* Product Info */}
                    <VStack className='flex-1' space='xs'>
                      <Text
                        className='font-bold text-gray-900'
                        numberOfLines={1}
                      >
                        {item.product.name}
                      </Text>
                      <HStack className='items-center' space='md'>
                        <Text className='text-sm text-gray-600'>
                          {item.location.name}
                        </Text>
                        <Text className='text-sm text-red-600 font-medium'>
                          {+item.currentQuantity.toFixed(2)}/
                          {item.minimumQuantity}
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Quantity, Unit & Cost */}
                    <VStack className='items-end' space='xs'>
                      {selectedItems.has(item.product.id) ? (
                        <VStack className='items-end' space='xs'>
                          <Input className='w-16 bg-white border border-gray-300 rounded-lg'>
                            <InputField
                              value={getFinalQuantity(
                                item.product.id,
                                item.suggestedQuantity
                              ).toString()}
                              onChangeText={(text: string) => {
                                const quantity =
                                  parseInt(text) || item.suggestedQuantity
                                updateQuantity(item.product.id, quantity)
                              }}
                              keyboardType='numeric'
                              className='text-center text-gray-900 text-sm'
                            />
                          </Input>
                          {/* Ordering Unit Selector - only show if packSize exists */}
                          {item.packSize && (
                            <HStack className='items-center' space='xs'>
                              <Pressable
                                onPress={() => updateOrderingUnit(item.product.id, 'UNIT', item)}
                                className={`px-2 py-1 rounded-lg ${
                                  getFinalOrderingUnit(item.product.id, item.orderingUnit) === 'UNIT'
                                    ? 'bg-blue-100 border border-blue-300' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}
                              >
                                <Text className={`text-xs ${
                                  getFinalOrderingUnit(item.product.id, item.orderingUnit) === 'UNIT'
                                    ? 'text-blue-700 font-bold' 
                                    : 'text-gray-600'
                                }`}>
                                  Unit
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => updateOrderingUnit(item.product.id, 'CASE', item)}
                                className={`px-2 py-1 rounded-lg ${
                                  getFinalOrderingUnit(item.product.id, item.orderingUnit) === 'CASE'
                                    ? 'bg-blue-100 border border-blue-300' 
                                    : 'bg-gray-100 border border-gray-300'
                                }`}
                              >
                                <Text className={`text-xs ${
                                  getFinalOrderingUnit(item.product.id, item.orderingUnit) === 'CASE'
                                    ? 'text-blue-700 font-bold' 
                                    : 'text-gray-600'
                                }`}>
                                  Case{item.packSize ? ` (${item.packSize})` : ''}
                                </Text>
                              </Pressable>
                            </HStack>
                          )}
                        </VStack>
                      ) : (
                        <Text className='text-sm font-bold text-gray-900'>
                          {item.suggestedQuantity}{' '}
                          {pluralize(
                            item.suggestedQuantity,
                            item.orderingUnit
                          )}
                          {item.orderingUnit === 'CASE' && item.packSize && (
                            <Text className='text-xs text-gray-600'>
                              {' '}({item.packSize * item.suggestedQuantity} units)
                            </Text>
                          )}
                        </Text>
                      )}
                      <Text className='text-sm font-bold text-green-600'>
                        $
                        {(
                          getFinalQuantity(
                            item.product.id,
                            item.suggestedQuantity
                          ) * getFinalUnitCost(item.product.id, item.unitCost)
                        ).toFixed(2)}
                      </Text>
                    </VStack>
                  </Pressable>
                ))}
              </VStack>
            </Card>
          ))}
        </VStack>
      </ScrollView>

      {/* Bottom Actions */}
      {selectedItems.size > 0 && (
        <Card className='m-4 p-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50'>
          <VStack space='sm'>
            <HStack className='items-center justify-between'>
              <Text className='text-gray-700'>
                {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}{' '}
                selected
              </Text>
              <Text className='font-bold text-gray-900 text-lg'>
                Total: ${calculateTotalCost().toFixed(2)}
              </Text>
            </HStack>

            <Pressable
              onPress={createOrdersFromSelections}
              disabled={isCreatingOrders}
              className={`py-4 rounded-xl items-center ${
                isCreatingOrders ? 'bg-gray-400' : 'bg-blue-600'
              }`}
            >
              {isCreatingOrders ? (
                <HStack className='items-center' space='sm'>
                  <ActivityIndicator size='small' color='white' />
                  <Text className='text-white font-bold text-lg'>
                    Creating Orders...
                  </Text>
                </HStack>
              ) : (
                <Text className='text-white font-bold text-lg'>
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
                </Text>
              )}
            </Pressable>
          </VStack>
        </Card>
      )}
    </LinearGradient>
  )
}