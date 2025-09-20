import { ImageSource } from 'expo-image'

/**
 * Global image configuration for the mobile app
 * Optimizes caching and performance settings
 */

// Cache configuration
export const IMAGE_CACHE_CONFIG = {
  // Maximum cache size in MB
  maxCacheSizeInMB: 50,

  // Maximum number of cached images
  maxCacheCount: 200,

  // Cache TTL in seconds (7 days)
  cacheTTL: 7 * 24 * 60 * 60,

  // Disk cache path
  cacheDirectory: 'product-images',
}

// Preload critical product images for better performance
export const preloadProductImages = (imageUrls: string[]) => {
  // Only preload first few images to avoid overwhelming the cache
  const imagesToPreload = imageUrls.slice(0, 10)

  return Promise.allSettled(
    imagesToPreload.map((uri) => {
      const source: ImageSource = {
        uri,
        cacheKey: uri,
      }

      // This will cache the image without displaying it
      return new Promise<void>((resolve) => {
        // Simple preload implementation
        // In a production app, you might want to use expo-image's preload API
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve() // Still resolve on error to continue
        img.src = uri
      })
    })
  )
}

// Clear image cache utility
export const clearImageCache = async () => {
  try {
    // Note: expo-image provides cache clearing methods
    // This is a placeholder for the actual implementation
  } catch (error) {
    console.warn('Failed to clear image cache:', error)
  }
}

// Get cache size utility
export const getImageCacheSize = async (): Promise<number> => {
  try {
    // This would integrate with expo-image's cache stats
    // Returning 0 as placeholder
    return 0
  } catch (error) {
    console.warn('Failed to get cache size:', error)
    return 0
  }
}

// Image optimization utilities
export const getOptimalImageSize = (
  containerSize: number,
  devicePixelRatio: number = 1
) => {
  // Calculate optimal image size based on container and screen density
  const optimalSize = Math.ceil(containerSize * devicePixelRatio * 1.2) // 20% buffer

  // Cap at reasonable maximum to avoid memory issues
  return Math.min(optimalSize, 200)
}

// Generate responsive image source with multiple sizes
export const generateResponsiveImageSource = (
  baseUri: string,
  size: number
): ImageSource => {
  // If your backend supports responsive images, you could generate different sizes
  // For now, return the base URI
  return {
    uri: baseUri,
    width: size,
    height: size,
  }
}
