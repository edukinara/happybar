import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { Dimensions, ScrollView } from 'react-native'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Center } from '@/components/ui/center'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'

import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { AuthStackParamList } from '../navigation/AuthNavigator'

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>

export function WelcomeScreen() {
  console.log('🎉 WelcomeScreen rendering!')
  const navigation = useNavigation<NavigationProp>()

  // Get dimensions inside component (not at top level - this was the iOS issue!)
  const { height } = Dimensions.get('window')

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: height,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Center style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 48 }}>
          <VStack space='xl' className='items-center w-full'>
            {/* Logo Section */}
            <VStack space='lg' className='items-center'>
              <Box className='mb-4'>
                <HappyBarLogo size={120} />
              </Box>

              <VStack space='sm' className='items-center'>
                <Text className='text-white text-4xl font-bold text-center tracking-tight'>
                  Happy Bar
                </Text>
                <Text className='text-white/90 text-xl font-medium text-center'>
                  Smart Inventory Management
                </Text>
              </VStack>
            </VStack>

            {/* Feature Highlights */}
            <VStack space='md' className='w-full'>
              {[
                {
                  icon: 'analytics' as keyof typeof Ionicons.glyphMap,
                  title: 'Real-time Analytics',
                  description: 'Track inventory levels and trends instantly',
                },
                {
                  icon: 'scan' as keyof typeof Ionicons.glyphMap,
                  title: 'Quick Barcode Scanning',
                  description: 'Fast and accurate inventory counts',
                },
                {
                  icon: 'notifications' as keyof typeof Ionicons.glyphMap,
                  title: 'Smart Alerts',
                  description: 'Never run out of stock again',
                },
              ].map((feature, index) => (
                <Box
                  key={index}
                  className='bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20'
                >
                  <HStack space='md' className='items-center'>
                    <Box className='bg-white/20 p-3 rounded-xl'>
                      <Ionicons name={feature.icon} size={24} color='white' />
                    </Box>
                    <VStack className='flex-1' space='xs'>
                      <Text className='text-white font-semibold text-lg'>
                        {feature.title}
                      </Text>
                      <Text className='text-white/80 text-sm leading-5'>
                        {feature.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* Call to Action */}
            <VStack space='md' className='w-full mt-8'>
              <Button
                size='xl'
                variant='solid'
                onPress={() => {
                  navigation.navigate('Login')
                }}
                className='bg-white shadow-2xl rounded-2xl'
              >
                <ButtonText className='text-indigo-600 font-bold text-lg'>
                  Sign In
                </ButtonText>
              </Button>
            </VStack>
          </VStack>
        </Center>
      </ScrollView>
    </LinearGradient>
  )
}
