import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Box } from '@/components/ui/box'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { PageGradient } from '../components/PageGradient'
import { ThemedCard, ThemedHeading, ThemedText } from '../components/themed'
import { Colors } from '../constants/theme'

export function InsightsScreen() {
  const insets = useSafeAreaInsets()
  const insightCards = [
    {
      title: 'Sales Analytics',
      description: 'Track your best performing products',
      icon: 'analytics',
      color: '#6366F1',
      bgColor: '#EEF2FF',
      metrics: '↗ 12% this month',
    },
    {
      title: 'Inventory Trends',
      description: 'Monitor stock levels and patterns',
      icon: 'trending-up',
      color: Colors.success,
      bgColor: '#ECFDF5',
      metrics: '5 items need reorder',
    },
    {
      title: 'Cost Analysis',
      description: 'Optimize your purchasing decisions',
      icon: 'calculator',
      color: Colors.primary,
      bgColor: '#F3E8FF',
      metrics: '8% cost savings',
    },
    {
      title: 'Waste Tracking',
      description: 'Reduce waste and improve efficiency',
      icon: 'leaf',
      color: Colors.warning,
      bgColor: '#FEF3C7',
      metrics: '2.1% waste rate',
    },
  ]

  const quickStats = [
    {
      label: 'Total Products',
      value: '248',
      icon: 'cube',
      color: Colors.primary,
    },
    {
      label: 'Low Stock Items',
      value: '12',
      icon: 'warning',
      color: Colors.warning,
    },
    {
      label: 'This Month Sales',
      value: '$14.2k',
      icon: 'trending-up',
      color: Colors.success,
    },
  ]

  return (
    <PageGradient>
      <StatusBar style='light' />

      {/* Header */}
      <Box
        className='px-5 pb-2 mb-2 bg-white/5 backdrop-blur-xl border-b border-white/10'
        style={{ paddingTop: insets.top + 4 }}
      >
        <HStack className='justify-between items-center p-2'>
          <ThemedHeading variant='h2' color='onGradient' weight='bold'>
            Insights
          </ThemedHeading>
        </HStack>
      </Box>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{ padding: 12, paddingBottom: 120, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <ThemedCard variant='primary' size='lg'>
          <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Box
              style={{
                backgroundColor: Colors.primaryLight,
                width: 32,
                height: 32,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name='speedometer' size={16} color={Colors.primary} />
            </Box>
            <ThemedHeading variant='h3' weight='bold' color='primary'>
              Quick Stats
            </ThemedHeading>
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
                  <ThemedText variant='body' weight='medium' color='secondary'>
                    {stat.label}
                  </ThemedText>
                </HStack>
                <ThemedText
                  variant='bodyLarge'
                  weight='bold'
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </ThemedText>
              </HStack>
            ))}
          </VStack>
        </ThemedCard>

        {/* AI-Powered Insights */}
        <ThemedCard variant='primary' size='lg'>
          <HStack style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <LinearGradient
              colors={['#8B5CF6', '#8B5CF6DD']}
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
            <ThemedHeading variant='h3' weight='bold' color='primary'>
              Smart Recommendations
            </ThemedHeading>
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
                <Ionicons name='bulb' size={18} color={Colors.success} />
                <ThemedText variant='body' weight='semibold' color='primary'>
                  Optimize Ordering
                </ThemedText>
              </HStack>
              <ThemedText
                variant='caption'
                color='muted'
                style={{ lineHeight: 20 }}
              >
                Consider increasing order quantity for Premium Vodka by 15%
                based on recent sales trends.
              </ThemedText>
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
                <Ionicons name='warning' size={18} color={Colors.warning} />
                <ThemedText variant='body' weight='semibold' color='primary'>
                  Restock Alert
                </ThemedText>
              </HStack>
              <ThemedText
                variant='caption'
                color='muted'
                style={{ lineHeight: 20 }}
              >
                3 high-demand items are approaching minimum stock levels.
                Schedule reorder soon.
              </ThemedText>
            </LinearGradient>
          </VStack>
        </ThemedCard>

        {/* Analytics Cards */}
        <VStack style={{ gap: 16 }}>
          <ThemedHeading
            variant='h3'
            color='onGradient'
            weight='bold'
            style={{ marginLeft: 4 }}
          >
            Analytics Dashboard
          </ThemedHeading>

          <VStack style={{ gap: 12 }}>
            {insightCards.map((card, index) => (
              <Pressable key={index}>
                <ThemedCard variant='primary' size='lg'>
                  <HStack
                    style={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <HStack style={{ alignItems: 'center', gap: 16, flex: 1 }}>
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
                        <ThemedText
                          variant='body'
                          weight='semibold'
                          color='primary'
                        >
                          {card.title}
                        </ThemedText>
                        <ThemedText
                          variant='caption'
                          color='muted'
                          style={{ marginTop: 2 }}
                        >
                          {card.description}
                        </ThemedText>
                        <ThemedText
                          variant='caption'
                          weight='medium'
                          color='muted'
                          style={{ marginTop: 4 }}
                        >
                          {card.metrics}
                        </ThemedText>
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
                </ThemedCard>
              </Pressable>
            ))}
          </VStack>
        </VStack>

        {/* Coming Soon */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.05)']}
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
          <ThemedHeading
            variant='h3'
            color='onGradient'
            weight='bold'
            align='center'
          >
            More Insights Coming Soon
          </ThemedHeading>
          <ThemedText
            variant='body'
            color='onGradientMuted'
            align='center'
            style={{ marginTop: 8 }}
          >
            Advanced analytics, predictive insights, and custom reports are in
            development.
          </ThemedText>
        </LinearGradient>
      </ScrollView>
    </PageGradient>
  )
}
