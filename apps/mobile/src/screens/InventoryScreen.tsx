import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme'
import { useInventoryLevels, useLowStockItems } from '../hooks/useInventoryData'

export function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all')

  const {
    data: inventoryLevels,
    isLoading,
    refetch,
    isFetching,
  } = useInventoryLevels()
  const { data: lowStockItems } = useLowStockItems()

  const filteredItems = React.useMemo(() => {
    if (!inventoryLevels) return []

    let filtered = inventoryLevels

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.product?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply stock level filter
    if (filterType === 'low') {
      const lowStockIds = lowStockItems?.map((item) => item.productId) || []
      filtered = filtered.filter((item) => lowStockIds.includes(item.productId))
    } else if (filterType === 'out') {
      filtered = filtered.filter((item) => item.currentQuantity <= 0)
    }

    return filtered
  }, [inventoryLevels, searchQuery, filterType, lowStockItems])

  const renderInventoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.inventoryItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.productName}>
          {item.product?.name || 'Unknown Product'}
        </Text>
        <Text style={styles.productSku}>SKU: {item.product?.sku || 'N/A'}</Text>
        <Text style={styles.productUnit}>
          {item.product?.unit} • {item.product?.container}
        </Text>
      </View>

      <View style={styles.quantityInfo}>
        <Text
          style={[
            styles.quantity,
            item.currentQuantity <= 0
              ? styles.outOfStock
              : lowStockItems?.some(
                    (lowItem) => lowItem.productId === item.productId
                  )
                ? styles.lowStock
                : styles.inStock,
          ]}
        >
          {item.currentQuantity}
        </Text>
        <Text style={styles.quantityLabel}>
          {item.product?.unit || 'units'}
        </Text>
        {item.parLevel && (
          <Text style={styles.parLevel}>Par: {item.parLevel}</Text>
        )}
      </View>

      <View style={styles.statusIndicator}>
        {item.currentQuantity <= 0 ? (
          <Ionicons name='alert-circle' size={24} color={Colors.error} />
        ) : lowStockItems?.some(
            (lowItem) => lowItem.productId === item.productId
          ) ? (
          <Ionicons name='warning' size={24} color={Colors.warning} />
        ) : (
          <Ionicons name='checkmark-circle' size={24} color={Colors.success} />
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Inventory</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name='add' size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name='search' size={20} color={Colors.gray[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search products...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.gray[400]}
            />
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'all' && styles.activeFilter,
            ]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'all' && styles.activeFilterText,
              ]}
            >
              All ({inventoryLevels?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'low' && styles.activeFilter,
            ]}
            onPress={() => setFilterType('low')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'low' && styles.activeFilterText,
              ]}
            >
              Low Stock ({lowStockItems?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'out' && styles.activeFilter,
            ]}
            onPress={() => setFilterType('out')}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'out' && styles.activeFilterText,
              ]}
            >
              Out of Stock (
              {inventoryLevels?.filter((item) => item.currentQuantity <= 0)
                .length || 0}
              )
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inventory List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={Colors.primary} />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={refetch}
                colors={[Colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: Colors.gray[900],
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.gray[900],
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  activeFilter: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.gray[700],
    fontWeight: 500,
  },
  activeFilterText: {
    color: Colors.white,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  inventoryItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 600,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  productSku: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  quantityInfo: {
    alignItems: 'flex-end',
    marginRight: Spacing.md,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 2,
  },
  inStock: {
    color: Colors.success,
  },
  lowStock: {
    color: Colors.warning,
  },
  outOfStock: {
    color: Colors.error,
  },
  quantityLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 2,
  },
  parLevel: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  statusIndicator: {
    width: 32,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray[600],
    marginTop: Spacing.sm,
  },
})
