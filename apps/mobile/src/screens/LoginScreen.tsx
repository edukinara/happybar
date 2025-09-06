import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useRef, useState } from 'react'
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { useAuthStore } from '../stores/authStore'

const { height } = Dimensions.get('window')

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const scrollViewRef = useRef<ScrollView>(null)

  const scrollToInput = (inputPosition: 'email' | 'password') => {
    // Only scroll if we're on a smaller screen or if it's the password field
    const shouldScroll = height < 700 || inputPosition === 'password'

    if (shouldScroll) {
      setTimeout(() => {
        const scrollOffset = inputPosition === 'email' ? 20 : 40
        scrollViewRef.current?.scrollTo({
          y: scrollOffset,
          animated: true,
        })
      }, 150)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
    } catch (error: any) {
      alert(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    alert('Google login coming soon!')
  }

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      className='flex-1'
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior='padding'
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        className='flex-1'
        enabled
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          bounces={false}
          className='flex-1'
        >
          <VStack space='lg' className='items-center w-full'>
            {/* Logo and Header */}
            <VStack space='md' className='items-center'>
              <Box className='w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full justify-center items-center shadow-2xl border-4 border-white/30'>
                <HappyBarLogo size={60} color='white' />
              </Box>
              <VStack space='xs' className='items-center'>
                <Text className='text-white text-3xl font-bold tracking-tight'>
                  Happy Bar
                </Text>
                <Text className='text-white/90 text-lg font-medium'>
                  Inventory Management
                </Text>
              </VStack>
            </VStack>

            {/* Login Form */}
            <Card className='w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/20'>
              <VStack space='md' className='w-full'>
                <VStack space='xs' className='items-center'>
                  <Text className='text-white text-xl font-bold'>
                    Welcome Back
                  </Text>
                  <Text className='text-white/80 text-base'>
                    Sign in to continue
                  </Text>
                </VStack>

                <VStack space='md' className='w-full'>
                  <VStack space='sm'>
                    <Text className='text-white text-sm font-medium'>
                      Email
                    </Text>
                    <Input
                      variant='outline'
                      size='md'
                      className='bg-white/20 border-white/30'
                    >
                      <InputField
                        placeholder='Enter your email'
                        value={email}
                        onChangeText={setEmail}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        autoCorrect={false}
                        className='text-white placeholder:text-white/60'
                        onFocus={() => scrollToInput('email')}
                      />
                    </Input>
                  </VStack>

                  <VStack space='sm'>
                    <Text className='text-white text-sm font-medium'>
                      Password
                    </Text>
                    <Input
                      variant='outline'
                      size='md'
                      className='bg-white/20 border-white/30'
                    >
                      <InputField
                        placeholder='Enter your password'
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        className='text-white placeholder:text-white/60'
                        onFocus={() => scrollToInput('password')}
                      />
                      <InputSlot
                        className='pr-3'
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <InputIcon>
                          <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color='rgba(255,255,255,0.7)'
                          />
                        </InputIcon>
                      </InputSlot>
                    </Input>
                  </VStack>

                  <HStack className='justify-between items-center'>
                    <Text className='text-white/70 text-sm'>Remember me</Text>
                    <Text className='text-white text-sm font-medium underline'>
                      Forgot Password?
                    </Text>
                  </HStack>

                  <Button
                    size='lg'
                    variant='solid'
                    action='primary'
                    onPress={handleLogin}
                    isDisabled={isLoading}
                    className='bg-white rounded-xl shadow-2xl'
                  >
                    <ButtonText className='text-indigo-600 font-bold text-base'>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </ButtonText>
                  </Button>

                  <HStack className='items-center'>
                    <Box className='flex-1 h-0.5 bg-white/30' />
                    <Text className='text-white/70 text-sm mx-3'>or</Text>
                    <Box className='flex-1 h-0.5 bg-white/30' />
                  </HStack>

                  <Button
                    size='lg'
                    variant='outline'
                    action='secondary'
                    onPress={handleGoogleLogin}
                    className='border-white/30 bg-white/10'
                  >
                    <HStack space='sm' className='items-center'>
                      <Ionicons name='logo-google' size={20} color='white' />
                      <ButtonText className='text-white font-medium'>
                        Continue with Google
                      </ButtonText>
                    </HStack>
                  </Button>
                </VStack>
              </VStack>
            </Card>

            {/* Footer */}
            <VStack space='xs' className='items-center'>
              <Text className='text-white/70 text-sm'>
                Don't have an account?
              </Text>
              <Text className='text-white font-bold text-sm underline'>
                Contact your administrator
              </Text>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
