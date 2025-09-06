import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable, ScrollView, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

// Design system colors - matching web app theme
const colors = {
  primary: '#6366F1',    // Primary indigo
  accent: '#8B5CF6',     // Accent purple  
  success: '#10B981',    // Success green
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
}

const countTypes = [
  {
    id: 'FULL',
    title: 'Full Count',
    description: 'Complete inventory count of all items',
    icon: 'clipboard' as keyof typeof Ionicons.glyphMap,
    iconColor: colors.primary,
    bgColor: colors.primaryLight,
  },
  {
    id: 'SPOT',
    title: 'Spot Check',
    description: 'Quick count of specific high-value items',
    icon: 'search' as keyof typeof Ionicons.glyphMap,
    iconColor: colors.accent,
    bgColor: colors.accentLight,
  },
  {
    id: 'CYCLE',
    title: 'Cycle Count',
    description: 'Rotating count of different areas over time',
    icon: 'refresh' as keyof typeof Ionicons.glyphMap,
    iconColor: colors.primary,
    bgColor: colors.primaryLight,
  },
]

export default function CountTypeScreen() {
  const navigation = useNavigation()

  const handleSelectType = (countType: string) => {
    // Navigate to count setup screen with selected type
    ;(navigation.navigate as any)('CountSetup', { countType })
  }

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={{ flex: 1 }}
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
            New Count
          </Heading>
          <Box className='w-12' />
        </HStack>
      </SafeAreaView>

      <ScrollView 
        className='flex-1'
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <VStack className='space-y-3 mb-8'>
          <Heading size='2xl' className='text-white font-bold text-center'>
            Select Count Type
          </Heading>
          <Text className='text-white/80 text-center text-lg'>
            Choose the type of inventory count you want to perform
          </Text>
        </VStack>

        {/* Count Type Options */}
        <VStack style={{ gap: 16 }}>
          {countTypes.map((type, index) => {
            return (
              <Pressable
                key={type.id}
                onPress={() => handleSelectType(type.id)}
                className='active:opacity-90'
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    borderRadius: 20,
                    padding: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  <HStack style={{ alignItems: 'center', gap: 16 }}>
                    {/* Icon */}
                    <LinearGradient
                      colors={[type.iconColor, type.iconColor + 'E6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: type.iconColor,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      <Ionicons
                        name={type.icon}
                        size={18}
                        color='white'
                      />
                    </LinearGradient>

                    {/* Content */}
                    <VStack className='flex-1'>
                      <Heading size='lg' className='text-gray-900 font-semibold'>
                        {type.title}
                      </Heading>
                      <Text className='text-gray-600 text-sm leading-5' style={{ marginTop: 2 }}>
                        {type.description}
                      </Text>
                    </VStack>

                    {/* Arrow */}
                    <Box
                      style={{
                        backgroundColor: 'rgba(156, 163, 175, 0.12)',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name='chevron-forward'
                        size={16}
                        color='#9CA3AF'
                      />
                    </Box>
                  </HStack>
                </LinearGradient>
              </Pressable>
            )
          })}
        </VStack>

        {/* Info Section */}
        <Box
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: 20,
            marginTop: 32,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <VStack className='space-y-4'>
            <Heading size='lg' className='text-white font-bold text-center'>
              What's Next?
            </Heading>
            <VStack className='space-y-4'>
              <HStack className='items-center space-x-4'>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text className='text-white text-sm font-bold'>1</Text>
                </LinearGradient>
                <Text className='flex-1 text-white/90 text-base'>
                  Configure count areas and storage locations
                </Text>
              </HStack>
              <HStack className='items-center space-x-4'>
                <LinearGradient
                  colors={['#10B981', '#047857']}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text className='text-white text-sm font-bold'>2</Text>
                </LinearGradient>
                <Text className='flex-1 text-white/90 text-base'>
                  Begin counting items using scanning
                </Text>
              </HStack>
              <HStack className='items-center space-x-4'>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text className='text-white text-sm font-bold'>3</Text>
                </LinearGradient>
                <Text className='flex-1 text-white/90 text-base'>
                  Review results and save progress
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        {/* Quick Count Option */}
        <LinearGradient
          colors={[colors.accent + 'E6', colors.accent + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            padding: 20,
            marginTop: 20,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <VStack className='space-y-4'>
            <HStack className='items-center space-x-3'>
              <Ionicons name='flash' size={24} color='white' />
              <Heading size='lg' className='text-white font-bold'>
                Quick Count
              </Heading>
            </HStack>
            <Text className='text-white/90 text-base leading-6'>
              Need to count just one item? Use the quick scan feature from the home screen.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Scan' as never)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 12,
                alignSelf: 'flex-start',
              }}
            >
              <HStack className='items-center space-x-2'>
                <Ionicons name='scan' size={16} color={colors.accent} />
                <Text className='font-semibold' style={{ color: colors.accent }}>Quick Scan</Text>
              </HStack>
            </Pressable>
          </VStack>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  )
}
