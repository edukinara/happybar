import { Ionicons } from '@expo/vector-icons'
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'

import { ProductContainer, ProductUnit } from '@happy-bar/types'
import { CatalogProduct, CatalogSearch } from '../components/CatalogSearch'
import { PageGradient } from '../components/PageGradient'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import {
  useCategories,
  useCreateProduct,
  useSuppliers,
} from '../hooks/useInventoryData'
import { pos } from '../utils/pos'

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
        suppliers:
          productSuppliers.length > 0
            ? productSuppliers.map((supplier, index) => ({
                supplierId: supplier.supplierId,
                orderingUnit: supplier.orderingUnit,
                costPerUnit: supplier.costPerUnit,
                costPerCase: supplier.costPerCase || undefined,
                minimumOrder: supplier.minimumOrder,
                packSize: formData.caseSize || undefined,
                isPreferred: index === 0, // First supplier is preferred
                leadTimeDays: 3, // Default lead time
              }))
            : undefined,
      }

      // Create product with suppliers in a single API call
      const createdProduct =
        await createProductMutation.mutateAsync(productData)

      // Show success message
      const message =
        productSuppliers.length > 0
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
    <PageGradient>
      <StatusBar style='light' />

      {/* Header */}
      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: pos(8, insets.top + 4) }}
      >
        <HStack className='justify-between items-center p-2'>
          <HStack className='items-center gap-4'>
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </Pressable>
            <VStack>
              <ThemedHeading variant='h2' color='onGradient' weight='bold'>
                Add Product
              </ThemedHeading>
              <ThemedText variant='caption' color='onGradientMuted'>
                Create new inventory item
              </ThemedText>
            </VStack>
          </HStack>
        </HStack>
      </Box>

      {/* Content */}

      <Box className='p-0 flex flex-1 overflow-hidden'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            className='flex-1'
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <VStack space='lg' className='w-full pb-32'>
              {/* Catalog Search */}
              <ThemedCard variant='primary' size='md'>
                <CatalogSearch
                  onSelect={handleCatalogSelect}
                  placeholder='Search catalog to auto-fill product details...'
                />
              </ThemedCard>

              {/* Basic Information */}
              <ThemedCard variant='primary' size='md'>
                <VStack space='md'>
                  <ThemedHeading variant='h3' weight='bold' color='primary'>
                    Basic Information
                  </ThemedHeading>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Product Name *
                    </ThemedText>
                    <ThemedInput
                      variant='default'
                      size='md'
                      fieldProps={{
                        placeholder: 'e.g., Budweiser Beer',
                        value: formData.name,
                        onChangeText: (value) =>
                          handleInputChange('name', value),
                      }}
                    />
                  </VStack>

                  <HStack space='sm'>
                    <VStack space='sm' className='flex-1'>
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        SKU
                      </ThemedText>
                      <ThemedInput
                        variant='default'
                        size='md'
                        fieldProps={{
                          placeholder: 'e.g., BUD-001',
                          value: formData.sku,
                          onChangeText: (value) =>
                            handleInputChange('sku', value),
                        }}
                      />
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        UPC/Barcode
                      </ThemedText>
                      <ThemedInput
                        variant='default'
                        size='md'
                        fieldProps={{
                          placeholder: '123456789012',
                          value: formData.upc,
                          onChangeText: (value) =>
                            handleInputChange('upc', value),
                          keyboardType: 'numeric',
                        }}
                      />
                    </VStack>
                  </HStack>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Category *
                    </ThemedText>
                    <Pressable
                      onPress={() => setShowCategoryPicker(true)}
                      className='border border-gray-300 rounded-lg p-3'
                    >
                      <HStack className='justify-between items-center'>
                        <ThemedText variant='body' color='primary'>
                          {selectedCategory?.name || 'Select a category'}
                        </ThemedText>
                        <Ionicons
                          name='chevron-down'
                          size={20}
                          color='#9CA3AF'
                        />
                      </HStack>
                    </Pressable>
                  </VStack>
                </VStack>
              </ThemedCard>

              {/* Unit & Packaging */}
              <ThemedCard variant='primary' size='md'>
                <VStack space='md'>
                  <ThemedHeading variant='h3' weight='bold' color='primary'>
                    Unit & Packaging
                  </ThemedHeading>

                  <HStack space='sm'>
                    <VStack space='sm' className='flex-1'>
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        Unit *
                      </ThemedText>
                      <Pressable
                        onPress={() => setShowUnitPicker(true)}
                        className='border border-gray-300 rounded-lg p-3'
                      >
                        <HStack className='justify-between items-center'>
                          <ThemedText variant='body' color='primary'>
                            {selectedUnit?.label || 'Select unit'}
                          </ThemedText>
                          <Ionicons
                            name='chevron-down'
                            size={20}
                            color='#9CA3AF'
                          />
                        </HStack>
                      </Pressable>
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        Container
                      </ThemedText>
                      <Pressable
                        onPress={() => setShowContainerPicker(true)}
                        className='border border-gray-300 rounded-lg p-3'
                      >
                        <HStack className='justify-between items-center'>
                          <ThemedText variant='body' color='primary'>
                            {selectedContainer?.label || 'Select container'}
                          </ThemedText>
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
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        Unit Size
                      </ThemedText>
                      <ThemedInput
                        variant='default'
                        size='md'
                        fieldProps={{
                          placeholder: '750',
                          value: formData.unitSize.toString(),
                          onChangeText: (value) =>
                            handleInputChange(
                              'unitSize',
                              parseFloat(value) || 1
                            ),
                          keyboardType: 'numeric',
                        }}
                      />
                    </VStack>
                    <VStack space='sm' className='flex-1'>
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                      >
                        Case Size
                      </ThemedText>
                      <ThemedInput
                        variant='default'
                        size='md'
                        fieldProps={{
                          placeholder: '12',
                          value: formData.caseSize.toString(),
                          onChangeText: (value) =>
                            handleInputChange('caseSize', parseInt(value) || 1),
                          keyboardType: 'numeric',
                        }}
                      />
                    </VStack>
                  </HStack>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Alcohol Content (%)
                    </ThemedText>
                    <ThemedInput
                      variant='default'
                      size='md'
                      fieldProps={{
                        placeholder: '5.0',
                        value: formData.alcoholContent?.toString() || '',
                        onChangeText: (value) =>
                          handleInputChange(
                            'alcoholContent',
                            parseFloat(value) || 0
                          ),
                        keyboardType: 'numeric',
                      }}
                    />
                  </VStack>
                </VStack>
              </ThemedCard>

              {/* Pricing */}
              <ThemedCard variant='primary' size='md'>
                <VStack space='md'>
                  <ThemedHeading variant='h3' weight='bold' color='primary'>
                    Pricing
                  </ThemedHeading>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Cost Per Unit *
                    </ThemedText>
                    <ThemedInput
                      variant='default'
                      size='md'
                      fieldProps={{
                        placeholder: '2.50',
                        value: formData.costPerUnit?.toString() || '',
                        onChangeText: (value) =>
                          handleInputChange(
                            'costPerUnit',
                            parseFloat(value) || 0
                          ),
                        keyboardType: 'numeric',
                      }}
                    />
                  </VStack>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Cost Per Case
                    </ThemedText>
                    <ThemedInput
                      variant='default'
                      size='md'
                      fieldProps={{
                        placeholder: '60.00',
                        value: formData.costPerCase?.toString() || '',
                        onChangeText: (value) =>
                          handleInputChange(
                            'costPerCase',
                            parseFloat(value) || 0
                          ),
                        keyboardType: 'numeric',
                      }}
                    />
                    <ThemedText
                      variant='caption'
                      color='muted'
                      style={{ marginTop: 4 }}
                    >
                      Leave empty to calculate based on unit cost × case size
                    </ThemedText>
                  </VStack>

                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Sell Price
                    </ThemedText>
                    <ThemedInput
                      variant='default'
                      size='md'
                      fieldProps={{
                        placeholder: '5.00',
                        value: formData.sellPrice?.toString() || '',
                        onChangeText: (value) =>
                          handleInputChange(
                            'sellPrice',
                            parseFloat(value) || 0
                          ),
                        keyboardType: 'numeric',
                      }}
                    />
                  </VStack>
                </VStack>
              </ThemedCard>

              {/* Suppliers */}
              <ThemedCard variant='primary' size='md'>
                <VStack space='lg'>
                  <HStack className='justify-between items-center'>
                    <ThemedHeading variant='h3' weight='bold' color='primary'>
                      Suppliers
                    </ThemedHeading>
                    <Pressable
                      onPress={() => setShowSupplierPicker(true)}
                      disabled={suppliers.length === 0}
                      className='bg-purple-100 dark:bg-purple-900/50 px-3 py-2 rounded-lg'
                      style={{
                        opacity: suppliers.length === 0 ? 0.5 : 1,
                      }}
                    >
                      <HStack className='items-center' space='xs'>
                        <Ionicons name='add' size={16} color='#8B5CF6' />
                        <ThemedText
                          variant='caption'
                          weight='medium'
                          color='primary'
                        >
                          Add Supplier
                        </ThemedText>
                      </HStack>
                    </Pressable>
                  </HStack>

                  {suppliers.length === 0 ? (
                    <ThemedText variant='caption' color='onGradientMuted'>
                      No suppliers available. Create suppliers first to assign
                      them to products.
                    </ThemedText>
                  ) : (
                    <VStack space='md'>
                      {/* Current Suppliers */}
                      {productSuppliers.length > 0 && (
                        <VStack space='sm'>
                          {productSuppliers.map((supplier) => (
                            <ThemedCard
                              key={supplier.supplierId}
                              className='bg-gray-50 dark:bg-white/5'
                            >
                              <VStack space='md'>
                                <HStack className='justify-between items-center'>
                                  <HStack className='items-center' space='sm'>
                                    <Box className='bg-purple-100 dark:bg-purple-100 rounded-full p-2'>
                                      <Ionicons
                                        name='business'
                                        size={16}
                                        color='#8B5CF6'
                                      />
                                    </Box>
                                    <VStack>
                                      <ThemedText
                                        variant='body'
                                        weight='semibold'
                                        color='primary'
                                      >
                                        {supplier.supplierName}
                                      </ThemedText>
                                      {supplier.isPreferred && (
                                        <ThemedText
                                          variant='caption'
                                          weight='medium'
                                          color='primary'
                                        >
                                          Preferred
                                        </ThemedText>
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
                                      <ThemedText
                                        variant='caption'
                                        weight='medium'
                                        color='muted'
                                      >
                                        Cost/Unit
                                      </ThemedText>
                                      <ThemedInput
                                        variant='default'
                                        size='sm'
                                        fieldProps={{
                                          value:
                                            supplier.costPerUnit.toString(),
                                          onChangeText: (value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'costPerUnit',
                                              parseFloat(value) || 0
                                            ),
                                          keyboardType: 'numeric',
                                        }}
                                      />
                                    </VStack>
                                    <VStack space='xs' className='flex-1'>
                                      <ThemedText
                                        variant='caption'
                                        weight='medium'
                                        color='muted'
                                      >
                                        Cost/Case
                                      </ThemedText>
                                      <ThemedInput
                                        variant='default'
                                        size='sm'
                                        fieldProps={{
                                          value:
                                            supplier.costPerCase?.toString() ||
                                            '',
                                          onChangeText: (value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'costPerCase',
                                              value
                                                ? parseFloat(value)
                                                : undefined
                                            ),
                                          keyboardType: 'numeric',
                                          placeholder: 'Optional',
                                        }}
                                      />
                                    </VStack>
                                  </HStack>

                                  <HStack space='sm'>
                                    <VStack space='xs' className='flex-1'>
                                      <ThemedText
                                        variant='caption'
                                        weight='medium'
                                        color='muted'
                                      >
                                        Min Order
                                      </ThemedText>
                                      <ThemedInput
                                        variant='default'
                                        size='sm'
                                        fieldProps={{
                                          value:
                                            supplier.minimumOrder.toString(),
                                          onChangeText: (value) =>
                                            updateProductSupplier(
                                              supplier.supplierId,
                                              'minimumOrder',
                                              parseInt(value) || 1
                                            ),
                                          keyboardType: 'numeric',
                                        }}
                                      />
                                    </VStack>
                                    <VStack space='xs' className='flex-1'>
                                      <ThemedText
                                        variant='caption'
                                        weight='medium'
                                        color='muted'
                                      >
                                        Order By
                                      </ThemedText>
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
                                        className='border border-gray-300 rounded-lg p-1 h-10 bg-purple-500/20 dark:bg-purple-900/60'
                                      >
                                        <ThemedText
                                          variant='body'
                                          color='primary'
                                          align='center'
                                        >
                                          {supplier.orderingUnit}
                                        </ThemedText>
                                      </Pressable>
                                    </VStack>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </ThemedCard>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  )}
                </VStack>
              </ThemedCard>

              {/* Submit Button */}
              <ThemedButton
                variant='primary'
                size='lg'
                onPress={handleSubmit}
                disabled={isSubmitting}
                className='mt-4 rounded-xl border border-white/50 p-2 h-14'
                fullWidth
              >
                <ThemedText variant='body' weight='bold' color='onGradient'>
                  {isSubmitting ? 'Creating Product...' : 'Create Product'}
                </ThemedText>
              </ThemedButton>
            </VStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </Box>

      {/* Unit Picker Modal */}
      {showUnitPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end bottom-36'>
          <ThemedCard
            variant='primary'
            size='lg'
            className='bg-gray-200 dark:bg-gray-900 rounded-2xl'
          >
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  Select Unit
                </ThemedHeading>
                <Pressable onPress={() => setShowUnitPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300 }}>
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
                      <ThemedText variant='body' color='primary'>
                        {unit.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </ThemedCard>
        </Box>
      )}

      {/* Container Picker Modal */}
      {showContainerPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end bottom-36'>
          <ThemedCard
            variant='primary'
            size='lg'
            className='bg-gray-200 dark:bg-gray-900 rounded-2xl'
          >
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  Select Container
                </ThemedHeading>
                <Pressable onPress={() => setShowContainerPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300 }}>
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
                      <ThemedText variant='body' color='primary'>
                        {container.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </ThemedCard>
        </Box>
      )}

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end bottom-36'>
          <ThemedCard
            variant='primary'
            size='lg'
            className='bg-gray-200 dark:bg-gray-900 rounded-2xl'
          >
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  Select Category
                </ThemedHeading>
                <Pressable onPress={() => setShowCategoryPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300 }}>
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
                      <ThemedText variant='body' color='primary'>
                        {category.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </ThemedCard>
        </Box>
      )}

      {/* Supplier Picker Modal */}
      {showSupplierPicker && (
        <Box className='absolute inset-0 bg-black/50 justify-end bottom-36'>
          <ThemedCard
            variant='primary'
            size='lg'
            className='bg-gray-200 dark:bg-gray-900 rounded-2xl'
          >
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  Select Supplier
                </ThemedHeading>
                <Pressable onPress={() => setShowSupplierPicker(false)}>
                  <Ionicons name='close' size={24} color='#6B7280' />
                </Pressable>
              </HStack>
              <ScrollView style={{ maxHeight: 300 }}>
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
                        <ThemedText variant='body' color='primary'>
                          {supplier.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                </VStack>
              </ScrollView>
            </VStack>
          </ThemedCard>
        </Box>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <Box className='absolute inset-0 bg-black/50 justify-end bottom-36'>
          <ThemedCard
            variant='primary'
            size='lg'
            className='bg-gray-200 dark:bg-gray-900 rounded-2xl'
          >
            <VStack space='md'>
              <HStack className='justify-between items-center'>
                <ThemedHeading variant='h3' weight='bold' color='primary'>
                  Add Supplier Details
                </ThemedHeading>
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

              <ScrollView style={{ maxHeight: 400 }}>
                <VStack space='md'>
                  {/* Selected Supplier */}
                  <VStack space='sm'>
                    <ThemedText variant='body' weight='medium' color='primary'>
                      Selected Supplier
                    </ThemedText>
                    <Box className='bg-gray-100 dark:bg-gray-800/60 rounded-lg p-3'>
                      <ThemedText
                        variant='body'
                        weight='semibold'
                        color='primary'
                      >
                        {suppliers.find((s) => s.id === selectedSupplierId)
                          ?.name || 'Select a supplier'}
                      </ThemedText>
                    </Box>
                  </VStack>

                  {!selectedSupplierId && (
                    <Pressable
                      onPress={() => setShowSupplierPicker(true)}
                      className='bg-purple-100 rounded-lg p-3'
                    >
                      <ThemedText
                        variant='body'
                        weight='medium'
                        color='primary'
                        align='center'
                      >
                        Choose Supplier
                      </ThemedText>
                    </Pressable>
                  )}

                  {selectedSupplierId && (
                    <VStack space='md'>
                      {/* Cost Fields */}
                      <HStack space='sm'>
                        <VStack space='sm' className='flex-1'>
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='primary'
                          >
                            Cost Per Unit
                          </ThemedText>
                          <ThemedInput
                            variant='default'
                            size='md'
                            fieldProps={{
                              placeholder: formData.costPerUnit.toString(),
                              value:
                                supplierFormData.costPerUnit?.toString() || '',
                              onChangeText: (value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  costPerUnit: parseFloat(value) || 0,
                                })),
                              keyboardType: 'numeric',
                            }}
                          />
                        </VStack>
                        <VStack space='sm' className='flex-1'>
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='primary'
                          >
                            Cost Per Case
                          </ThemedText>
                          <ThemedInput
                            variant='default'
                            size='md'
                            fieldProps={{
                              placeholder:
                                formData.costPerCase?.toString() || 'Optional',
                              value:
                                supplierFormData.costPerCase?.toString() || '',
                              onChangeText: (value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  costPerCase: parseFloat(value) || 0,
                                })),
                              keyboardType: 'numeric',
                            }}
                          />
                        </VStack>
                      </HStack>

                      {/* Order Details */}
                      <HStack space='sm'>
                        <VStack space='sm' className='flex-1'>
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='primary'
                          >
                            Minimum Order
                          </ThemedText>
                          <ThemedInput
                            variant='default'
                            size='md'
                            fieldProps={{
                              placeholder: '1',
                              value: supplierFormData.minimumOrder.toString(),
                              onChangeText: (value) =>
                                setSupplierFormData((prev) => ({
                                  ...prev,
                                  minimumOrder: parseInt(value) || 1,
                                })),
                              keyboardType: 'numeric',
                            }}
                          />
                        </VStack>
                        <VStack space='sm' className='flex-1'>
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='primary'
                          >
                            Order By
                          </ThemedText>
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
                            className='border border-gray-300 rounded-lg p-2 bg-purple-500/20 dark:bg-purple-900/60'
                          >
                            <HStack className='justify-between items-center'>
                              <ThemedText variant='body' color='primary'>
                                {supplierFormData.orderingUnit}
                              </ThemedText>
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
                        <ThemedButton
                          variant='outline'
                          size='md'
                          onPress={() => {
                            setShowSupplierForm(false)
                            setSelectedSupplierId('')
                          }}
                          style={{ flex: 1 }}
                        >
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='primary'
                          >
                            Cancel
                          </ThemedText>
                        </ThemedButton>
                        <ThemedButton
                          variant='primary'
                          size='md'
                          onPress={addSupplierToProduct}
                          style={{ flex: 1 }}
                        >
                          <ThemedText
                            variant='body'
                            weight='medium'
                            color='onGradient'
                          >
                            Add Supplier
                          </ThemedText>
                        </ThemedButton>
                      </HStack>
                    </VStack>
                  )}
                </VStack>
              </ScrollView>
            </VStack>
          </ThemedCard>
        </Box>
      )}
    </PageGradient>
  )
}
