import { Box } from '@/components/ui/box'
import { Heading } from '@/components/ui/heading'
import { HStack } from '@/components/ui/hstack'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Design system colors - matching count screens
const colors = {
  primary: '#6366F1', // Primary indigo
  accent: '#8B5CF6', // Accent purple
  success: '#10B981', // Success green
  warning: '#F59E0B', // Warning amber
  error: '#EF4444', // Error red
  primaryLight: '#EEF2FF',
  accentLight: '#F3E8FF',
  successLight: '#ECFDF5',
}

export function InsightsScreen() {
  const insightCards = [
    {
      title: 'Sales Analytics',
      description: 'Track your best performing products',
      icon: 'analytics',
      color: colors.primary,
      bgColor: colors.primaryLight,
      metrics: '↗ 12% this month',
    },
    {
      title: 'Inventory Trends',
      description: 'Monitor stock levels and patterns',
      icon: 'trending-up',
      color: colors.success,
      bgColor: colors.successLight,
      metrics: '5 items need reorder',
    },
    {
      title: 'Cost Analysis',
      description: 'Optimize your purchasing decisions',
      icon: 'calculator',
      color: colors.accent,
      bgColor: colors.accentLight,
      metrics: '8% cost savings',
    },
    {
      title: 'Waste Tracking',
      description: 'Reduce waste and improve efficiency',
      icon: 'leaf',
      color: colors.warning,
      bgColor: '#FEF3C7',
      metrics: '2.1% waste rate',
    },
  ]

  const quickStats = [
    {
      label: 'Total Products',
      value: '248',
      icon: 'cube',
      color: colors.primary,
    },
    {
      label: 'Low Stock Items',
      value: '12',
      icon: 'warning',
      color: colors.warning,
    },
    {
      label: 'This Month Sales',
      value: '$14.2k',
      icon: 'trending-up',
      color: colors.success,
    },
  ]

  return (
    <LinearGradient
      colors={[colors.primary, colors.accent, '#A855F7']}
      style={{ flex: 1, paddingBottom: 24 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <HStack className='items-center justify-between p-4'>
          <Heading size='xl' className='text-white font-bold'>
            Insights
          </Heading>
          <Pressable
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Ionicons name='refresh' size={24} color='white' />
          </Pressable>
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
          {/* Quick Stats */}
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
            <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
                <Ionicons name='speedometer' size={16} color={colors.primary} />
              </Box>
              <Heading size='lg' className='text-gray-900 font-bold'>
                Quick Stats
              </Heading>
            </HStack>

            <VStack style={{ gap: 12 }}>
              {quickStats.map((stat, index) => (
                <HStack
                  key={index}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <HStack style={{ alignItems: 'center', gap: 12 }}>
                    <Box
                      style={{
                        backgroundColor: stat.color + '20',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name={stat.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={stat.color}
                      />
                    </Box>
                    <Text className='text-gray-700 font-medium'>
                      {stat.label}
                    </Text>
                  </HStack>
                  <Text
                    className='font-bold text-lg'
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </LinearGradient>

          {/* AI-Powered Insights */}
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
            <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <LinearGradient
                colors={[colors.accent, colors.accent + 'DD']}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name='sparkles' size={16} color='white' />
              </LinearGradient>
              <Heading size='lg' className='text-gray-900 font-bold'>
                AI Recommendations
              </Heading>
            </HStack>

            <VStack style={{ gap: 12 }}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.2)',
                }}
              >
                <HStack
                  style={{ alignItems: 'center', gap: 12, marginBottom: 8 }}
                >
                  <Ionicons name='bulb' size={18} color={colors.success} />
                  <Text className='font-semibold text-gray-900'>
                    Optimize Ordering
                  </Text>
                </HStack>
                <Text className='text-gray-600 text-sm leading-5'>
                  Consider increasing order quantity for Premium Vodka by 15%
                  based on recent sales trends.
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(251, 191, 36, 0.1)', 'rgba(251, 191, 36, 0.05)']}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                }}
              >
                <HStack
                  style={{ alignItems: 'center', gap: 12, marginBottom: 8 }}
                >
                  <Ionicons name='warning' size={18} color={colors.warning} />
                  <Text className='font-semibold text-gray-900'>
                    Restock Alert
                  </Text>
                </HStack>
                <Text className='text-gray-600 text-sm leading-5'>
                  3 high-demand items are approaching minimum stock levels.
                  Schedule reorder soon.
                </Text>
              </LinearGradient>
            </VStack>
          </LinearGradient>

          {/* Analytics Cards */}
          <VStack style={{ gap: 16 }}>
            <Heading
              size='lg'
              className='text-white font-bold'
              style={{ marginLeft: 4 }}
            >
              Analytics Dashboard
            </Heading>

            <VStack style={{ gap: 12 }}>
              {insightCards.map((card, index) => (
                <Pressable key={index}>
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.95)',
                      'rgba(255, 255, 255, 0.9)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 16,
                      padding: 20,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 3,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <HStack
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <HStack
                        style={{ alignItems: 'center', gap: 16, flex: 1 }}
                      >
                        <LinearGradient
                          colors={[card.color, card.color + 'E6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: card.color,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 3,
                          }}
                        >
                          <Ionicons
                            name={card.icon as keyof typeof Ionicons.glyphMap}
                            size={22}
                            color='white'
                          />
                        </LinearGradient>

                        <VStack className='flex-1'>
                          <Heading
                            size='sm'
                            className='text-gray-900 font-semibold'
                          >
                            {card.title}
                          </Heading>
                          <Text
                            className='text-gray-600 text-sm'
                            style={{ marginTop: 2 }}
                          >
                            {card.description}
                          </Text>
                          <Text
                            className='text-gray-500 text-xs font-medium'
                            style={{ marginTop: 4 }}
                          >
                            {card.metrics}
                          </Text>
                        </VStack>
                      </HStack>

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
              ))}
            </VStack>
          </VStack>

          {/* Coming Soon */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
            style={{
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Box
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name='construct' size={28} color='white' />
            </Box>
            <Heading size='lg' className='text-white font-bold text-center'>
              More Insights Coming Soon
            </Heading>
            <Text
              className='text-white/80 text-center'
              style={{ marginTop: 8 }}
            >
              Advanced analytics, predictive insights, and custom reports are in
              development.
            </Text>
          </LinearGradient>
        </VStack>
      </ScrollView>
    </LinearGradient>
  )
}
