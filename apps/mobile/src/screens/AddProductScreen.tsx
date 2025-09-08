import { Ionicons } from '@expo/vector-icons'
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { ProductContainer, ProductUnit } from '@happy-bar/types'
import { CatalogProduct, CatalogSearch } from '../components/CatalogSearch'
import {
  useCategories,
  useCreateProduct,
  useSuppliers,
} from '../hooks/useInventoryData'

// Product supplier interface for mobile
interface ProductSupplier {
  supplierId: string
  supplierName: string
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  orderingUnit: 'UNIT' | 'CASE'
  isPreferred: boolean
}

// Product units and containers for mobile
const PRODUCT_UNITS = [
  { label: 'ml', value: ProductUnit.ML },
  { label: 'L', value: ProductUnit.L },
  { label: 'fl oz', value: ProductUnit.FL_OZ },
  { label: 'gal', value: ProductUnit.GAL },
  { label: 'g', value: ProductUnit.G },
  { label: 'kg', value: ProductUnit.KG },
  { label: 'lb', value: ProductUnit.LB },
  { label: 'count', value: ProductUnit.COUNT },
  { label: 'cl', value: ProductUnit.CL },
  { label: 'oz', value: ProductUnit.OZ },
]

const PRODUCT_CONTAINERS = [
  { label: 'Bottle', value: ProductContainer.BOTTLE },
  { label: 'Can', value: ProductContainer.CAN },
  { label: 'Keg', value: ProductContainer.KEG },
  { label: 'Box', value: ProductContainer.BOX },
  { label: 'Bag', value: ProductContainer.BAG },
  { label: 'Carton', value: ProductContainer.CARTON },
  { label: 'Unit', value: ProductContainer.UNIT },
]

