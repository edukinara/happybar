import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useState } from 'react'
import { FlatList, Modal, Pressable, ScrollView, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocations } from '../hooks/useInventoryData'

// Design system colors - matching web app theme
const colors = {
  primary: '#6366F1', // Primary indigo
  accent: '#8B5CF6', // Accent purple
  success: '#10B981', // Success green
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
}

interface CountSetupProps {
  countType: string
}

interface StorageArea {
  id: string
  name: string
  order: number
}

export default function CountSetupScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { countType } = route.params as CountSetupProps

  // API data
  const { data: locations, isLoading: locationsLoading } = useLocations()

  // Form state
  const [countName, setCountName] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([])
  const [newAreaName, setNewAreaName] = useState('')
  const [showLocationModal, setShowLocationModal] = useState(false)

  // Initialize with default name and auto-select location
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    setCountName(`Inventory Count - ${today}`)
  }, [])

  // Auto-select location if only one exists
  useEffect(() => {
    if (locations && locations.length === 1 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id)
    }
  }, [locations, selectedLocationId])

  const addStorageArea = () => {
    if (newAreaName.trim()) {
      const newArea: StorageArea = {
        id: `area-${Date.now()}`,
        name: newAreaName.trim(),
        order: storageAreas.length + 1,
      }
      setStorageAreas([...storageAreas, newArea])
      setNewAreaName('')
    }
  }

  const removeStorageArea = (id: string) => {
    setStorageAreas(storageAreas.filter((area) => area.id !== id))
  }

  const getSelectedLocation = () => {
    return locations?.find((loc) => loc.id === selectedLocationId)
  }

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    setShowLocationModal(false)
  }

  const handleCreateCount = () => {
    // TODO: Create count via API
    console.log('Creating count:', {
      countType,
      countName,
      locationId: selectedLocationId,
      notes,
      storageAreas,
    })

    // For now, navigate back to home
    navigation.navigate('Main' as never)
  }

  const getCountTypeInfo = () => {
    switch (countType) {
      case 'FULL':
        return {
          title: 'Full Count',
          description: 'Complete inventory count of all items',
          icon: 'clipboard',
          color: colors.primary,
        }
      case 'SPOT':
        return {
          title: 'Spot Check',
          description: 'Quick count of specific high-value items',
          icon: 'search',
          color: colors.accent,
        }
      case 'CYCLE':
        return {
          title: 'Cycle Count',
          description: 'Rotating count of different areas over time',
          icon: 'refresh',
          color: colors.primary,
        }
      default:
        return {
          title: 'Count',
          description: 'Inventory count',
          icon: 'clipboard',
          color: colors.primary,
        }
    }
  }

  const typeInfo = getCountTypeInfo()
  const selectedLocation = getSelectedLocation()
  const canCreateCount =
    countName.trim() && selectedLocationId && storageAreas.length > 0

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      className='flex-1'
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <SafeAreaView>
        <HStack className='items-center justify-between p-4'>
          <Pressable
            onPress={() => navigation.goBack()}
            className='p-3 rounded-xl active:opacity-70'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Ionicons name='arrow-back' size={24} color='white' />
          </Pressable>
          <Heading size='lg' className='text-white font-bold'>
            Setup Count
          </Heading>
          <Box className='w-12' />
        </HStack>
      </SafeAreaView>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={{ gap: 20 }}>
          {/* Count Type Banner */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <HStack style={{ alignItems: 'center', gap: 16 }}>
              <LinearGradient
                colors={[typeInfo.color, typeInfo.color + 'DD']}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: typeInfo.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Ionicons
                  name={typeInfo.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color='white'
                />
              </LinearGradient>
              <VStack className='flex-1'>
                <Heading size='lg' className='text-gray-900 font-bold'>
                  {typeInfo.title}
                </Heading>
                <Text className='text-gray-600 text-base mt-1'>
                  {typeInfo.description}
                </Text>
              </VStack>
            </HStack>
          </LinearGradient>

          {/* Count Name */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <VStack className='space-y-3'>
              <HStack style={{ alignItems: 'center', gap: 12 }}>
                <Box
                  style={{
                    backgroundColor: colors.primaryLight,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name='create-outline'
                    size={16}
                    color={colors.primary}
                  />
                </Box>
                <Text className='font-semibold text-gray-900'>Count Name</Text>
              </HStack>
              <TextInput
                value={countName}
                onChangeText={setCountName}
                placeholder='e.g., Weekly Count - Jan 15'
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: '#374151',
                  borderWidth: 1,
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                }}
                placeholderTextColor='#9CA3AF'
              />
            </VStack>
          </LinearGradient>

          {/* Location Selection */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <VStack className='space-y-3'>
              <HStack style={{ alignItems: 'center', gap: 12 }}>
                <Box
                  style={{
                    backgroundColor: colors.successLight,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name='location' size={16} color={colors.success} />
                </Box>
                <Text className='font-semibold text-gray-900'>Location</Text>
              </HStack>
              <Pressable
                onPress={() => setShowLocationModal(true)}
                disabled={locationsLoading || !locations?.length}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingLeft: 16,
                  paddingRight: 24,
                  borderWidth: 1,
                  borderColor: selectedLocation
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(99, 102, 241, 0.2)',
                }}
              >
                <HStack className='items-center justify-between'>
                  <HStack style={{ alignItems: 'center', gap: 16 }}>
                    <Box
                      style={{
                        backgroundColor: selectedLocation
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(156, 163, 175, 0.1)',
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons
                        name='business'
                        size={16}
                        color={selectedLocation ? '#10B981' : '#6B7280'}
                      />
                    </Box>
                    <VStack className='flex-1'>
                      <Text className='text-gray-900 font-medium'>
                        {locationsLoading
                          ? 'Loading locations...'
                          : selectedLocation?.name || 'Select a location'}
                      </Text>
                      {selectedLocation?._count && (
                        <Text className='text-gray-500 text-sm'>
                          {selectedLocation._count.inventoryItems} inventory
                          items
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  <Ionicons name='chevron-down' size={20} color='#6B7280' />
                </HStack>
              </Pressable>
              {!locationsLoading && locations?.length === 0 && (
                <HStack className='items-center space-x-2 mt-2'>
                  <Ionicons name='warning' size={16} color='#EF4444' />
                  <Text className='text-sm text-red-500 flex-1'>
                    No locations available. Please add locations first.
                  </Text>
                </HStack>
              )}
            </VStack>
          </LinearGradient>

          {/* Storage Areas */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <VStack style={{ gap: 20 }}>
              <HStack className='items-center justify-between'>
                <HStack style={{ alignItems: 'center', gap: 12 }}>
                  <Box
                    style={{
                      backgroundColor: colors.accentLight,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name='grid-outline'
                      size={16}
                      color={colors.accent}
                    />
                  </Box>
                  <Text className='font-semibold text-gray-900'>
                    Storage Areas
                  </Text>
                </HStack>
                <Box
                  style={{
                    backgroundColor:
                      storageAreas.length > 0
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(156, 163, 175, 0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    className='text-sm font-semibold'
                    style={{
                      color: storageAreas.length > 0 ? '#10B981' : '#6B7280',
                    }}
                  >
                    {storageAreas.length} area
                    {storageAreas.length !== 1 ? 's' : ''}
                  </Text>
                </Box>
              </HStack>

              {/* Add New Area */}
              <VStack style={{ gap: 16 }}>
                <HStack style={{ gap: 12 }}>
                  <TextInput
                    value={newAreaName}
                    onChangeText={setNewAreaName}
                    placeholder='Area name (Bar, Kitchen, etc.)'
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 16,
                      color: '#374151',
                      borderWidth: 1,
                      borderColor: 'rgba(99, 102, 241, 0.2)',
                    }}
                    placeholderTextColor='#9CA3AF'
                    onSubmitEditing={addStorageArea}
                    numberOfLines={1}
                  />
                  <Pressable
                    onPress={addStorageArea}
                    disabled={!newAreaName.trim()}
                    style={{
                      backgroundColor: newAreaName.trim()
                        ? '#6366F1'
                        : 'rgba(156, 163, 175, 0.3)',
                      padding: 14,
                      borderRadius: 12,
                      shadowColor: newAreaName.trim()
                        ? '#6366F1'
                        : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons
                      name='add'
                      size={20}
                      color={newAreaName.trim() ? 'white' : '#9CA3AF'}
                    />
                  </Pressable>
                </HStack>
              </VStack>

              {/* Areas List */}
              {storageAreas.length > 0 && (
                <VStack style={{ gap: 12, marginTop: 16 }}>
                  {storageAreas.map((area, index) => (
                    <LinearGradient
                      key={area.id}
                      colors={[
                        'rgba(255, 255, 255, 0.8)',
                        'rgba(255, 255, 255, 0.6)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(99, 102, 241, 0.1)',
                      }}
                    >
                      <HStack className='items-center justify-between'>
                        <HStack className='items-center space-x-3 flex-1'>
                          <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text className='text-white text-xs font-bold'>
                              {index + 1}
                            </Text>
                          </LinearGradient>
                          <Text className='text-gray-900 flex-1 font-medium'>
                            {area.name}
                          </Text>
                        </HStack>
                        <Pressable
                          onPress={() => removeStorageArea(area.id)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: 8,
                            borderRadius: 8,
                          }}
                        >
                          <Ionicons
                            name='trash-outline'
                            size={16}
                            color='#EF4444'
                          />
                        </Pressable>
                      </HStack>
                    </LinearGradient>
                  ))}
                </VStack>
              )}

              {storageAreas.length === 0 && (
                <LinearGradient
                  colors={['rgba(255, 235, 59, 0.2)', 'rgba(255, 193, 7, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 193, 7, 0.2)',
                  }}
                >
                  <HStack className='items-center space-x-3'>
                    <Ionicons
                      name='information-circle'
                      size={20}
                      color='#D97706'
                    />
                    <Text className='flex-1 text-amber-800 font-medium'>
                      Add at least one storage area to organize your count
                    </Text>
                  </HStack>
                </LinearGradient>
              )}
            </VStack>
          </LinearGradient>

          {/* Notes */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <VStack className='space-y-3'>
              <HStack style={{ alignItems: 'center', gap: 12 }}>
                <Box
                  style={{
                    backgroundColor: colors.primaryLight,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name='document-text-outline'
                    size={16}
                    color={colors.primary}
                  />
                </Box>
                <Text className='font-semibold text-gray-900'>
                  Notes (Optional)
                </Text>
              </HStack>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder='Any additional notes about this count...'
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: '#374151',
                  borderWidth: 1,
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
                placeholderTextColor='#9CA3AF'
              />
            </VStack>
          </LinearGradient>

          {/* Next Steps Info */}
          <Box
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <VStack style={{ gap: 20 }}>
              <HStack style={{ alignItems: 'center', gap: 12 }}>
                <Ionicons name='information-circle' size={18} color='white' />
                <Heading size='base' className='text-white font-semibold'>
                  What happens next?
                </Heading>
              </HStack>
              <VStack style={{ gap: 20 }}>
                <HStack style={{ alignItems: 'center', gap: 16 }}>
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text className='text-white text-xs font-bold'>1</Text>
                  </LinearGradient>
                  <Text className='flex-1 text-white/90 text-base'>
                    Count will be created and ready to start
                  </Text>
                </HStack>
                <HStack style={{ alignItems: 'center', gap: 16 }}>
                  <LinearGradient
                    colors={['#10B981', '#047857']}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text className='text-white text-xs font-bold'>2</Text>
                  </LinearGradient>
                  <Text className='flex-1 text-white/90 text-base'>
                    Use scanner to count items in each area
                  </Text>
                </HStack>
                <HStack style={{ alignItems: 'center', gap: 16 }}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text className='text-white text-xs font-bold'>3</Text>
                  </LinearGradient>
                  <Text className='flex-1 text-white/90 text-base'>
                    Review results and update inventory
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* Action Buttons */}
          <VStack style={{ gap: 20, paddingTop: 8 }}>
            <LinearGradient
              colors={
                canCreateCount
                  ? [colors.primary, colors.accent]
                  : ['#E5E7EB', '#D1D5DB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                shadowColor: canCreateCount ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canCreateCount ? 0.25 : 0,
                shadowRadius: 8,
                elevation: canCreateCount ? 6 : 0,
              }}
            >
              <Pressable
                onPress={handleCreateCount}
                disabled={!canCreateCount}
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                }}
              >
                <HStack style={{ alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name='checkmark-circle'
                    size={18}
                    color={canCreateCount ? 'white' : '#9CA3AF'}
                  />
                  <Text
                    className='font-semibold text-base'
                    style={{ color: canCreateCount ? 'white' : '#9CA3AF' }}
                  >
                    Create Count
                  </Text>
                </HStack>
              </Pressable>
            </LinearGradient>

            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 24,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <HStack className='items-center space-x-3'>
                <Ionicons name='arrow-back' size={18} color='white' />
                <Text className='font-semibold text-white text-base'>Back</Text>
              </HStack>
            </Pressable>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setShowLocationModal(false)}
      >
        <VStack className='flex-1 justify-end'>
          <Pressable
            className='bg-black/50 flex-1'
            onPress={() => setShowLocationModal(false)}
          />
          <Box
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 40,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 20,
            }}
          >
            <VStack className='p-6 space-y-4'>
              {/* Modal Header */}
              <HStack className='items-center justify-between'>
                <HStack className='items-center space-x-3'>
                  <Box
                    style={{
                      backgroundColor: colors.primaryLight,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name='location'
                      size={16}
                      color={colors.primary}
                    />
                  </Box>
                  <Heading size='lg' className='text-gray-900 font-semibold'>
                    Select Location
                  </Heading>
                </HStack>
                <Pressable
                  onPress={() => setShowLocationModal(false)}
                  style={{
                    backgroundColor: colors.primaryLight,
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name='close' size={20} color={colors.primary} />
                </Pressable>
              </HStack>

              {/* Divider */}
              <Box style={{ height: 1, backgroundColor: '#E5E7EB' }} />

              {/* Locations List */}
              {locations && locations.length > 0 ? (
                <VStack className='space-y-2 max-h-80'>
                  <FlatList
                    data={locations}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => handleLocationSelect(item.id)}
                        style={{
                          backgroundColor:
                            selectedLocationId === item.id
                              ? colors.primaryLight
                              : 'white',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 4,
                          borderWidth: 1,
                          borderColor:
                            selectedLocationId === item.id
                              ? colors.primary
                              : '#E5E7EB',
                        }}
                      >
                        <HStack className='items-center justify-between'>
                          <HStack className='items-center space-x-3 flex-1'>
                            <Box
                              style={{
                                backgroundColor:
                                  selectedLocationId === item.id
                                    ? colors.primary
                                    : colors.primaryLight,
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Ionicons
                                name='business'
                                size={18}
                                color={
                                  selectedLocationId === item.id
                                    ? 'white'
                                    : colors.primary
                                }
                              />
                            </Box>
                            <VStack className='flex-1'>
                              <Text className='font-semibold text-gray-900'>
                                {item.name}
                              </Text>
                              {item._count && (
                                <Text className='text-sm text-gray-500'>
                                  {item._count.inventoryItems} inventory items
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                          {selectedLocationId === item.id && (
                            <Box
                              style={{
                                backgroundColor: colors.primary,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Ionicons
                                name='checkmark'
                                size={12}
                                color='white'
                              />
                            </Box>
                          )}
                        </HStack>
                      </Pressable>
                    )}
                  />
                </VStack>
              ) : (
                <Box
                  style={{
                    backgroundColor: colors.primaryLight + '40',
                    borderRadius: 12,
                    padding: 32,
                    alignItems: 'center',
                  }}
                >
                  <Box
                    style={{
                      backgroundColor: colors.primaryLight,
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons
                      name='location-outline'
                      size={24}
                      color={colors.primary}
                    />
                  </Box>
                  <Text className='text-gray-600 text-center font-medium'>
                    No locations available
                  </Text>
                  <Text className='text-gray-400 text-center text-sm mt-1'>
                    Please add locations first
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>
        </VStack>
      </Modal>
    </LinearGradient>
  )
}
