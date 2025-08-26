'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'

import {
  ArrowRight,
  BarChart3,
  Box,
  Building2,
  ChefHat,
  Home,
  Package,
  Settings,
  ShoppingCart,
} from 'lucide-react'

import { InventoryAlertBadge } from '@/components/alerts/InventoryAlertBadge'
import { Logo } from '@/components/brand/logo'
import { NavMain } from '@/components/nav-main'
import { OrganizationSwitcher } from '@/components/organization-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useNavigationVisibility } from '@/lib/hooks/use-permissions'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const perms = useNavigationVisibility()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, hasAccess: true },
    {
      name: 'Inventory',
      href: '/dashboard/inventory',
      icon: Box,
      badge: true,
      hasAccess: perms.canAccessInventory,
    },
    {
      name: 'Products',
      href: '/dashboard/products',
      icon: Package,
      hasAccess: perms.canAccessProducts,
    },
    {
      name: 'Recipes',
      href: '/dashboard/recipes',
      icon: ChefHat,
      hasAccess: perms.canAccessRecipes,
    },
    {
      name: 'Transfers',
      href: '/dashboard/stock-transfers',
      icon: ArrowRight,
      hasAccess: perms.canAccessInventory || perms.canAccessProducts,
    },
    {
      name: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingCart,
      hasAccess: perms.canAccessOrders,
    },
    {
      name: 'Suppliers',
      href: '/dashboard/suppliers',
      icon: Building2,
      hasAccess: perms.canAccessSuppliers,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      hasAccess: perms.canAccessAnalytics,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      hasAccess: perms.canAccessSettings,
    },
  ]
  // Transform navigation to match NavMain expected format
  const navItems = navigation
    .filter((item) => !!item.hasAccess)
    .map((item) => ({
      title: item.name,
      url: item.href,
      icon: item.icon,
      isActive:
        item.href === '/dashboard'
          ? pathname === item.href
          : pathname.startsWith(item.href),
      badge: item.badge ? <InventoryAlertBadge /> : undefined,
    }))

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg'>
              <Logo size='md' variant='full' />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className='flex flex-1 items-center'>
          <OrganizationSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
