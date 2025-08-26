import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
  theme?: 'light' | 'dark' | 'auto'
}

export function Logo({ 
  className, 
  size = 'md', 
  variant = 'full',
  theme = 'auto' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  const colorClass = theme === 'dark' 
    ? 'text-white fill-white' 
    : theme === 'light'
    ? 'text-neutral-900 fill-neutral-900'
    : 'text-foreground fill-foreground'

  if (variant === 'text') {
    return (
      <span className={cn(
        'font-bold tracking-tight',
        textSizeClasses[size],
        colorClass,
        className
      )}>
        Happy Bar
      </span>
    )
  }

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size], colorClass, className)}
      >
        {/* Cocktail glass with smile */}
        <path
          d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16 19V26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 26H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Smile curve in glass */}
        <path
          d="M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Bubbles */}
        <circle cx="14" cy="6" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="18" cy="5" r="1.5" fill="currentColor" opacity="0.4" />
        <circle cx="11" cy="4" r="1" fill="currentColor" opacity="0.3" />
      </svg>
    )
  }

  // Full logo (icon + text)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size], colorClass)}
      >
        {/* Cocktail glass with smile */}
        <path
          d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16 19V26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 26H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Smile curve in glass */}
        <path
          d="M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Bubbles */}
        <circle cx="14" cy="6" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="18" cy="5" r="1.5" fill="currentColor" opacity="0.4" />
        <circle cx="11" cy="4" r="1" fill="currentColor" opacity="0.3" />
      </svg>
      <span className={cn(
        'font-bold tracking-tight',
        textSizeClasses[size],
        colorClass
      )}>
        Happy Bar
      </span>
    </div>
  )
}