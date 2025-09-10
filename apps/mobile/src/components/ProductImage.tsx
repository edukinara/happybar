import { Box } from '@/components/ui/box'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import React, { useState } from 'react'
import { ActivityIndicator } from 'react-native'

interface ProductImageProps {
  uri?: string | null
  size: number
  borderRadius?: number
  fallbackIconSize?: number
  showLoadingIndicator?: boolean
  priority?: 'low' | 'normal' | 'high'
}

export function ProductImage({
  uri,
  size,
  borderRadius = 8,
  fallbackIconSize,
  showLoadingIndicator = false,
  priority = 'normal',
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Calculate fallback icon size based on container size if not provided
  const iconSize = fallbackIconSize || Math.max(16, Math.floor(size * 0.4))

  // Show fallback only if no URI or error occurred
  const showFallback = !uri || hasError

  if (showFallback) {
    return (
      <Box
        style={{
          width: (size / 3) * 2,
          height: size,
          borderRadius,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isLoading && showLoadingIndicator && uri && !hasError ? (
          <ActivityIndicator size='small' color='#8B5CF6' />
        ) : (
          <Ionicons name='cube-outline' size={iconSize} color='#9CA3AF' />
        )}
      </Box>
    )
  }

  return (
    <Box className='relative p-1 rounded-md bg-white'>
      <Image
        source={{ uri }}
        style={{
          width: (size / 3) * 2,
          height: size,
        }}
        contentFit='contain'
        priority={priority}
        cachePolicy='memory-disk'
        onLoad={() => {
          setIsLoading(false)
          setHasError(false)
        }}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        onLoadStart={() => {
          setIsLoading(true)
          setHasError(false)
        }}
        recyclingKey={uri}
        allowDownscaling={true}
      />

      {/* Loading overlay */}
      {isLoading && showLoadingIndicator && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius,
            backgroundColor: 'rgba(243, 244, 246, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size='small' color='#8B5CF6' />
        </Box>
      )}
    </Box>
  )
}

// Preset variants for common use cases
export const ProductImageVariants = {
  small: { size: 40, borderRadius: 6, fallbackIconSize: 18 },
  medium: { size: 50, borderRadius: 8, fallbackIconSize: 22 },
  large: { size: 60, borderRadius: 10, fallbackIconSize: 28 },

  // List item variants (optimized for scrolling performance)
  listItem: {
    size: 45,
    borderRadius: 8,
    fallbackIconSize: 20,
    priority: 'low' as const,
  },
  listItemLarge: {
    size: 50,
    borderRadius: 8,
    fallbackIconSize: 22,
    priority: 'low' as const,
  },

  // Detail view variants (higher priority for user focus)
  detail: {
    size: 80,
    borderRadius: 12,
    fallbackIconSize: 32,
    priority: 'high' as const,
    showLoadingIndicator: true,
  },
  modal: {
    size: 60,
    borderRadius: 10,
    fallbackIconSize: 28,
    priority: 'high' as const,
    showLoadingIndicator: true,
  },
}
