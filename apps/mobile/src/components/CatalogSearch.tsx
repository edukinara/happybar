import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, ScrollView } from 'react-native'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'

import { useDebounce } from '../hooks/useDebounce'
import { useCatalog } from '../hooks/useInventoryData'
import { ProductImage, ProductImageVariants } from './ProductImage'
import { ThemedCard, ThemedInput, ThemedText } from './themed'

// CatalogProduct type for mobile
export interface CatalogProduct {
  id: string
  name: string
  upc: string | null
  unit: string | null
  unitSize: number | null
  caseSize: number | null
  costPerUnit: number | null
  costPerCase: number | null
  image: string | null
  container: string | null
  categoryId: string
  category: {
    id: string
    name: string
  }
}

interface CatalogSearchProps {
  onSelect: (product: CatalogProduct) => void
  placeholder?: string
  className?: string
  onScanBarcode?: () => void
  searchTerm?: string
  setSearchTerm?: (term: string) => void
  showResults?: boolean
  setShowResults?: (show: boolean) => void
}

export function CatalogSearch({
  onSelect,
  placeholder = 'Search product catalog...',
  className = '',
  onScanBarcode,
  searchTerm: externalSearchTerm,
  setSearchTerm: externalSetSearchTerm,
  showResults: externalShowResults,
  setShowResults: externalSetShowResults,
}: CatalogSearchProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('')
  const [internalShowResults, setInternalShowResults] = useState(false)

  const searchTerm = externalSearchTerm ?? internalSearchTerm
  const setSearchTerm = externalSetSearchTerm ?? setInternalSearchTerm
  const showResults = externalShowResults ?? internalShowResults
  const setShowResults = externalSetShowResults ?? setInternalShowResults

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Use the catalog search hook with debounced search term
  const { data: catalogProducts = [], isLoading } = useCatalog({
    search: debouncedSearch,
    limit: 20,
  })

  const handleSelect = (product: CatalogProduct) => {
    onSelect(product)
    setShowResults(false)
    setSearchTerm('')
  }

  const handleSearchFocus = () => {
    setShowResults(true)
  }

  const handleSearchBlur = () => {
    // Delay hiding results to allow for product selection
    setTimeout(() => setShowResults(false), 200)
  }


  const hasValidSearch = searchTerm.length >= 3

  return (
    <VStack space='sm' className={className}>
      <VStack space='sm'>
        <ThemedText variant='body' weight='medium' color='primary'>
          Search Catalog (Optional)
        </ThemedText>
        <HStack space='xs'>
          <Box className='flex-1'>
            <ThemedInput
              variant='default'
              size='md'
              fieldProps={{
                placeholder,
                value: searchTerm,
                onChangeText: setSearchTerm,
                onFocus: handleSearchFocus,
                onBlur: handleSearchBlur,
                autoCapitalize: 'none',
                autoCorrect: false,
              }}
            />
          </Box>
          {onScanBarcode && (
            <Pressable
              onPress={onScanBarcode}
              className='bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg justify-center'
            >
              <Ionicons name='barcode-outline' size={20} color='#8B5CF6' />
            </Pressable>
          )}
        </HStack>
        <ThemedText variant='caption' color='muted'>
          Search by name, UPC, or scan barcode to auto-fill product details
        </ThemedText>
      </VStack>

      {/* Search Results */}
      {showResults && hasValidSearch && (
        <ThemedCard variant='primary' size='md'>
          <ScrollView
            style={{ maxHeight: 256 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps='handled'
            nestedScrollEnabled={true}
            bounces={false}
          >
            <VStack space='md' style={{ padding: 4 }}>
              {!hasValidSearch ? (
                <Box style={{ padding: 16 }}>
                  <ThemedText variant='body' color='muted' align='center'>
                    Type at least 3 characters to search
                  </ThemedText>
                </Box>
              ) : isLoading ? (
                <Box style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color='#8B5CF6' />
                  <ThemedText
                    variant='body'
                    color='muted'
                    align='center'
                    style={{ marginTop: 8 }}
                  >
                    Searching catalog...
                  </ThemedText>
                </Box>
              ) : catalogProducts.length === 0 ? (
                <Box style={{ padding: 16 }}>
                  <ThemedText variant='body' color='muted' align='center'>
                    No products found in catalog
                  </ThemedText>
                </Box>
              ) : (
                catalogProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    // style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                    onPress={() => handleSelect(product)}
                    className='border border-gray-300 dark:border-white/30 rounded-lg p-3 bg-black/5 dark:bg-white/5'
                  >
                    <HStack space='sm'>
                      {/* Product Image */}
                      <ProductImage
                        uri={product.image}
                        {...ProductImageVariants.small}
                      />

                      {/* Product Content */}
                      <VStack space='2xs' className='flex-1'>
                        {/* Product Name and Category */}
                        <HStack className='justify-between items-start'>
                          <VStack className='flex-1' style={{ marginRight: 8 }}>
                            <ThemedText
                              variant='body'
                              weight='semibold'
                              color='primary'
                              numberOfLines={2}
                            >
                              {product.name}
                            </ThemedText>
                          </VStack>
                          {product.category && (
                            <Box className='rounded-lg py-0.5 px-2 bg-white dark:bg-white/20'>
                              <ThemedText variant='caption' color='muted'>
                                {product.category.name}
                              </ThemedText>
                            </Box>
                          )}
                        </HStack>

                        {/* Product Details */}
                        <HStack
                          space='md'
                          className='flex-wrap justify-between'
                        >
                          {product.upc && (
                            <ThemedText variant='caption' color='muted'>
                              UPC: {product.upc}
                            </ThemedText>
                          )}
                          <HStack space='sm'>
                            {product.unitSize && product.unit && (
                              <ThemedText variant='caption' color='muted' bold>
                                {product.unitSize}
                                {product.unit}
                              </ThemedText>
                            )}
                            {product.container && (
                              <ThemedText variant='caption' color='muted'>
                                {product.container}
                              </ThemedText>
                            )}
                          </HStack>
                        </HStack>
                      </VStack>
                    </HStack>

                    {/* Pricing */}
                    <HStack space='md' className=' w-full justify-between'>
                      {product.caseSize && (
                        <ThemedText variant='caption' color='muted'>
                          Case: {product.caseSize}
                        </ThemedText>
                      )}
                      {(product.costPerUnit || product.costPerCase) && (
                        <HStack space='md'>
                          {product.costPerUnit && (
                            <ThemedText
                              variant='caption'
                              weight='medium'
                              color='success'
                            >
                              Unit: ${product.costPerUnit.toFixed(2)}
                            </ThemedText>
                          )}
                          {product.costPerCase && (
                            <ThemedText
                              variant='caption'
                              weight='medium'
                              color='success'
                            >
                              Case: ${product.costPerCase.toFixed(2)}
                            </ThemedText>
                          )}
                        </HStack>
                      )}
                    </HStack>
                  </Pressable>
                ))
              )}
            </VStack>
          </ScrollView>
        </ThemedCard>
      )}
    </VStack>
  )
}

