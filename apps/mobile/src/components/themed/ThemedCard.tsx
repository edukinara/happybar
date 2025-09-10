import React from 'react'
import { Card } from '@/components/ui/card'
import { themeClasses, cn } from '../../constants/themeClasses'

export interface ThemedCardProps extends Omit<React.ComponentProps<typeof Card>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'elevated'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}

export function ThemedCard({ 
  variant = 'primary', 
  size = 'md',
  className, 
  children, 
  ...props 
}: ThemedCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return cn(themeClasses.card.primary, 'shadow-lg')
      case 'secondary':
        return cn(themeClasses.bg.secondary, 'border border-gray-200 dark:border-gray-700')
      case 'ghost':
        return 'bg-transparent border-none shadow-none'
      case 'elevated':
        return cn(themeClasses.card.primary, 'shadow-xl border-0')
      default:
        return themeClasses.card.primary
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3 rounded-xl'
      case 'md':
        return 'p-4 rounded-2xl'
      case 'lg':
        return 'p-6 rounded-3xl'
      default:
        return 'p-4 rounded-2xl'
    }
  }

  return (
    <Card
      className={cn(
        getVariantClasses(),
        getSizeClasses(),
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
}