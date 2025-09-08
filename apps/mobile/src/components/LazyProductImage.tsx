import React, { useEffect, useState } from 'react'
import { Dimensions } from 'react-native'
import { ProductImage } from './ProductImage'

interface LazyProductImageProps {
  uri?: string | null
  size: number
  borderRadius?: number
  fallbackIconSize?: number
  showLoadingIndicator?: boolean
  priority?: 'low' | 'normal' | 'high'
  // Lazy loading props
  viewportOffset?: number // Distance from viewport when to start loading
  index?: number // Position in list for progressive loading
  maxConcurrentLoads?: number // Limit concurrent image loads
}

// Global state for managing concurrent loads
let activeLoads = 0
const maxGlobalConcurrentLoads = 5
const loadQueue: (() => void)[] = []

const processLoadQueue = () => {
  if (activeLoads < maxGlobalConcurrentLoads && loadQueue.length > 0) {
    const nextLoad = loadQueue.shift()
    if (nextLoad) {
      activeLoads++
      nextLoad()
    }
  }
}

export function LazyProductImage({
  uri,
  size,
  borderRadius = 8,
  fallbackIconSize,
  showLoadingIndicator = false,
  priority = 'normal',
  viewportOffset = 100,
  index = 0,
  maxConcurrentLoads = 3,
}: LazyProductImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)

  useEffect(() => {
    if (!uri) return

    // Immediate load for high priority or first few items
    if (priority === 'high' || index < 3) {
      setShouldLoad(true)
      return
    }

    // Progressive loading with delay based on index
    const delay = Math.min(index * 100, 1000) // Max 1s delay
    
    const timer = setTimeout(() => {
      if (activeLoads < maxConcurrentLoads) {
        setShouldLoad(true)
      } else {
        // Add to queue
        setIsInQueue(true)
        loadQueue.push(() => {
          setShouldLoad(true)
          setIsInQueue(false)
          
          // Decrement active loads when image finishes loading
          setTimeout(() => {
            activeLoads--
            processLoadQueue()
          }, 100)
        })
      }
    }, delay)

    return () => {
      clearTimeout(timer)
      // Remove from queue if component unmounts
      if (isInQueue) {
        const queueIndex = loadQueue.findIndex((fn) => fn === loadQueue[0])
        if (queueIndex !== -1) {
          loadQueue.splice(queueIndex, 1)
        }
      }
    }
  }, [uri, priority, index, maxConcurrentLoads, isInQueue])

  return (
    <ProductImage
      uri={shouldLoad ? uri : null}
      size={size}
      borderRadius={borderRadius}
      fallbackIconSize={fallbackIconSize}
      showLoadingIndicator={showLoadingIndicator || isInQueue}
      priority={priority}
    />
  )
}

// Hook for measuring viewport and optimizing image loading
export const useImageViewport = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'))

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })

    return () => subscription?.remove()
  }, [])

  const getOptimalImageSize = (containerSize: number) => {
    const { scale } = dimensions
    return Math.ceil(containerSize * scale * 1.2) // 20% buffer for crisp images
  }

  return {
    dimensions,
    getOptimalImageSize,
  }
}