import { Colors } from './theme'
import { useColorScheme, ColorValue } from 'react-native'

/**
 * Theme-aware gradient colors that adapt to color mode
 */

export const getPageGradient = (colorScheme?: 'light' | 'dark' | null): readonly [ColorValue, ColorValue, ...ColorValue[]] => {
  if (colorScheme === 'dark') {
    return [Colors.gradStartDark, Colors.gradMidDark, Colors.gradEndDark] as const
  }
  return [Colors.gradStart, Colors.gradMid, Colors.gradEnd] as const
}

// Hook to get current gradient colors
export const usePageGradient = (): readonly [ColorValue, ColorValue, ...ColorValue[]] => {
  const colorScheme = useColorScheme()
  return getPageGradient(colorScheme)
}

// Static gradient arrays for convenience
export const gradients = {
  light: [Colors.gradStart, Colors.gradMid, Colors.gradEnd],
  dark: [Colors.gradStartDark, Colors.gradMidDark, Colors.gradEndDark],
} as const

// CSS classes for NativeWind gradients (if needed)
export const gradientClasses = {
  light: 'from-indigo-500 via-purple-500 to-purple-600',
  dark: 'from-indigo-800 via-purple-800 to-purple-700',
} as const