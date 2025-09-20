'use client'

import { InventoryNotificationDot } from '@/components/alerts/InventoryNotificationDot'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Plus,
  Settings,
  Target,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/dashboard/inventory',
    icon: ClipboardList,
    description: 'Current inventory levels and stock status',
  },
  {
    id: 'counts',
    label: 'Counts',
    href: '/dashboard/inventory/counts',
    icon: ClipboardCheck,
    description: 'Inventory counting and variance management',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    href: '/dashboard/inventory/alerts',
    icon: AlertTriangle,
    description: 'Low stock alerts and variance notifications',
  },
  {
    id: 'par-levels',
    label: 'Par Levels',
    href: '/dashboard/inventory/par-levels',
    icon: Target,
    description: 'Set target inventory levels for each product',
  },
  {
    id: 'adjustments',
    label: 'Adjustments',
    href: '/dashboard/inventory/adjustments',
    icon: Settings,
    description: 'Manual adjustments and corrections',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/dashboard/inventory/reports',
    icon: TrendingUp,
    description: 'Analytics and inventory reports',
  },
]

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const getActiveTab = () => {
    if (pathname === '/dashboard/inventory') return 'overview'
    if (pathname.startsWith('/dashboard/inventory/counts')) return 'counts'
    if (pathname.startsWith('/dashboard/inventory/alerts')) return 'alerts'
    if (pathname.startsWith('/dashboard/inventory/par-levels'))
      return 'par-levels'
    if (pathname.startsWith('/dashboard/inventory/adjustments'))
      return 'adjustments'
    if (pathname.startsWith('/dashboard/inventory/reports')) return 'reports'
    return 'overview'
  }

  const activeTab = getActiveTab()

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Inventory Management
          </h1>
          <p className='text-muted-foreground'>
            Manage inventory levels, conduct counts, and track stock across all
            locations
          </p>
        </div>
        <div className='flex gap-2'>
          {(activeTab === 'counts' || activeTab === 'overview') &&
          pathname !== '/dashboard/inventory/counts/new' ? (
            <Button asChild className='btn-brand-primary'>
              <Link href='/dashboard/inventory/counts/new'>
                <Plus className='size-4 mr-2' />
                New Count
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className='p-0'>
          <div className='border-b'>
            <nav
              className='flex space-x-8 px-6 flex-row overflow-auto'
              aria-label='Tabs'
            >
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={cn(
                      'group flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    )}
                  >
                    <div className='relative mr-2 '>
                      <Icon
                        className={cn(
                          'size-4 transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      {(tab.label === 'Overview' || tab.label === 'Alerts') && (
                        <InventoryNotificationDot />
                      )}
                    </div>
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Tab Description */}
          <div className='px-6 py-3 bg-muted/30'>
            <p className='text-sm text-muted-foreground'>
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className='min-h-[600px]'>{children}</div>
    </div>
  )
}
