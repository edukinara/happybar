import { Box } from '@/components/ui/box'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, Image } from 'react-native'

interface ProductImageProps {
  uri?: string | null
  size: number
  borderRadius?: number
  fallbackIconSize?: number
  showLoadingIndicator?: boolean
}

export function ProductImage({
  uri,
  size,
  borderRadius = 8,
  fallbackIconSize,
  showLoadingIndicator = false,
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Calculate fallback icon size based on container size if not provided
  const iconSize = fallbackIconSize || Math.max(16, Math.floor(size * 0.4))

  // Show fallback if no URI, error occurred, or still loading (when indicator disabled)
  const showFallback = !uri || hasError || (isLoading && !showLoadingIndicator)

  if (showFallback) {
    return (
      <Box
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#F3F4F6',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isLoading && showLoadingIndicator && uri && !hasError ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : (
          <Ionicons name="cube-outline" size={iconSize} color="#9CA3AF" />
        )}
      </Box>
    )
  }

  return (
    <Box style={{ position: 'relative' }}>
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#F3F4F6',
        }}
        resizeMode="contain"
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
          <ActivityIndicator size="small" color="#8B5CF6" />
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
  listItem: { size: 45, borderRadius: 8, fallbackIconSize: 20 },
  listItemLarge: { size: 50, borderRadius: 8, fallbackIconSize: 22 },
  
  // Detail view variants (higher priority for user focus)
  detail: { size: 80, borderRadius: 12, fallbackIconSize: 32, showLoadingIndicator: true },
  modal: { size: 60, borderRadius: 10, fallbackIconSize: 28, showLoadingIndicator: true },
}