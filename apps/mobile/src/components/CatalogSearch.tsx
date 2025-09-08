import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, ScrollView } from 'react-native'

import { Box } from '@/components/ui/box'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { useDebounce } from '../hooks/useDebounce'
import { useCatalog } from '../hooks/useInventoryData'

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
}

export function CatalogSearch({
  onSelect,
  placeholder = 'Search product catalog...',
  className = '',
}: CatalogSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)

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
    <VStack space="sm" className={className}>
      <VStack space="sm">
        <Text className="text-gray-700 font-medium">
          Search Catalog (Optional)
        </Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={placeholder}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Input>
        <Text className="text-gray-500 text-xs">
          Search to auto-fill product details from catalog
        </Text>
      </VStack>

      {/* Search Results */}
      {showResults && hasValidSearch && (
        <Card className="border border-gray-200 rounded-lg">
          <ScrollView 
            style={{ maxHeight: 256 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            bounces={false}
          >
            <VStack space="xs" className="p-3">
              {!hasValidSearch ? (
                <Box className="p-4">
                  <Text className="text-gray-500 text-center">
                    Type at least 3 characters to search
                  </Text>
                </Box>
              ) : isLoading ? (
                <Box className="p-4 items-center">
                  <ActivityIndicator color="#8B5CF6" />
                  <Text className="text-gray-500 text-center mt-2">
                    Searching catalog...
                  </Text>
                </Box>
              ) : catalogProducts.length === 0 ? (
                <Box className="p-4">
                  <Text className="text-gray-500 text-center">
                    No products found in catalog
                  </Text>
                </Box>
              ) : (
                catalogProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    className="p-3 rounded-lg border border-gray-100 bg-white"
                    onPress={() => handleSelect(product)}
                  >
                    <VStack space="sm">
                      {/* Product Name and Category */}
                      <HStack className="justify-between items-start">
                        <VStack className="flex-1 mr-2">
                          <HStack className="items-center" space="sm">
                            <Ionicons name="cube-outline" size={16} color="#6B7280" />
                            <Text className="font-semibold text-gray-900 flex-1" numberOfLines={2}>
                              {product.name}
                            </Text>
                          </HStack>
                        </VStack>
                        {product.category && (
                          <Box className="bg-gray-100 px-2 py-1 rounded-full">
                            <Text className="text-xs text-gray-600">
                              {product.category.name}
                            </Text>
                          </Box>
                        )}
                      </HStack>

                      {/* Product Details */}
                      <HStack space="md" className="flex-wrap">
                        {product.upc && (
                          <Text className="text-xs text-gray-500">
                            UPC: {product.upc}
                          </Text>
                        )}
                        {product.unitSize && product.unit && (
                          <Text className="text-xs text-gray-500">
                            {product.unitSize}{product.unit}
                          </Text>
                        )}
                        {product.container && (
                          <Text className="text-xs text-gray-500">
                            {product.container}
                          </Text>
                        )}
                        {product.caseSize && (
                          <Text className="text-xs text-gray-500">
                            Case: {product.caseSize}
                          </Text>
                        )}
                      </HStack>

                      {/* Pricing */}
                      {(product.costPerUnit || product.costPerCase) && (
                        <HStack space="md">
                          {product.costPerUnit && (
                            <Text className="text-xs text-green-600 font-medium">
                              Unit: ${product.costPerUnit.toFixed(2)}
                            </Text>
                          )}
                          {product.costPerCase && (
                            <Text className="text-xs text-green-600 font-medium">
                              Case: ${product.costPerCase.toFixed(2)}
                            </Text>
                          )}
                        </HStack>
                      )}
                    </VStack>
                  </Pressable>
                ))
              )}
            </VStack>
          </ScrollView>
        </Card>
      )}
    </VStack>
  )
}