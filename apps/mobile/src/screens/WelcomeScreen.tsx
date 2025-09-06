import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ScrollView, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Center } from '@/components/ui/center'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Pressable } from '@/components/ui/pressable'

import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { AuthStackParamList } from '../navigation/AuthNavigator'

const { height } = Dimensions.get('window')

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <Box className="flex-1 p-6" style={{ minHeight: height }}>
          <Center className="flex-1">
            <VStack space="2xl" className="items-center w-full">
              
              {/* Logo Section */}
              <VStack space="lg" className="items-center mt-16">
                <Box className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full justify-center items-center shadow-2xl border-4 border-white/30">
                  <HappyBarLogo size={80} color="white" />
                </Box>
                <VStack space="sm" className="items-center">
                  <Text className="text-white text-5xl font-bold tracking-tight">
                    Happy Bar
                  </Text>
                  <Text className="text-white/90 text-xl font-medium text-center">
                    Smart Inventory Management
                  </Text>
                </VStack>
              </VStack>

              {/* Features Section */}
              <VStack space="md" className="w-full">
                <FeatureItem
                  icon="analytics"
                  title="Real-time Analytics"
                  description="Track inventory levels and costs instantly"
                />
                <FeatureItem
                  icon="scan"
                  title="Quick Barcode Scanning" 
                  description="Count inventory 5x faster with AI"
                />
                <FeatureItem
                  icon="trending-up"
                  title="Smart Predictions"
                  description="Never run out with intelligent forecasting"
                />
              </VStack>

              {/* Call to Action */}
              <VStack space="md" className="w-full mt-8">
                <Button
                  size="xl"
                  variant="solid"
                  onPress={() => navigation.navigate('Login')}
                  className="bg-white shadow-2xl rounded-2xl"
                >
                  <ButtonText className="text-indigo-600 font-bold text-lg">
                    Get Started
                  </ButtonText>
                </Button>

                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  className="p-4"
                >
                  <Text className="text-white/90 text-center text-base font-medium underline">
                    Already have an account? Sign In
                  </Text>
                </Pressable>
              </VStack>

              {/* Footer */}
              <Text className="text-white/60 text-sm text-center mt-4">
                © 2024 Happy Bar. All rights reserved.
              </Text>
              
            </VStack>
          </Center>
        </Box>
      </ScrollView>
    </LinearGradient>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}) {
  return (
    <HStack space="md" className="items-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
      <Box className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
        <Ionicons name={icon} size={20} color="white" />
      </Box>
      <VStack space="xs" className="flex-1">
        <Text className="text-white text-base font-semibold">
          {title}
        </Text>
        <Text className="text-white/80 text-sm">
          {description}
        </Text>
      </VStack>
    </HStack>
  )
}

