import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { InputSlot } from '@/components/ui/input'
import { VStack } from '@/components/ui/vstack'
import { HappyBarLogo } from '../components/brand/HappyBarLogo'
import { PageGradient } from '../components/PageGradient'
import {
  ThemedButton,
  ThemedCard,
  ThemedHeading,
  ThemedInput,
  ThemedText,
} from '../components/themed'
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
    <PageGradient>
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
                <ThemedHeading variant='h1' align='center' color='onGradient'>
                  Happy Bar
                </ThemedHeading>
                <ThemedText
                  weight='medium'
                  align='center'
                  className='opacity-80'
                  color='onGradientMuted'
                >
                  Smart Inventory Management
                </ThemedText>
              </VStack>
            </VStack>

            {/* Login Form - Primary Focus */}
            <ThemedCard
              variant='ghost'
              size='lg'
              className='w-full max-w-sm bg-white/10 dark:bg-black/20 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-white/10'
            >
              <VStack space='lg' className='w-full'>
                <VStack space='xs' className='items-center'>
                  <ThemedHeading variant='h3' align='center' color='onGradient'>
                    Sign In
                  </ThemedHeading>
                  <ThemedText
                    variant='caption'
                    align='center'
                    color='onGradientMuted'
                  >
                    Continue to your dashboard
                  </ThemedText>
                </VStack>

                <VStack space='md' className='w-full'>
                  {/* Email Input */}
                  <ThemedInput
                    label='Email Address'
                    variant='onGradient'
                    size='md'
                    fieldProps={{
                      placeholder: 'Enter your email',
                      value: email,
                      onChangeText: setEmail,
                      keyboardType: 'email-address',
                      autoCapitalize: 'none',
                      autoCorrect: false,
                    }}
                  />

                  {/* Password Input */}
                  <ThemedInput
                    label='Password'
                    variant='onGradient'
                    size='md'
                    rightIcon={
                      <InputSlot
                        className='pr-3'
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color='rgba(255,255,255,0.7)'
                        />
                      </InputSlot>
                    }
                    fieldProps={{
                      placeholder: 'Enter your password',
                      value: password,
                      onChangeText: setPassword,
                      secureTextEntry: !showPassword,
                    }}
                  />

                  {/* Sign In Button */}
                  <ThemedButton
                    size='lg'
                    variant='outline'
                    onPress={handleLogin}
                    loading={isLoading}
                    fullWidth
                    className='bg-white dark:bg-gray-800 border-transparent shadow-lg mt-2 rounded-xl'
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </ThemedButton>
                </VStack>
              </VStack>
            </ThemedCard>

            {/* Minimal Feature Highlights */}
            <VStack space='md' className='w-full max-w-sm mt-4'>
              <ThemedText
                variant='overline'
                align='center'
                color='onGradientMuted'
              >
                What you'll get:
              </ThemedText>
              <HStack space='lg' className='justify-center'>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='scan' size={16} color='white' />
                  </Box>
                  <ThemedText
                    variant='overline'
                    align='center'
                    color='onGradientMuted'
                  >
                    Quick Counts
                  </ThemedText>
                </VStack>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='analytics' size={16} color='white' />
                  </Box>
                  <ThemedText
                    variant='overline'
                    align='center'
                    color='onGradientMuted'
                  >
                    Real-time Data
                  </ThemedText>
                </VStack>
                <VStack space='xs' className='items-center flex-1'>
                  <Box className='w-8 h-8 bg-white/20 rounded-full justify-center items-center'>
                    <Ionicons name='notifications' size={16} color='white' />
                  </Box>
                  <ThemedText
                    variant='overline'
                    align='center'
                    color='onGradientMuted'
                  >
                    Smart Alerts
                  </ThemedText>
                </VStack>
              </HStack>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageGradient>
  )
}
