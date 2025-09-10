import React from 'react'
import { Input, InputField } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { VStack } from '@/components/ui/vstack'
import { Box } from '@/components/ui/box'
import { themeClasses, cn } from '../../constants/themeClasses'

export interface ThemedInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  labelClassName?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'filled' | 'ghost' | 'onGradient'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fieldProps?: React.ComponentProps<typeof InputField>
  className?: string
}

export function ThemedInput({
  label,
  labelClassName,
  error,
  helperText,
  variant = 'default',
  size = 'md',
  fullWidth = true,
  leftIcon,
  rightIcon,
  className,
  fieldProps,
  ...props
}: ThemedInputProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return cn(
          themeClasses.input.base,
          'border-gray-300 dark:border-gray-600',
          error && 'border-red-500 dark:border-red-400'
        )
      case 'filled':
        return cn(
          themeClasses.bg.secondary,
          'border-transparent',
          error && 'border-red-500 dark:border-red-400'
        )
      case 'ghost':
        return 'bg-transparent border-transparent'
      case 'onGradient':
        return 'bg-white/20 dark:bg-white/10 border border-white/40 dark:border-white/40 data-[focus=true]:border-white/80'
      default:
        return cn(themeClasses.input.base, 'border-gray-300 dark:border-gray-600')
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-10 rounded-lg px-3'
      case 'md':
        return 'h-12 rounded-xl px-4'
      case 'lg':
        return 'h-14 rounded-2xl px-5'
      default:
        return 'h-12 rounded-xl px-4'
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-base'
      case 'lg':
        return 'text-lg'
      default:
        return 'text-base'
    }
  }

  // Auto-set label styling for onGradient variant
  const finalLabelClassName = variant === 'onGradient' 
    ? cn('text-white font-medium', labelClassName)
    : cn(
        themeClasses.text.primary,
        'font-medium',
        size === 'sm' ? 'text-sm' : 'text-base',
        labelClassName
      )

  // Auto-set field props for onGradient variant
  const finalFieldProps = variant === 'onGradient'
    ? {
        className: 'text-white placeholder:text-white/60 dark:text-white',
        placeholderTextColor: 'rgba(255,255,255,0.6)',
        ...fieldProps
      }
    : fieldProps

  return (
    <VStack space='xs' className={fullWidth ? 'w-full' : undefined}>
      {label && (
        <Text className={finalLabelClassName}>
          {label}
        </Text>
      )}
      
      <Input
        className={cn(
          getVariantClasses(),
          getSizeClasses(),
          'shadow-sm',
          leftIcon ? 'pl-12' : '',
          rightIcon ? 'pr-12' : '',
          className
        )}
        {...props}
      >
        {leftIcon && (
          <Box className='absolute left-3 top-1/2 -translate-y-1/2'>
            {leftIcon}
          </Box>
        )}
        
        <InputField
          className={cn(
            variant === 'onGradient' 
              ? 'text-white placeholder:text-white/60'
              : cn(themeClasses.input.text, 'placeholder:text-gray-500 dark:placeholder:text-gray-400'),
            getTextSize()
          )}
          {...finalFieldProps}
        />
        
        {rightIcon && (
          <Box className='absolute right-3 top-1/2 -translate-y-1/2'>
            {rightIcon}
          </Box>
        )}
      </Input>
      
      {(error || helperText) && (
        <Text className={cn(
          'text-sm',
          error ? 'text-red-600 dark:text-red-400' : themeClasses.text.muted
        )}>
          {error || helperText}
        </Text>
      )}
    </VStack>
  )
}