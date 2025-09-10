import React from 'react'
import { Box } from '@/components/ui/box'
import { Text } from '@/components/ui/text'
import { themeClasses, cn } from '../../constants/themeClasses'

export interface ThemedBadgeProps extends Omit<React.ComponentProps<typeof Box>, 'children'> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}

export function ThemedBadge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ThemedBadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-gray-100 dark:bg-gray-700'
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30'
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/30'
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/30'
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/30'
      case 'outline':
        return 'bg-transparent border border-gray-300 dark:border-gray-600'
      default:
        return 'bg-gray-100 dark:bg-gray-700'
    }
  }

  const getTextClasses = () => {
    switch (variant) {
      case 'default':
        return themeClasses.text.secondary
      case 'success':
        return 'text-green-700 dark:text-green-300'
      case 'warning':
        return 'text-amber-700 dark:text-amber-300'
      case 'danger':
        return 'text-red-700 dark:text-red-300'
      case 'info':
        return 'text-blue-700 dark:text-blue-300'
      case 'purple':
        return 'text-purple-700 dark:text-purple-300'
      case 'outline':
        return themeClasses.text.primary
      default:
        return themeClasses.text.secondary
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 rounded-md'
      case 'md':
        return 'px-3 py-1.5 rounded-lg'
      case 'lg':
        return 'px-4 py-2 rounded-xl'
      default:
        return 'px-3 py-1.5 rounded-lg'
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs'
      case 'md':
        return 'text-sm'
      case 'lg':
        return 'text-base'
      default:
        return 'text-sm'
    }
  }

  return (
    <Box
      className={cn(
        'inline-flex items-center justify-center',
        getVariantClasses(),
        getSizeClasses(),
        className
      )}
      {...props}
    >
      <Text
        className={cn(
          'font-medium',
          getTextClasses(),
          getTextSize()
        )}
      >
        {children}
      </Text>
    </Box>
  )
}