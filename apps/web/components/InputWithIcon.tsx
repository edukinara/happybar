import { cn } from '@/lib/utils'
import type { LucideProps } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import React from 'react'

const InputWithIcon = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    Icon: ForwardRefExoticComponent<
      Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
    >
    iconStyle?: string
    containerStyle?: string
  }
>(({ className, iconStyle, containerStyle, type, Icon, ...props }, ref) => {
  return (
    <div className={cn('relative', containerStyle)}>
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent',
          'px-3 py-1 text-sm shadow-xs transition-colors file:border-0',
          'file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
          'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'peer block w-full rounded-md border py-[9px] pl-9 text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
      <Icon
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2',
          iconStyle
        )}
      />
    </div>
  )
})

InputWithIcon.displayName = 'InputWithIcon'

export { InputWithIcon }
