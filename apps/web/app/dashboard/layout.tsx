'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { LocationSelector } from '@/components/dashboard/LocationSelector'
import { ErrorBoundary } from '@/components/error-boundary'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { NavUser } from '@/components/nav-user'
import { SimpleThemeToggle } from '@/components/theme-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuth } from '@/lib/auth/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = []

  // Always start with Dashboard
  breadcrumbs.push({
    title: 'Dashboard',
    href: '/dashboard',
    isLast: segments.length === 1,
  })

  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1]
    const title = lastSegment
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    breadcrumbs.push({
      title,
      href: pathname,
      isLast: true,
    })
  }

  return breadcrumbs
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <HappyBarLoader
        className='p-16 text-nowrap'
        text='Loading Dashboard...'
      />
    )
  }

  if (!user) {
    return null
  }

  const userData = {
    name: user?.name || 'User',
    email: user?.email || 'user@example.com',
    image: user?.image || '',
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className='flex h-22 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
            <div className='flex items-center gap-0 sm:gap-2 px-4'>
              <SidebarTrigger className='-ml-1' />
              <Separator
                orientation='vertical'
                className='mr-2 data-[orientation=vertical]:h-4'
              />
              <DynamicBreadcrumb />
            </div>
            <div className='flex flex-col-reverse sm:flex-row flex-wrap items-end sm:items-center justify-end gap-2 sm:gap-4 ml-auto px-3'>
              <LocationSelector />
              <Separator
                orientation='vertical'
                className='hidden sm:flex data-[orientation=vertical]:h-4'
              />
              <div className='flex items-center'>
                <SimpleThemeToggle />
                <NavUser user={userData} />
              </div>
            </div>
          </header>
          <Separator />
          <div className='flex flex-1 flex-col gap-4 p-4 max-w-full overflow-auto max-h-[calc(100vh_-_100px)] sm:max-h-[calc(100vh_-_54px)]'>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ErrorBoundary>
  )
}

// Component to handle dynamic breadcrumbs based on current route
function DynamicBreadcrumb() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <Breadcrumb className='hidden md:block'>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && (
              <BreadcrumbSeparator className='hidden md:block' />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
