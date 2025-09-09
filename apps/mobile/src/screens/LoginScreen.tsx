import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

import { Box } from '@/components/ui/box'
import { Button, ButtonText } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { Colors } from '../constants/theme'
import { useAuthStore } from '../stores/authStore'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <LinearGradient
      colors={[Colors.gradStart, Colors.gradMid, Colors.gradEnd]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <VStack space='xl' className='items-center w-full'>
            {/* Compact Header with Logo */}
            <VStack space='md' className='items-center'>
              <Box className='w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full justify-center items-center shadow-2xl border-4 border-white/30'>
                <HappyBarLogo size={50} color='white' />
              </Box>
              <VStack space='xs' className='items-center'>
                <Text className='text-white text-3xl font-bold tracking-tight'>
                  Happy Bar
                </Text>
                <Text className='text-white/80 text-base font-medium'>
                  Smart Inventory Management
                </Text>
              </VStack>
            </VStack>

            {/* Login Form - Primary Focus */}
            <Card className='w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20'>
              <VStack space='lg' className='w-full'>
                <VStack space='xs' className='items-center'>
                  <Text className='text-white text-xl font-bold'>Sign In</Text>
                  <Text className='text-white/70 text-sm'>
                    Continue to your dashboard
                  </Text>
                </VStack>

                <VStack space='md' className='w-full'>
                  {/* Email Input */}
                  <VStack space='sm'>
                    <Text className='text-white text-sm font-medium'>
                      Email Address
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
                        className='text-white'
                        placeholderTextColor='rgba(255,255,255,0.6)'
                      />
                    </Input>
                  </VStack>

                  {/* Password Input */}
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
                        className='text-white'
                        placeholderTextColor='rgba(255,255,255,0.6)'
                      />
                      <InputSlot
                        className='pr-3'
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <InputIcon>
                          <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            color='rgba(255,255,255,0.7)'
                            size={20}
                          />
                        </InputIcon>
                      </InputSlot>
                    </Input>
                  </VStack>

                  {/* Sign In Button */}
                  <Button
                    size='lg'
                    onPress={handleLogin}
                    disabled={isLoading}
                    className='bg-white shadow-lg rounded-xl mt-2'
                  >
                    <ButtonText className='text-purple-600 font-bold text-lg'>
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </ButtonText>
                  </Button>
                </VStack>
              </VStack>
            </Card>

            {/* Minimal Feature Highlights */}
            <VStack space='md' className='w-full max-w-sm mt-4'>
              <Text className='text-white/60 text-xs text-center font-medium'>
                What you'll get:
              </Text>
              <HStack space='lg' className='justify-center'>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='scan' size={16} color='white' />
                  </Box>
                  <Text className='text-white/80 text-xs text-center font-medium'>
                    Quick Counts
                  </Text>
                </VStack>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='analytics' size={16} color='white' />
                  </Box>
                  <Text className='text-white/80 text-xs text-center font-medium'>
                    Real-time Data
                  </Text>
                </VStack>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='notifications' size={16} color='white' />
                  </Box>
                  <Text className='text-white/80 text-xs text-center font-medium'>
                    Smart Alerts
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
