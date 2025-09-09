import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context' // useSafeAreaInsets not used
import { Colors } from '../constants/theme'
import { useLocations } from '../hooks/useInventoryData'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useCountStore } from '../stores/countStore'

// Design system colors - matching web app theme
const colors = {
  primary: '#6366F1', // Primary indigo
  accent: '#8B5CF6', // Accent purple
  success: '#10B981', // Success green
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
}

// interface StorageArea {
//   id: string
//   name: string
//   order: number
// }

// Progressive flow steps
type SetupStep = 'name' | 'location' | 'type' | 'areas'
type CountType = 'FULL' | 'CYCLE' | 'SPOT'

// Pre-defined storage areas from API documentation
const PREDEFINED_AREAS = [
  { name: 'Behind Bar', order: 1 },
  { name: 'Back Bar', order: 2 },
  { name: 'Liquor Storage', order: 3 },
  { name: 'Beer Cooler', order: 4 },
  { name: 'Walk-in Cooler', order: 5 },
  { name: 'Wine Cellar', order: 6 },
  { name: 'Dry Storage', order: 7 },
  { name: 'Speed Rail', order: 8 },
  { name: 'Display Cooler', order: 9 },
  { name: 'Prep Area', order: 10 },
]

export default function CountSetupScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  // const insets = useSafeAreaInsets() // Not currently used

  // Get route params for quick count
  const routeParams = route.params as
    | { isQuickCount?: boolean; presetType?: 'SPOT' | 'FULL' | 'CYCLE' }
    | undefined
  const isQuickCount = routeParams?.isQuickCount || false
  const presetType = routeParams?.presetType

  // API data
  const { data: locations } = useLocations()
  // const { data: locations, isLoading: locationsLoading } = useLocations() // locationsLoading not used

  // Progressive flow state - skip 'type' step for quick count
  const [currentStep, setCurrentStep] = useState<SetupStep>('name')

  // Form state
  const [countName, setCountName] = useState(
    isQuickCount ? `Quick Count ${new Date().toLocaleDateString()}` : ''
  )
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [countType, setCountType] = useState<CountType>(presetType || 'FULL')
  const [notes] = useState('')
  // const [notes, setNotes] = useState('') // setNotes not used
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [customAreas, setCustomAreas] = useState<string[]>([])
  const [newAreaName, setNewAreaName] = useState('')
  const [showLocationModal] = useState(false)
  // const [showLocationModal, setShowLocationModal] = useState(false) // setShowLocationModal not used
  const [isCreating, setIsCreating] = useState(false)

  // Refs for input focus management
  const countNameInputRef = useRef<TextInput>(null)
  const customAreaInputRef = useRef<TextInput>(null)

  // Initialize with default name and auto-select location
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    setCountName(`Inventory Count - ${today}`)
  }, [])

  // Auto-select location if only one exists, or for quick counts select first available
  useEffect(() => {
    if (locations && locations.length === 1 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id)
    }
    // For quick counts, auto-select first location if available to speed up flow
    if (
      isQuickCount &&
      locations &&
      locations.length > 0 &&
      !selectedLocationId
    ) {
      setSelectedLocationId(locations[0].id)
    }
  }, [locations, selectedLocationId, isQuickCount])

  // Navigation functions
  const goToNextStep = () => {
    const steps: SetupStep[] = isQuickCount
      ? ['name', 'location', 'areas']
      : ['name', 'location', 'type', 'areas']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  // Focus management for inputs
  useEffect(() => {
    if (currentStep === 'name') {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        countNameInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentStep])

  const goToPreviousStep = () => {
    const steps: SetupStep[] = isQuickCount
      ? ['name', 'location', 'areas']
      : ['name', 'location', 'type', 'areas']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    } else {
      navigation.goBack()
    }
  }

  // Validation functions
  const canProceedFromStep = () => {
    switch (currentStep) {
      case 'name':
        return countName.trim().length > 0
      case 'location':
        return selectedLocationId.length > 0
      case 'type':
        return true // Always valid
      case 'areas':
        return selectedAreas.length > 0 || customAreas.length > 0
      default:
        return false
    }
  }

  // Area selection functions
  const togglePredefinedArea = (areaName: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaName)
        ? prev.filter((name) => name !== areaName)
        : [...prev, areaName]
    )
  }

  const addCustomArea = () => {
    if (newAreaName.trim() && !customAreas.includes(newAreaName.trim())) {
      setCustomAreas((prev) => [...prev, newAreaName.trim()])
      setNewAreaName('')
    }
  }

  const removeCustomArea = (areaName: string) => {
    setCustomAreas((prev) => prev.filter((name) => name !== areaName))
  }

  const getSelectedLocation = () => {
    return locations?.find((loc) => loc.id === selectedLocationId)
  }

  // const handleLocationSelect = (locationId: string) => {
  //   setSelectedLocationId(locationId)
  //   setShowLocationModal(false)
  // }

  const handleCreateCount = async () => {
    if (!canProceedFromStep() || isCreating) return

    const selectedLocation = getSelectedLocation()
    if (!selectedLocation) return

    setIsCreating(true)

    try {
      // Check for existing active counts before creating
      const { checkForActiveBackendSessions } = useCountStore.getState()
      const activeSessions = await checkForActiveBackendSessions()

      // Check if there's already an active count for this location
      const existingCount = activeSessions.find(
        (session) => session.locationId === selectedLocationId
      )

      if (existingCount) {
        Alert.alert(
          'Active Count Found',
          `There's already an active count "${existingCount.name}" for this location. Would you like to resume it or create a new one?`,
          [
            {
              text: 'Resume Existing',
              onPress: () => resumeExistingCount(existingCount.apiId!),
            },
            { text: 'Create New', onPress: () => createNewCount() },
            { text: 'Cancel', style: 'cancel' },
          ]
        )
        return
      }

      // No conflicts, create new count
      await createNewCount()
    } catch (error) {
      console.error('Failed to create count:', error)

      // Show user-friendly error message
      Alert.alert(
        'Failed to Create Count',
        'Unable to create inventory count. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setIsCreating(false)
    }
  }

  const resumeExistingCount = async (apiCountId: string) => {
    try {
      const { resumeBackendSession } = useCountStore.getState()
      await resumeBackendSession(apiCountId)
      // Reset the navigation stack to replace setup with count screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'CountMain' as never }],
      })
    } catch (error) {
      console.error('Failed to resume count:', error)
      Alert.alert('Error', 'Failed to resume existing count')
    }
  }

  const createNewCount = async () => {
    const selectedLocation = getSelectedLocation()
    if (!selectedLocation) return

    // Combine selected predefined areas and custom areas
    const allAreas = [...selectedAreas, ...customAreas].map((name, index) => ({
      name,
      order: index + 1,
    }))

    // Create count session with API integration
    const { createCountSessionWithAPI } = useCountStore.getState()
    const sessionId = await createCountSessionWithAPI({
      name: countName,
      type: countType,
      status: 'IN_PROGRESS',
      locationId: selectedLocationId,
      locationName: selectedLocation.name,
      storageAreas: allAreas.map((area) => area.name),
      notes,
      completedAt: null,
      syncStatus: 'synced', // Will be set to synced after API call succeeds
    })

    // Reset the navigation stack to replace setup with count screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'CountMain' as never }],
    })
  }

  // Step rendering functions
  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return renderNameStep()
      case 'location':
        return renderLocationStep()
      case 'type':
        return renderTypeStep()
      case 'areas':
        return renderAreasStep()
      default:
        return null
    }
  }

  const renderNameStep = () => (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
      }}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}
    >
      <VStack space='xl'>
        <VStack className='items-center' space='md'>
          <Box className='size-20 bg-white/20 rounded-full justify-center items-center mb-4'>
            <Ionicons name='clipboard' size={40} color='white' />
          </Box>
          <Text className='text-white text-2xl font-bold text-center'>
            Name Your Count
          </Text>
          <Text className='text-white/80 text-center text-base leading-relaxed'>
            Give your inventory count a descriptive name to help identify it
            later
          </Text>
        </VStack>

        <VStack space='md'>
          <Text className='text-white font-semibold'>Count Name</Text>
          <TextInput
            ref={countNameInputRef}
            value={countName}
            onChangeText={setCountName}
            placeholder='Enter count name'
            placeholderTextColor='rgba(255, 255, 255, 0.5)'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: 16,
              color: 'white',
              fontSize: 16,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
            returnKeyType='next'
            // blurOnSubmit={false} // Deprecated
            onSubmitEditing={() => {
              if (canProceedFromStep()) {
                goToNextStep()
              }
            }}
            selectTextOnFocus
            clearButtonMode='while-editing'
            autoCapitalize='words'
            autoCorrect={true}
          />
        </VStack>
      </VStack>
    </ScrollView>
  )

  const renderLocationStep = () => (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
      }}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}
    >
      <VStack space='lg'>
        <VStack className='items-center' space='md'>
          <Box className='size-20 bg-white/20 rounded-full justify-center items-center mb-4'>
            <Ionicons name='location' size={40} color='white' />
          </Box>
          <Text className='text-white text-2xl font-bold text-center'>
            Select Location
          </Text>
          <Text className='text-white/80 text-center text-base leading-relaxed'>
            Choose the location where you'll be conducting the inventory count
          </Text>
        </VStack>

        <VStack space='md'>
          {locations?.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocationId(location.id)}
              className={`p-4 rounded-2xl border-2 ${
                selectedLocationId === location.id
                  ? 'bg-white/30 border-white'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <HStack className='items-center justify-between'>
                <VStack space='xs'>
                  <Text className='text-white font-semibold text-lg'>
                    {location.name}
                  </Text>
                  {(location as any).code && (
                    <Text className='text-white/70 text-sm'>
                      Code: {(location as any).code}
                    </Text>
                  )}
                </VStack>
                {selectedLocationId === location.id && (
                  <Box className='size-6 bg-white rounded-full justify-center items-center'>
                    <Ionicons name='checkmark' size={16} color='#6366F1' />
                  </Box>
                )}
              </HStack>
            </Pressable>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  )

  const renderTypeStep = () => (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
      }}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}
    >
      <VStack space='lg'>
        <VStack className='items-center' space='md'>
          <Box className='size-20 bg-white/20 rounded-full justify-center items-center mb-4'>
            <Ionicons name='list' size={40} color='white' />
          </Box>
          <Text className='text-white text-2xl font-bold text-center'>
            Count Type
          </Text>
          <Text className='text-white/80 text-center text-base leading-relaxed'>
            Choose the type of inventory count you want to perform
          </Text>
        </VStack>

        <VStack space='md'>
          <Pressable
            onPress={() => setCountType('FULL')}
            className={`p-6 rounded-2xl border-2 ${
              countType === 'FULL'
                ? 'bg-white/30 border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <HStack className='items-center justify-between'>
              <VStack className='flex-1' space='xs'>
                <Text className='text-white font-bold text-lg'>Full Count</Text>
                <Text className='text-white/70 text-sm'>
                  Count all items in selected areas for complete inventory
                  accuracy
                </Text>
              </VStack>
              {countType === 'FULL' && (
                <Box className='size-6 bg-white rounded-full justify-center items-center ml-4'>
                  <Ionicons name='checkmark' size={16} color='#6366F1' />
                </Box>
              )}
            </HStack>
          </Pressable>

          <Pressable
            onPress={() => setCountType('CYCLE')}
            className={`p-6 rounded-2xl border-2 ${
              countType === 'CYCLE'
                ? 'bg-white/30 border-white'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <HStack className='items-center justify-between'>
              <VStack className='flex-1' space='xs'>
                <Text className='text-white font-bold text-lg'>
                  Cycle Count
                </Text>
                <Text className='text-white/70 text-sm'>
                  Count specific high-value or frequently used items on a
                  regular schedule
                </Text>
              </VStack>
              {countType === 'CYCLE' && (
                <Box className='size-6 bg-white rounded-full justify-center items-center ml-4'>
                  <Ionicons name='checkmark' size={16} color='#6366F1' />
                </Box>
              )}
            </HStack>
          </Pressable>
        </VStack>
      </VStack>
    </ScrollView>
  )

  const renderAreasStep = () => (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingVertical: 32,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}
    >
      <VStack space='lg'>
        <VStack className='items-center' space='md'>
          <Box className='size-20 bg-white/20 rounded-full justify-center items-center mb-4'>
            <Ionicons name='business' size={40} color='white' />
          </Box>
          <Text className='text-white text-2xl font-bold text-center'>
            Select Areas
          </Text>
          <Text className='text-white/80 text-center text-base leading-relaxed'>
            Choose the storage areas you want to include in your count
          </Text>
        </VStack>
        <VStack space='md'>
          {/* Predefined Areas */}
          <Text className='text-white font-semibold'>Common Areas</Text>
          <VStack space='xs'>
            {PREDEFINED_AREAS.map((area) => (
              <Pressable
                key={area.name}
                onPress={() => togglePredefinedArea(area.name)}
                className={`p-4 rounded-xl border ${
                  selectedAreas.includes(area.name)
                    ? 'bg-white/30 border-white'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <HStack className='items-center justify-between'>
                  <Text className='text-white font-medium'>{area.name}</Text>
                  {selectedAreas.includes(area.name) && (
                    <Box className='size-5 bg-white rounded-full justify-center items-center'>
                      <Ionicons name='checkmark' size={12} color='#6366F1' />
                    </Box>
                  )}
                </HStack>
              </Pressable>
            ))}
          </VStack>

          {/* Custom Areas */}
          <Text className='text-white font-semibold mt-4'>Custom Areas</Text>
          <HStack space='sm'>
            <TextInput
              ref={customAreaInputRef}
              value={newAreaName}
              onChangeText={setNewAreaName}
              placeholder='Add custom area'
              placeholderTextColor='rgba(255, 255, 255, 0.5)'
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: 12,
                color: 'white',
                fontSize: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
              returnKeyType='done'
              onSubmitEditing={() => {
                if (newAreaName.trim()) {
                  addCustomArea()
                  // Small delay to refocus after state update
                  setTimeout(() => {
                    customAreaInputRef.current?.focus()
                  }, 50)
                }
              }}
              clearButtonMode='while-editing'
              autoCapitalize='words'
              autoCorrect={false}
            />
            <Pressable
              onPress={() => {
                if (newAreaName.trim()) {
                  addCustomArea()
                  setTimeout(() => {
                    customAreaInputRef.current?.focus()
                  }, 50)
                }
              }}
              className='px-4 py-3 bg-white/20 rounded-lg justify-center items-center'
            >
              <Ionicons name='add' size={16} color='white' />
            </Pressable>
          </HStack>

          {/* Custom Areas List */}
          {customAreas.map((areaName) => (
            <Pressable
              key={areaName}
              className='p-4 rounded-xl bg-white/20 border border-white/30'
            >
              <HStack className='items-center justify-between'>
                <Text className='text-white font-medium'>{areaName}</Text>
                <Pressable
                  onPress={() => removeCustomArea(areaName)}
                  className='p-1'
                >
                  <Ionicons name='close' size={16} color='white' />
                </Pressable>
              </HStack>
            </Pressable>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  )

  const getStepProgress = () => {
    if (isQuickCount) {
      const steps = ['name', 'location', 'areas']
      const currentIndex = Math.max(steps.indexOf(currentStep), 0)
      return ((currentIndex + 1) / steps.length) * 100
    } else {
      const steps = ['name', 'location', 'type', 'areas']
      const currentIndex = Math.max(steps.indexOf(currentStep), 0)
      return ((currentIndex + 1) / steps.length) * 100
    }
  }

  const canCreateCount =
    (isQuickCount || countName.trim()) &&
    selectedLocationId &&
    (selectedAreas.length > 0 || customAreas.length > 0)

  return (
    <Box style={{ height: '100%' }}>
      <KeyboardAvoidingView
        behavior={'height'}
        style={{ flex: 1, height: '100%' }}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[Colors.gradStart, Colors.gradMid, Colors.gradEnd]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header */}
          <SafeAreaView edges={['top']}>
            <HStack className='items-center justify-between p-4'>
              <Pressable
                onPress={goToPreviousStep}
                className='p-3 rounded-xl active:opacity-70'
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Ionicons name='arrow-back' size={24} color='white' />
              </Pressable>
              <VStack className='items-center' space='xs'>
                <Text className='text-white font-bold text-lg'>
                  {isQuickCount ? 'Quick Count Setup' : 'Setup Count'}
                </Text>
                <Text className='text-white/70 text-sm'>
                  Step{' '}
                  {isQuickCount
                    ? Math.max(
                        ['name', 'location', 'areas'].indexOf(currentStep) + 1,
                        1
                      )
                    : Math.max(
                        ['name', 'location', 'type', 'areas'].indexOf(
                          currentStep
                        ) + 1,
                        1
                      )}{' '}
                  of {isQuickCount ? 3 : 4}
                </Text>
              </VStack>
              <Box className='w-12' />
            </HStack>

            {/* Progress Bar */}
            <Box className='mx-4 mb-4'>
              <Box className='h-2 bg-white/20 rounded-full overflow-hidden'>
                <Box
                  className='h-full bg-white rounded-full'
                  style={{ width: `${getStepProgress()}%` }}
                />
              </Box>
            </Box>
          </SafeAreaView>

          {/* Step Content */}
          <Box className='flex-1'>{renderStepContent()}</Box>

          {/* Bottom Navigation */}
          <Box className='py-2 px-6 pb-6'>
            <HStack space='md'>
              {currentStep !== 'name' && (
                <Pressable
                  onPress={goToPreviousStep}
                  className='flex-1 py-4 px-6 bg-white/20 rounded-2xl justify-center items-center'
                >
                  <Text className='text-white font-semibold'>Previous</Text>
                </Pressable>
              )}

              <Pressable
                onPress={
                  currentStep === 'areas' ? handleCreateCount : goToNextStep
                }
                disabled={
                  !canProceedFromStep() ||
                  isCreating ||
                  (currentStep === 'areas' && !canCreateCount)
                }
                className={`flex-1 py-4 px-6 rounded-2xl justify-center items-center ${
                  canProceedFromStep() && !isCreating
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              >
                {isCreating ? (
                  <Text className='text-purple-600 font-semibold'>
                    Creating...
                  </Text>
                ) : (
                  <Text
                    className={`font-semibold ${canProceedFromStep() ? 'text-purple-600' : 'text-white/70'}`}
                  >
                    {currentStep === 'areas'
                      ? isQuickCount
                        ? 'Start Quick Count'
                        : 'Start Count'
                      : 'Next'}
                  </Text>
                )}
              </Pressable>
            </HStack>
          </Box>
        </LinearGradient>
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} className='pb-20' />
    </Box>
  )
}
