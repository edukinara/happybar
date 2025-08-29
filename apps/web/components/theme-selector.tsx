'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-24 bg-gray-200 rounded-lg mb-2'></div>
            <div className='h-4 bg-gray-200 rounded w-16 mx-auto'></div>
          </div>
        ))}
      </div>
    )
  }

  const themes = [
    {
      name: 'Light',
      value: 'light',
      icon: Sun,
      description: 'Clean and bright interface',
      preview: 'bg-white border-gray-200',
    },
    {
      name: 'Dark',
      value: 'dark',
      icon: Moon,
      description: 'Easy on the eyes in low light',
      preview: 'bg-gray-900 border-gray-800',
    },
    {
      name: 'System',
      value: 'system',
      icon: SunMoon,
      description: 'Matches your system preference',
      preview:
        resolvedTheme === 'dark'
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200',
    },
  ]

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      {themes.map((themeOption) => {
        const Icon = themeOption.icon
        const isSelected = theme === themeOption.value

        return (
          <Card
            key={themeOption.value}
            className={`cursor-pointer transition-all hover:shadow-md relative ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setTheme(themeOption.value)}
          >
            <CardContent className='p-4'>
              {/* Preview */}
              <div
                className={`h-20 rounded-md border mb-3 flex items-center justify-center ${themeOption.preview}`}
              >
                <Icon
                  className={`size-6 ${
                    themeOption.value === 'dark'
                      ? 'text-gray-100'
                      : themeOption.value === 'light'
                        ? 'text-gray-900'
                        : resolvedTheme === 'dark'
                          ? 'text-gray-100'
                          : 'text-gray-900'
                  }`}
                />
              </div>

              {/* Theme info */}
              <div className='text-center'>
                <div className='flex items-center justify-center mb-1'>
                  <span className='font-medium text-sm'>
                    {themeOption.name}
                  </span>
                  {isSelected && <Check className='size-4 ml-2 text-primary' />}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {themeOption.description}
                </p>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <Badge className='absolute -top-2 -right-2 text-xs'>
                  Active
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
