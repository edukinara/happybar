import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { Pressable } from '@/components/ui/pressable'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PageGradient } from '../components/PageGradient'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
import { useLocations } from '../hooks/useInventoryData'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useCountStore } from '../stores/countStore'

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
  const insets = useSafeAreaInsets()

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
  // const [showLocationModal, setShowLocationModal] = useState(false) // setShowLocationModal not used
  const [isCreating, setIsCreating] = useState(false)

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
    await createCountSessionWithAPI({
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
          <ThemedHeading
            variant='h2'
            color='onGradient'
            weight='bold'
            align='center'
          >
            Name Your Count
          </ThemedHeading>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            style={{ lineHeight: 24 }}
          >
            Give your inventory count a descriptive name to help identify it
            later
          </ThemedText>
        </VStack>

        <VStack space='md'>
          <ThemedText variant='body' color='onGradient' weight='semibold'>
            Count Name
          </ThemedText>
          <ThemedInput
            variant='filled'
            size='lg'
            fieldProps={{
              value: countName,
              onChangeText: setCountName,
              placeholder: 'Enter count name',
              returnKeyType: 'next',
              onSubmitEditing: () => {
                if (canProceedFromStep()) {
                  goToNextStep()
                }
              },
              selectTextOnFocus: true,
              clearButtonMode: 'while-editing',
              autoCapitalize: 'words',
              autoCorrect: true,
              autoFocus: true,
            }}
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
          <ThemedHeading
            variant='h2'
            color='onGradient'
            weight='bold'
            align='center'
          >
            Select Location
          </ThemedHeading>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            style={{ lineHeight: 24 }}
          >
            Choose the location where you'll be conducting the inventory count
          </ThemedText>
        </VStack>

        <VStack space='md'>
          {locations?.map((location) => (
            <ThemedCard
              key={location.id}
              variant='primary'
              size='md'
              className={
                selectedLocationId === location.id
                  ? 'border-2 border-white/80'
                  : ''
              }
            >
              <Pressable onPress={() => setSelectedLocationId(location.id)}>
                <HStack className='items-center justify-between'>
                  <VStack space='xs'>
                    <ThemedText variant='h4' color='primary' weight='semibold'>
                      {location.name}
                    </ThemedText>
                    {(location as any).code && (
                      <ThemedText variant='caption' color='muted'>
                        Code: {(location as any).code}
                      </ThemedText>
                    )}
                  </VStack>
                  {selectedLocationId === location.id && (
                    <Box className='size-6 bg-purple-500 rounded-full justify-center items-center'>
                      <Ionicons name='checkmark' size={16} color='white' />
                    </Box>
                  )}
                </HStack>
              </Pressable>
            </ThemedCard>
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
          <ThemedHeading
            variant='h2'
            color='onGradient'
            weight='bold'
            align='center'
          >
            Count Type
          </ThemedHeading>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            style={{ lineHeight: 24 }}
          >
            Choose the type of inventory count you want to perform
          </ThemedText>
        </VStack>

        <VStack space='md'>
          <ThemedCard
            variant='primary'
            size='lg'
            className={countType === 'FULL' ? 'border-2 border-white/80' : ''}
          >
            <Pressable onPress={() => setCountType('FULL')}>
              <HStack className='items-center justify-between'>
                <VStack className='flex-1' space='xs'>
                  <ThemedText variant='h4' color='primary' weight='bold'>
                    Full Count
                  </ThemedText>
                  <ThemedText variant='caption' color='muted'>
                    Count all items in selected areas for complete inventory
                    accuracy
                  </ThemedText>
                </VStack>
                {countType === 'FULL' && (
                  <Box className='size-6 bg-purple-500 rounded-full justify-center items-center ml-4'>
                    <Ionicons name='checkmark' size={16} color='white' />
                  </Box>
                )}
              </HStack>
            </Pressable>
          </ThemedCard>

          <ThemedCard
            variant='primary'
            size='lg'
            className={countType === 'CYCLE' ? 'border-2 border-white/80' : ''}
          >
            <Pressable onPress={() => setCountType('CYCLE')}>
              <HStack className='items-center justify-between'>
                <VStack className='flex-1' space='xs'>
                  <ThemedText variant='h4' color='primary' weight='bold'>
                    Cycle Count
                  </ThemedText>
                  <ThemedText variant='caption' color='muted'>
                    Count specific high-value or frequently used items on a
                    regular schedule
                  </ThemedText>
                </VStack>
                {countType === 'CYCLE' && (
                  <Box className='size-6 bg-purple-500 rounded-full justify-center items-center ml-4'>
                    <Ionicons name='checkmark' size={16} color='white' />
                  </Box>
                )}
              </HStack>
            </Pressable>
          </ThemedCard>
        </VStack>
      </VStack>
    </ScrollView>
  )

  const renderAreasStep = () => (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 12,
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
          <ThemedHeading
            variant='h2'
            color='onGradient'
            weight='bold'
            align='center'
          >
            Select Areas
          </ThemedHeading>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            style={{ lineHeight: 24 }}
          >
            Choose the storage areas you want to include in your count
          </ThemedText>
        </VStack>
        <VStack space='md'>
          {/* Predefined Areas */}
          <ThemedText variant='body' color='onGradient' weight='semibold'>
            Common Areas
          </ThemedText>
          <VStack space='xs'>
            {PREDEFINED_AREAS.map((area) => (
              <ThemedCard
                key={area.name}
                variant='primary'
                size='sm'
                className={
                  selectedAreas.includes(area.name)
                    ? 'border-2 border-white/80'
                    : ''
                }
              >
                <Pressable onPress={() => togglePredefinedArea(area.name)}>
                  <HStack className='items-center justify-between'>
                    <ThemedText variant='body' color='primary' weight='medium'>
                      {area.name}
                    </ThemedText>
                    {selectedAreas.includes(area.name) && (
                      <Box className='size-5 bg-purple-500 rounded-full justify-center items-center'>
                        <Ionicons name='checkmark' size={12} color='white' />
                      </Box>
                    )}
                  </HStack>
                </Pressable>
              </ThemedCard>
            ))}
          </VStack>

          {/* Custom Areas */}
          <ThemedText
            variant='body'
            color='onGradient'
            weight='semibold'
            style={{ marginTop: 16 }}
          >
            Custom Areas
          </ThemedText>
          <HStack space='sm' className='items-center'>
            <Box className='flex flex-1 items-center'>
              <ThemedInput
                variant='filled'
                size='md'
                fieldProps={{
                  value: newAreaName,
                  onChangeText: setNewAreaName,
                  placeholder: 'Add custom area',
                  returnKeyType: 'done',
                  onSubmitEditing: () => {
                    if (newAreaName.trim()) {
                      addCustomArea()
                    }
                  },
                  clearButtonMode: 'while-editing',
                  autoCapitalize: 'words',
                  autoCorrect: false,
                }}
              />
            </Box>
            <ThemedButton
              variant='primary'
              size='md'
              onPress={() => {
                if (newAreaName.trim()) {
                  addCustomArea()
                }
              }}
              className='bg-white/20 dark:bg-white/20 px-4 min-w-16'
            >
              <Ionicons name='add' size={16} color='white' />
            </ThemedButton>
          </HStack>

          {/* Custom Areas List */}
          {customAreas.map((areaName) => (
            <ThemedCard
              key={areaName}
              variant='primary'
              size='sm'
              className='border-white/30'
            >
              <HStack className='items-center justify-between'>
                <ThemedText variant='body' color='primary' weight='medium'>
                  {areaName}
                </ThemedText>
                <Pressable
                  onPress={() => removeCustomArea(areaName)}
                  className='p-1'
                >
                  <Ionicons name='close' size={16} color='#9CA3AF' />
                </Pressable>
              </HStack>
            </ThemedCard>
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
    <PageGradient>
      {/* Header */}
      <Box className='p-0 flex flex-1 overflow-hidden'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Box
            className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
            style={{ paddingTop: insets.top + 4 }}
          >
            <HStack className='justify-between items-center p-2'>
              <HStack space='md' className='items-center'>
                <Pressable className='mr-4' onPress={goToPreviousStep}>
                  <Ionicons name='arrow-back' size={24} color='white' />
                </Pressable>
                <VStack>
                  <ThemedHeading variant='h2' color='onGradient' weight='bold'>
                    {isQuickCount ? 'Quick Count Setup' : 'Setup Count'}
                  </ThemedHeading>
                  <ThemedText variant='caption' color='onGradientMuted'>
                    Step{' '}
                    {isQuickCount
                      ? Math.max(
                          ['name', 'location', 'areas'].indexOf(currentStep) +
                            1,
                          1
                        )
                      : Math.max(
                          ['name', 'location', 'type', 'areas'].indexOf(
                            currentStep
                          ) + 1,
                          1
                        )}{' '}
                    of {isQuickCount ? 3 : 4}
                  </ThemedText>
                </VStack>
              </HStack>
            </HStack>

            {/* Progress Bar */}
            <Box className='mx-4 mt-2'>
              <Box className='h-2 bg-white/20 rounded-full overflow-hidden'>
                <Box
                  className='h-full bg-white rounded-full'
                  style={{ width: `${getStepProgress()}%` }}
                />
              </Box>
            </Box>
          </Box>

          {/* Step Content */}
          <Box className='flex-1'>{renderStepContent()}</Box>

          {/* Bottom Navigation */}
          <Box className='py-2 px-6 pb-6'>
            <HStack space='md'>
              {currentStep !== 'name' && (
                <ThemedButton
                  variant='outline'
                  size='lg'
                  onPress={goToPreviousStep}
                  className='flex-1 bg-white/20 dark:bg-white/20 border-transparent'
                >
                  <ThemedText
                    variant='body'
                    color='onGradient'
                    weight='semibold'
                  >
                    Previous
                  </ThemedText>
                </ThemedButton>
              )}

              <ThemedButton
                variant='warning'
                size='lg'
                onPress={
                  currentStep === 'areas' ? handleCreateCount : goToNextStep
                }
                disabled={
                  !canProceedFromStep() ||
                  isCreating ||
                  (currentStep === 'areas' && !canCreateCount)
                }
                className={`flex-1 ${
                  canProceedFromStep() && !isCreating
                    ? ''
                    : 'opacity-40 border-transparent'
                }`}
              >
                {isCreating ? (
                  <ThemedText
                    variant='body'
                    color='onGradient'
                    weight='semibold'
                  >
                    Creating...
                  </ThemedText>
                ) : (
                  <ThemedText
                    variant='body'
                    color={
                      canProceedFromStep() ? 'onGradient' : 'onGradientMuted'
                    }
                    weight='semibold'
                  >
                    {currentStep === 'areas'
                      ? isQuickCount
                        ? 'Start Quick Count'
                        : 'Start Count'
                      : 'Next'}
                  </ThemedText>
                )}
              </ThemedButton>
            </HStack>
          </Box>
        </KeyboardAvoidingView>
      </Box>
    </PageGradient>
  )
}
