import { Text } from '@/components/ui/text'
import React from 'react'
import { cn, themeClasses } from '../../constants/themeClasses'

export interface ThemedTextProps
  extends Omit<React.ComponentProps<typeof Text>, 'children'> {
  variant?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'body'
    | 'bodyLarge'
    | 'caption'
    | 'overline'
  color?:
    | 'primary'
    | 'secondary'
    | 'muted'
    | 'success'
    | 'warning'
    | 'danger'
    | 'white'
    | 'purple'
    | 'onGradient'
    | 'onGradientSubtle'
    | 'onGradientMuted'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right'
  italic?: boolean
  underline?: boolean
  children?: React.ReactNode
  className?: string
  style?: any
}

export function ThemedText({
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  italic = false,
  underline = false,
  className,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'h1':
        return 'text-3xl font-bold leading-tight'
      case 'h2':
        return 'text-2xl font-bold leading-tight'
      case 'h3':
        return 'text-[1.3rem] font-semibold leading-snug'
      case 'h4':
        return 'text-lg font-semibold leading-snug'
      case 'bodyLarge':
        return 'text-lg leading-relaxed'
      case 'body':
        return 'text-base leading-relaxed'
      case 'caption':
        return 'text-sm leading-normal'
      case 'overline':
        return 'text-xs font-medium uppercase tracking-wider'
      default:
        return 'text-base leading-relaxed'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return themeClasses.text.primary
      case 'secondary':
        return themeClasses.text.secondary
      case 'muted':
        return themeClasses.text.muted
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400'
      case 'danger':
        return 'text-red-600 dark:text-red-400'
      case 'white':
        return 'text-white'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400'
      case 'onGradient':
        return themeClasses.text.onGradient
      case 'onGradientMuted':
        return themeClasses.text.onGradientMuted
      case 'onGradientSubtle':
        return themeClasses.text.onGradientSubtle
      default:
        return themeClasses.text.primary
    }
  }

  const getWeightClasses = () => {
    if (weight) {
      switch (weight) {
        case 'normal':
          return 'font-normal'
        case 'medium':
          return 'font-medium'
        case 'semibold':
          return 'font-semibold'
        case 'bold':
          return 'font-bold'
        default:
          return ''
      }
    }
    return ''
  }

  const getAlignClasses = () => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      case 'left':
      default:
        return 'text-left'
    }
  }

  return (
    <Text
      className={cn(
        getVariantClasses(),
        getColorClasses(),
        getWeightClasses(),
        getAlignClasses(),
        italic && 'italic',
        underline && 'underline',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Text>
  )
}

// Convenience components for common use cases
export const ThemedHeading = ({
  variant = 'h1',
  children,
  ...props
}: { variant?: 'h1' | 'h2' | 'h3' | 'h4'; children?: React.ReactNode } & Omit<
  ThemedTextProps,
  'variant' | 'children'
>) => (
  <ThemedText variant={variant} {...props}>
    {children}
  </ThemedText>
)

export const ThemedBody = ({
  children,
  ...props
}: { children?: React.ReactNode } & Omit<
  ThemedTextProps,
  'variant' | 'children'
>) => (
  <ThemedText variant='body' {...props}>
    {children}
  </ThemedText>
)

export const ThemedCaption = ({
  children,
  ...props
}: { children?: React.ReactNode } & Omit<
  ThemedTextProps,
  'variant' | 'children'
>) => (
  <ThemedText variant='caption' {...props}>
    {children}
  </ThemedText>
)

export const ThemedLabel = ({
  children,
  ...props
}: { children?: React.ReactNode } & Omit<
  ThemedTextProps,
  'variant' | 'children'
>) => (
  <ThemedText variant='caption' weight='medium' {...props}>
    {children}
  </ThemedText>
)
