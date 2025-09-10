import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

import { usePageGradient } from '../constants/gradients'

interface PageGradientProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Reusable page gradient component that automatically adapts to light/dark mode
 */
export function PageGradient({ children, style }: PageGradientProps) {
  const gradientColors = usePageGradient()

  return (
    <LinearGradient
      colors={gradientColors}
      style={[{ flex: 1 }, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  )
}