export function AddProductScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const insets = useSafeAreaInsets()

  // Get UPC from route params if coming from barcode scan
  const { upc } = (route.params as { upc?: string }) || {}

  // Hooks
  const { data: categories } = useCategories()
  const { data: suppliers = [] } = useSuppliers({ active: true })
  const createProductMutation = useCreateProduct()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    upc: upc || '',
    categoryId: '',
    unit: ProductUnit.ML,
    container: ProductContainer.BOTTLE,
    unitSize: 750,
    caseSize: 12,
    costPerUnit: 0,
    costPerCase: 0,
    sellPrice: 0,
    alcoholContent: 0,
    image: '',
  })

  // UI state
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [showContainerPicker, setShowContainerPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Supplier state
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>(
    []
  )
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [supplierFormData, setSupplierFormData] = useState({
    costPerUnit: 0,
    costPerCase: 0,
    minimumOrder: 1,
    orderingUnit: 'UNIT' as 'UNIT' | 'CASE',
    isPreferred: false,
  })

  // Pre-fill UPC if provided from scan
  useEffect(() => {
    if (upc) {
      setFormData((prev) => ({ ...prev, upc }))
    }
  }, [upc])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCatalogSelect = (catalogProduct: CatalogProduct) => {
    // Auto-fill form with catalog product data
    setFormData((prev) => ({
      ...prev,
      name: catalogProduct.name,
      upc: catalogProduct.upc || prev.upc,
      categoryId: catalogProduct.categoryId || prev.categoryId,
      unit: (catalogProduct.unit as ProductUnit) || prev.unit,
      container:
        (catalogProduct.container as ProductContainer) || prev.container,
      unitSize: catalogProduct.unitSize || prev.unitSize,
      caseSize: catalogProduct.caseSize || prev.caseSize,
      costPerUnit: catalogProduct.costPerUnit || prev.costPerUnit,
      costPerCase: catalogProduct.costPerCase || prev.costPerCase,
      image: catalogProduct.image || prev.image,
    }))
  }

  const addSupplierToProduct = () => {
    if (!selectedSupplierId) {
      Alert.alert('Validation Error', 'Please select a supplier')
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) return

    // Check if supplier already added
    if (productSuppliers.some((ps) => ps.supplierId === selectedSupplierId)) {
      Alert.alert('Error', 'Supplier already added to this product')
      return
    }

    const newProductSupplier: ProductSupplier = {
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      costPerUnit: supplierFormData.costPerUnit || formData.costPerUnit,
      costPerCase:
        supplierFormData.costPerCase || formData.costPerCase || undefined,
      minimumOrder: supplierFormData.minimumOrder,
      orderingUnit: supplierFormData.orderingUnit,
      isPreferred: productSuppliers.length === 0, // First supplier is preferred by default
    }

    setProductSuppliers([...productSuppliers, newProductSupplier])
    setSelectedSupplierId('')
    setShowSupplierForm(false)
    // Reset supplier form
    setSupplierFormData({
      costPerUnit: 0,
      costPerCase: 0,
      minimumOrder: 1,
      orderingUnit: 'UNIT',
      isPreferred: false,
    })
  }

  const removeSupplierFromProduct = (supplierId: string) => {
    setProductSuppliers(
      productSuppliers.filter((ps) => ps.supplierId !== supplierId)
    )
  }

  const updateProductSupplier = (
    supplierId: string,
    field: keyof ProductSupplier,
    value: any
  ) => {
    setProductSuppliers(
      productSuppliers.map((ps) =>
        ps.supplierId === supplierId ? { ...ps, [field]: value } : ps
      )
    )
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required')
      return
    }

    if (!formData.categoryId) {
      Alert.alert('Validation Error', 'Please select a category')
      return
    }

    if (formData.costPerUnit <= 0) {
      Alert.alert('Validation Error', 'Cost per unit must be greater than 0')
      return
    }

    try {
      setIsSubmitting(true)

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        upc: formData.upc.trim() || undefined,
        categoryId: formData.categoryId,
        unit: formData.unit,
        container: formData.container.toLowerCase(),
        unitSize: formData.unitSize,
        caseSize: formData.caseSize,
        costPerUnit: formData.costPerUnit,
        costPerCase: formData.costPerCase || undefined,
        sellPrice: formData.sellPrice || undefined,
        alcoholContent: formData.alcoholContent || undefined,
        image: formData.image.trim() || undefined,
        // Include suppliers in the product creation request
        suppliers: productSuppliers.length > 0 ? productSuppliers.map((supplier, index) => ({
          supplierId: supplier.supplierId,
          orderingUnit: supplier.orderingUnit,
          costPerUnit: supplier.costPerUnit,
          costPerCase: supplier.costPerCase || undefined,
          minimumOrder: supplier.minimumOrder,
          packSize: formData.caseSize || undefined,
          isPreferred: index === 0, // First supplier is preferred
          leadTimeDays: 3, // Default lead time
        })) : undefined,
      }

      // Create product with suppliers in a single API call
      const createdProduct = await createProductMutation.mutateAsync(productData)
      
      console.log('Product created successfully:', {
        id: createdProduct.id,
        name: createdProduct.name,
        suppliersCount: createdProduct.suppliers?.length || 0
      })

      // Show success message
      const message = productSuppliers.length > 0 
        ? `Product and ${productSuppliers.length} supplier${productSuppliers.length === 1 ? '' : 's'} created successfully!`
        : 'Product created successfully!'
        
      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'InventoryList' as never }],
              })
            )
          },
        },
      ])
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to create product. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCategory = categories?.categories?.find(
    (c) => c.id === formData.categoryId
  )
  const selectedUnit = PRODUCT_UNITS.find((u) => u.value === formData.unit)
  const selectedContainer = PRODUCT_CONTAINERS.find(
    (c) => c.value === formData.container
  )

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <Box className='px-6 pb-4' style={{ paddingTop: insets.top + 16 }}>
        <HStack className='justify-between items-center'>
          <HStack className='items-center' space='md'>
            <Pressable
              className='w-10 h-10 rounded-full bg-white/20 justify-center items-center'
              onPress={() => navigation.goBack()}
            >
              <Ionicons name='arrow-back' size={20} color='white' />
            </Pressable>
          </HStack>
          <VStack className='items-center flex-1'>
            <Text className='text-white text-lg font-bold'>Add Product</Text>
            <Text className='text-white/70 text-sm'>
              Create new inventory item
            </Text>
          </VStack>
          <Box className='w-10' />
        </HStack>
      </Box>

      {/* Content */}
      <Box
        className='flex-1 bg-white rounded-t-3xl'
        style={{ paddingBottom: 96 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            className='flex-1'
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <VStack space='lg' className='w-full'>
              {/* Catalog Search */}
              <Card className='p-5 bg-white border border-gray-200 rounded-2xl'>
                <CatalogSearch
                  onSelect={handleCatalogSelect}
                  placeholder='Search catalog to auto-fill product details...'
                />
              </Card>

              {/* Basic Information */}
              <Card className='p-5 bg-white border border-gray-200 rounded-2xl'>
                <VStack space='md'>
                  <Text className='text-lg font-bold text-gray-900'>
                    Basic Information
                  </Text>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Product Name *
                    </Text>
                    <Input variant='outline' size='md'>
                      <InputField
                        placeholder='e.g., Budweiser Beer'
                        value={formData.name}
                        onChangeText={(value) =>
                          handleInputChange('name', value)
                        }
                      />
                    </Input>
                  </VStack>

                  <HStack space='sm'>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>SKU</Text>
                      <Input variant='outline' size='md'>
                        <InputField
                          placeholder='e.g., BUD-001'
                          value={formData.sku}
                          onChangeText={(value) =>
                            handleInputChange('sku', value)
                          }
                        />
                      </Input>
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>
                        UPC/Barcode
                      </Text>
                      <Input variant='outline' size='md'>
                        <InputField
                          placeholder='123456789012'
                          value={formData.upc}
                          onChangeText={(value) =>
                            handleInputChange('upc', value)
                          }
                          keyboardType='numeric'
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Category *
                    </Text>
                    <Pressable
                      onPress={() => setShowCategoryPicker(true)}
                      className='border border-gray-300 rounded-lg p-3'
                    >
                      <HStack className='justify-between items-center'>
                        <Text className='text-gray-900'>
                          {selectedCategory?.name || 'Select a category'}
                        </Text>
                        <Ionicons
                          name='chevron-down'
                          size={20}
                          color='#9CA3AF'
                        />
                      </HStack>
                    </Pressable>
                  </VStack>
                </VStack>
              </Card>

              {/* Unit & Packaging */}
              <Card className='p-5 bg-white border border-gray-200 rounded-2xl'>
                <VStack space='md'>
                  <Text className='text-lg font-bold text-gray-900'>
                    Unit & Packaging
                  </Text>

                  <HStack space='sm'>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>Unit *</Text>
                      <Pressable
                        onPress={() => setShowUnitPicker(true)}
                        className='border border-gray-300 rounded-lg p-3'
                      >
                        <HStack className='justify-between items-center'>
                          <Text className='text-gray-900'>
                            {selectedUnit?.label || 'Select unit'}
                          </Text>
                          <Ionicons
                            name='chevron-down'
                            size={20}
                            color='#9CA3AF'
                          />
                        </HStack>
                      </Pressable>
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>
                        Container
                      </Text>
                      <Pressable
                        onPress={() => setShowContainerPicker(true)}
                        className='border border-gray-300 rounded-lg p-3'
                      >
                        <HStack className='justify-between items-center'>
                          <Text className='text-gray-900'>
                            {selectedContainer?.label || 'Select container'}
                          </Text>
                          <Ionicons
                            name='chevron-down'
                            size={20}
                            color='#9CA3AF'
                          />
                        </HStack>
                      </Pressable>
                    </VStack>
                  </HStack>

                  <HStack space='sm'>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>
                        Unit Size
                      </Text>
                      <Input variant='outline' size='md'>
                        <InputField
                          placeholder='750'
                          value={formData.unitSize.toString()}
                          onChangeText={(value) =>
                            handleInputChange(
                              'unitSize',
                              parseFloat(value) || 1
                            )
                          }
                          keyboardType='numeric'
                        />
                      </Input>
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <Text className='text-gray-700 font-medium'>
                        Case Size
                      </Text>
                      <Input variant='outline' size='md'>
                        <InputField
                          placeholder='12'
                          value={formData.caseSize.toString()}
                          onChangeText={(value) =>
                            handleInputChange('caseSize', parseInt(value) || 1)
                          }
                          keyboardType='numeric'
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Alcohol Content (%)
                    </Text>
                    <Input variant='outline' size='md'>
                      <InputField
                        placeholder='5.0'
                        value={formData.alcoholContent?.toString() || ''}
                        onChangeText={(value) =>
                          handleInputChange(
                            'alcoholContent',
                            parseFloat(value) || 0
                          )
                        }
                        keyboardType='numeric'
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Card>

              {/* Pricing */}
              <Card className='p-5 bg-white border border-gray-200 rounded-2xl'>
                <VStack space='md'>
                  <Text className='text-lg font-bold text-gray-900'>
                    Pricing
                  </Text>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Cost Per Unit *
                    </Text>
                    <Input variant='outline' size='md'>
                      <InputField
                        placeholder='2.50'
                        value={formData.costPerUnit?.toString() || ''}
                        onChangeText={(value) =>
                          handleInputChange(
                            'costPerUnit',
                            parseFloat(value) || 0
                          )
                        }
                        keyboardType='numeric'
                      />
                    </Input>
                  </VStack>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Cost Per Case
                    </Text>
                    <Input variant='outline' size='md'>
                      <InputField
                        placeholder='60.00'
                        value={formData.costPerCase?.toString() || ''}
                        onChangeText={(value) =>
                          handleInputChange(
                            'costPerCase',
                            parseFloat(value) || 0
                          )
                        }
                        keyboardType='numeric'
                      />
                    </Input>
                    <Text className='text-gray-500 text-xs'>
                      Leave empty to calculate based on unit cost × case size
                    </Text>
                  </VStack>

                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Sell Price
                    </Text>
                    <Input variant='outline' size='md'>
                      <InputField
                        placeholder='5.00'
                        value={formData.sellPrice?.toString() || ''}
                        onChangeText={(value) =>
                          handleInputChange('sellPrice', parseFloat(value) || 0)
                        }
                        keyboardType='numeric'
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Card>

              {/* Suppliers */}
              <Card className='p-5 bg-white border border-gray-200 rounded-2xl'>
                <VStack space='md'>
                  <HStack className='justify-between items-center'>
                    <Text className='text-lg font-bold text-gray-900'>
                      Suppliers
                    </Text>
                    <Pressable
                      onPress={() => setShowSupplierPicker(true)}
                      disabled={suppliers.length === 0}
                      className='bg-purple-100 px-3 py-2 rounded-lg'
                      style={{
                        opacity: suppliers.length === 0 ? 0.5 : 1,
                      }}
                    >
                      <HStack className='items-center' space='xs'>
                        <Ionicons name='add' size={16} color='#8B5CF6' />
                        <Text className='text-purple-600 font-medium text-sm'>
                          Add Supplier
                        </Text>
                      </HStack>
                    </Pressable>
                  </HStack>

                  {suppliers.length === 0 ? (
                    <Text className='text-gray-500 text-sm'>
                      No suppliers available. Create suppliers first to assign
                      them to products.
                    </Text>
                  ) : (
                    <VStack space='md'>
                      {/* Current Suppliers */}
                      {productSuppliers.length > 0 && (
                        <VStack space='sm'>
                          {productSuppliers.map((supplier) => (
                            <Box
                              key={supplier.supplierId}
                              className='bg-gray-50 border border-gray-200 rounded-xl p-4'
                            >
                              <VStack space='md'>
                                <HStack className='justify-between items-center'>
                                  <HStack className='items-center' space='sm'>
                                    <Box className='bg-purple-100 rounded-full p-2'>
                                      <Ionicons
                                        name='business'
                                        size={16}
                                        color='#8B5CF6'
                                      />
                                    </Box>
                                    <VStack>
                                      <Text className='font-semibold text-gray-900'>
                                        {supplier.supplierName}
                                      </Text>
                                      {supplier.isPreferred && (
                                        <Text className='text-purple-600 text-xs font-medium'>
                                          Preferred
                                        </Text>
                                      )}
                                    </VStack>
                                  </HStack>
                                  <Pressable
                                    onPress={() =>
                                      removeSupplierFromProduct(
                                        supplier.supplierId
                                      )
                                    }
                                    className='p-1'
                                  >
                                    <Ionicons
                                      name='close'
                                      size={20}
                                      color='#EF4444'
                                    />
                                  </Pressable>
                                </HStack>

                                <VStack space='sm'>
                                  <HStack space='sm'>
                                    <VStack space='xs' className='flex-1'>
                                      <Text className='text-gray-600 text-xs font-medium'>
                                        Cost/Unit
                                      </Text>
                                      <Input variant='outline' size='sm'>
                                        <InputField
                                          value={supplier.costPerUnit.toString()}
                                          onChangeText={(value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'costPerUnit',
                                              parseFloat(value) || 0
                                            )
                                          }
                                          keyboardType='numeric'
                                        />
                                      </Input>
                                    </VStack>
                                    <VStack space='xs' className='flex-1'>
                                      <Text className='text-gray-600 text-xs font-medium'>
                                        Cost/Case
                                      </Text>
                                      <Input variant='outline' size='sm'>
                                        <InputField
                                          value={
                                            supplier.costPerCase?.toString() ||
                                            ''
                                          }
                                          onChangeText={(value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'costPerCase',
                                              value
                                                ? parseFloat(value)
                                                : undefined
                                            )
                                          }
                                          keyboardType='numeric'
                                          placeholder='Optional'
                                        />
                                      </Input>
                                    </VStack>
                                  </HStack>

                                  <HStack space='sm'>
                                    <VStack space='xs' className='flex-1'>
                                      <Text className='text-gray-600 text-xs font-medium'>
                                        Min Order
                                      </Text>
                                      <Input variant='outline' size='sm'>
                                        <InputField
                                          value={supplier.minimumOrder.toString()}
                                          onChangeText={(value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'minimumOrder',
                                              parseInt(value) || 1
                                            )
                                          }
                                          keyboardType='numeric'
                                        />
                                      </Input>
                                    </VStack>
                                    <VStack space='xs' className='flex-1'>
                                      <Text className='text-gray-600 text-xs font-medium'>
                                        Order By
                                      </Text>
                                      <Pressable
                                        onPress={() =>
                                          updateProductSupplier(
                                            supplier.supplierId,
                                            'orderingUnit',
                                            supplier.orderingUnit === 'UNIT'
                                              ? 'CASE'
                                              : 'UNIT'
                                          )
                                        }
                                        className='border border-gray-300 rounded-lg p-2 bg-white'
                                      >
                                        <Text className='text-gray-900 text-center'>
                                          {supplier.orderingUnit}
                                        </Text>
                                      </Pressable>
                                    </VStack>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  )}
                </VStack>
              </Card>

              {/* Submit Button */}
              <Button
                size='lg'
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`rounded-xl mt-4 ${isSubmitting ? 'bg-gray-400' : 'bg-purple-600'}`}
              >
                <ButtonText className='text-white font-bold text-lg'>
                  {isSubmitting ? 'Creating Product...' : 'Create Product'}
                </ButtonText>
              </Button>
            </VStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </Box>

      {/* Unit Picker Modal */}
      {showUnitPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end'>
          <Card className='bg-white rounded-t-3xl p-6'>
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <Text className='text-lg font-bold'>Select Unit</Text>
                <Pressable onPress={() => setShowUnitPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300, marginBottom: 96 }}>
                <VStack space='xs'>
                  {PRODUCT_UNITS.map((unit) => (
                    <Pressable
                      key={unit.value}
                      className='p-3 rounded-lg'
                      onPress={() => {
                        handleInputChange('unit', unit.value)
                        setShowUnitPicker(false)
                      }}
                    >
                      <Text className='text-gray-900'>{unit.label}</Text>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </Card>
        </Box>
      )}

      {/* Container Picker Modal */}
      {showContainerPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end'>
          <Card className='bg-white rounded-t-3xl p-6'>
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <Text className='text-lg font-bold'>Select Container</Text>
                <Pressable onPress={() => setShowContainerPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300, marginBottom: 96 }}>
                <VStack space='xs'>
                  {PRODUCT_CONTAINERS.map((container) => (
                    <Pressable
                      key={container.value}
                      className='p-3 rounded-lg'
                      onPress={() => {
                        handleInputChange('container', container.value)
                        setShowContainerPicker(false)
                      }}
                    >
                      <Text className='text-gray-900'>{container.label}</Text>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </Card>
        </Box>
      )}

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end'>
          <Card className='bg-white rounded-t-3xl p-6'>
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <Text className='text-lg font-bold'>Select Category</Text>
                <Pressable onPress={() => setShowCategoryPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300, marginBottom: 96 }}>
                <VStack space='xs'>
                  {categories?.categories?.map((category) => (
                    <Pressable
                      key={category.id}
                      className='p-3 rounded-lg'
                      onPress={() => {
                        handleInputChange('categoryId', category.id)
                        setShowCategoryPicker(false)
                      }}
                    >
                      <Text className='text-gray-900'>{category.name}</Text>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </Card>
        </Box>
      )}

      {/* Supplier Picker Modal */}
      {showSupplierPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end'>
          <Card className='bg-white rounded-t-3xl p-6'>
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <Text className='text-lg font-bold'>Select Supplier</Text>
                <Pressable onPress={() => setShowSupplierPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300, marginBottom: 96 }}>
                <VStack space='xs'>
                  {suppliers
                    .filter(
                      (s) =>
                        !productSuppliers.some((ps) => ps.supplierId === s.id)
                    )
                    .map((supplier) => (
                      <Pressable
                        key={supplier.id}
                        className='p-3 rounded-lg'
                        onPress={() => {
                          setSelectedSupplierId(supplier.id)
                          setShowSupplierPicker(false)
                          setSupplierFormData({
                            costPerUnit: formData.costPerUnit || 0,
                            costPerCase: formData.costPerCase || 0,
                            minimumOrder: 1,
                            orderingUnit: 'UNIT',
                            isPreferred: productSuppliers.length === 0, // Only first supplier is preferred by default
                          })
                          setShowSupplierForm(true)
                        }}
                      >
                        <Text className='text-gray-900'>{supplier.name}</Text>
                      </Pressable>
                    ))}
                </VStack>
              </ScrollView>
            </VStack>
          </Card>
        </Box>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <Box className='absolute inset-0 bg-black/50 justify-end'>
          <Card className='bg-white rounded-t-3xl p-6'>
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <Text className='text-lg font-bold'>Add Supplier Details</Text>
                <Pressable
                  onPress={() => {
                    setShowSupplierForm(false)
                    setSelectedSupplierId('')
                    setSupplierFormData({
                      costPerUnit: 0,
                      costPerCase: 0,
                      minimumOrder: 1,
                      orderingUnit: 'UNIT',
                      isPreferred: false,
                    })
                  }}
                >
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>

              <ScrollView style={{ maxHeight: 400, marginBottom: 96 }}>
                <VStack space='md'>
                  {/* Selected Supplier */}
                  <VStack space='sm'>
                    <Text className='text-gray-700 font-medium'>
                      Selected Supplier
                    </Text>
                    <Box className='bg-gray-100 rounded-lg p-3'>
                      <Text className='text-gray-900 font-semibold'>
                        {suppliers.find((s) => s.id === selectedSupplierId)
                          ?.name || 'Select a supplier'}
                      </Text>
                    </Box>
                  </VStack>

                  {!selectedSupplierId && (
                    <Pressable
                      onPress={() => setShowSupplierPicker(true)}
                      className='bg-purple-100 rounded-lg p-3'
                    >
                      <Text className='text-purple-600 font-medium text-center'>
                        Choose Supplier
                      </Text>
                    </Pressable>
                  )}

                  {selectedSupplierId && (
                    <VStack space='md'>
                      {/* Cost Fields */}
                      <HStack space='sm'>
                        <VStack space='sm' className='flex-1'>
                          <Text className='text-gray-700 font-medium'>
                            Cost Per Unit
                          </Text>
                          <Input variant='outline' size='md'>
                            <InputField
                              placeholder={formData.costPerUnit.toString()}
                              value={
                                supplierFormData.costPerUnit?.toString() || ''
                              }
                              onChangeText={(value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  costPerUnit: parseFloat(value) || 0,
                                }))
                              }
                              keyboardType='numeric'
                            />
                          </Input>
                        </VStack>
                        <VStack space='sm' className='flex-1'>
                          <Text className='text-gray-700 font-medium'>
                            Cost Per Case
                          </Text>
                          <Input variant='outline' size='md'>
                            <InputField
                              placeholder={
                                formData.costPerCase?.toString() || 'Optional'
                              }
                              value={
                                supplierFormData.costPerCase?.toString() || ''
                              }
                              onChangeText={(value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  costPerCase: parseFloat(value) || 0,
                                }))
                              }
                              keyboardType='numeric'
                            />
                          </Input>
                        </VStack>
                      </HStack>

                      {/* Order Details */}
                      <HStack space='sm'>
                        <VStack space='sm' className='flex-1'>
                          <Text className='text-gray-700 font-medium'>
                            Minimum Order
                          </Text>
                          <Input variant='outline' size='md'>
                            <InputField
                              placeholder='1'
                              value={supplierFormData.minimumOrder.toString()}
                              onChangeText={(value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  minimumOrder: parseInt(value) || 1,
                                }))
                              }
                              keyboardType='numeric'
                            />
                          </Input>
                        </VStack>
                        <VStack space='sm' className='flex-1'>
                          <Text className='text-gray-700 font-medium'>
                            Order By
                          </Text>
                          <Pressable
                            onPress={() =>
                              setSupplierFormData((prev) => ({
                                ...prev,
                                orderingUnit:
                                  prev.orderingUnit === 'UNIT'
                                    ? 'CASE'
                                    : 'UNIT',
                              }))
                            }
                            className='border border-gray-300 rounded-lg p-3 bg-white'
                          >
                            <HStack className='justify-between items-center'>
                              <Text className='text-gray-900'>
                                {supplierFormData.orderingUnit}
                              </Text>
                              <Ionicons
                                name='chevron-down'
                                size={20}
                                color='#9CA3AF'
                              />
                            </HStack>
                          </Pressable>
                        </VStack>
                      </HStack>

                      {/* Action Buttons */}
                      <HStack space='sm' className='pt-4'>
                        <Button
                          className='bg-gray-200 flex-1'
                          onPress={() => {
                            setShowSupplierForm(false)
                            setSelectedSupplierId('')
                          }}
                        >
                          <ButtonText className='text-gray-700'>
                            Cancel
                          </ButtonText>
                        </Button>
                        <Button
                          className='bg-purple-600 flex-1'
                          onPress={addSupplierToProduct}
                        >
                          <ButtonText className='text-white'>
                            Add Supplier
                          </ButtonText>
                        </Button>
                      </HStack>
                    </VStack>
                  )}
                </VStack>
              </ScrollView>
            </VStack>
          </Card>
        </Box>
      )}
    </LinearGradient>
  )
}
