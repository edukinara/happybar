import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Center } from '@/components/ui/center'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { useAuthStore } from '../stores/authStore'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

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
      colors={['#8B5CF6', '#A855F7', '#C084FC']}
      className='flex-1'
    >
      <Box className='flex-1 justify-center items-center p-6'>
        <Center className='flex-1 w-full'>
          <VStack space='xl' className='items-center w-full'>
            {/* Logo and Header */}
            <VStack space='md' className='items-center'>
              <Box className='w-20 h-20 bg-white rounded-full justify-center items-center shadow-lg'>
                <Ionicons name='wine' size={40} color='#8B5CF6' />
              </Box>
              <VStack space='xs' className='items-center'>
                <Text className='text-white text-3xl font-bold'>Happy Bar</Text>
                <Text className='text-white/90 text-lg'>
                  Inventory Management
                </Text>
              </VStack>
            </VStack>

            {/* Login Form */}
            <Card className='w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl'>
              <VStack space='lg' className='w-full'>
                <VStack space='xs' className='items-center'>
                  <Text className='text-typography-900 text-xl font-bold'>
                    Welcome Back
                  </Text>
                  <Text className='text-typography-500 text-base'>
                    Sign in to continue
                  </Text>
                </VStack>

                <VStack space='md' className='w-full'>
                  <VStack space='sm'>
                    <Text className='text-typography-700 text-sm font-medium'>
                      Email
                    </Text>
                    <Input
                      variant='outline'
                      size='md'
                      className='bg-background-50'
                    >
                      <InputField
                        placeholder='Enter your email'
                        value={email}
                        onChangeText={setEmail}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        autoCorrect={false}
                      />
                    </Input>
                  </VStack>

                  <VStack space='sm'>
                    <Text className='text-typography-700 text-sm font-medium'>
                      Password
                    </Text>
                    <Input
                      variant='outline'
                      size='md'
                      className='bg-background-50'
                    >
                      <InputField
                        placeholder='Enter your password'
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                    </Input>
                  </VStack>

                  <HStack className='justify-between items-center'>
                    <Text className='text-typography-500 text-sm'>
                      Remember me
                    </Text>
                    <Text className='text-primary-500 text-sm font-medium'>
                      Forgot Password?
                    </Text>
                  </HStack>

                  <Button
                    size='lg'
                    variant='solid'
                    action='primary'
                    onPress={handleLogin}
                    isDisabled={isLoading}
                    className='bg-primary-500'
                  >
                    <ButtonText className='text-white font-semibold'>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </ButtonText>
                  </Button>

                  <HStack className='items-center'>
                    <Box className='flex-1 h-0.5 bg-outline-200' />
                    <Text className='text-typography-400 text-sm mx-3'>or</Text>
                    <Box className='flex-1 h-0.5 bg-outline-200' />
                  </HStack>

                  <Button
                    size='lg'
                    variant='outline'
                    action='secondary'
                    onPress={handleGoogleLogin}
                    className='border-outline-300'
                  >
                    <HStack space='sm' className='items-center'>
                      <Ionicons name='logo-google' size={20} color='#374151' />
                      <ButtonText className='text-typography-700 font-medium'>
                        Continue with Google
                      </ButtonText>
                    </HStack>
                  </Button>
                </VStack>
              </VStack>
            </Card>

            {/* Footer */}
            <VStack space='xs' className='items-center'>
              <Text className='text-white/80 text-sm'>
                Don't have an account?
              </Text>
              <Text className='text-white font-bold text-sm underline'>
                Contact your administrator
              </Text>
            </VStack>
          </VStack>
        </Center>
      </Box>
    </LinearGradient>
  )
}
