import {
  Button,
  ButtonIcon,
  ButtonSpinner,
  ButtonText,
} from '@/components/ui/button'
import React from 'react'
import { cn } from '../../constants/themeClasses'

export interface ThemedButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'success'
    | 'warning'
    | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children?: React.ReactNode
  className?: string
  onPress?: () => void | Promise<void>
}

export function ThemedButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  children,
  onPress,
  ...props
}: ThemedButtonProps) {
  // Map our themed variants to Gluestack's action and variant system
  const getGluestackProps = () => {
    switch (variant) {
      case 'primary':
        return { action: 'primary' as const, variant: 'solid' as const }
      case 'secondary':
        return { action: 'secondary' as const, variant: 'solid' as const }
      case 'outline':
        return { action: 'primary' as const, variant: 'outline' as const }
      case 'ghost':
        return { action: 'default' as const, variant: 'link' as const }
      case 'success':
        return { action: 'positive' as const, variant: 'solid' as const }
      case 'warning':
        return { action: 'secondary' as const, variant: 'solid' as const }
      case 'danger':
        return { action: 'negative' as const, variant: 'solid' as const }
      default:
        return { action: 'primary' as const, variant: 'solid' as const }
    }
  }

  const getThemedClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-purple-600 dark:bg-purple-500'
      case 'warning':
        return 'bg-amber-600 dark:bg-amber-500'
      default:
        return ''
    }
  }

  const gluestackProps = getGluestackProps()

  return (
    <Button
      {...gluestackProps}
      size={size}
      className={cn(getThemedClasses(), fullWidth && 'w-full', className)}
      onPress={onPress}
      {...props}
    >
      {loading && <ButtonSpinner />}

      {icon && iconPosition === 'left' && !loading && (
        <ButtonIcon>{icon}</ButtonIcon>
      )}

      <ButtonText>{children}</ButtonText>

      {icon && iconPosition === 'right' && !loading && (
        <ButtonIcon>{icon}</ButtonIcon>
      )}
    </Button>
  )
}
