'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { ErrorBoundary } from '@/components/error-boundary'
import { HappBarLoader } from '@/components/HappyBarLoader'
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
      <HappBarLoader className='p-16 text-nowrap' text='Loading Dashboard...' />
    )
  }

  if (!user) {
    return null
  }

  const userData = {
    name: user?.name || 'User',
    email: user?.email || 'user@example.com',
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
            <div className='flex items-center gap-2 px-4'>
              <SidebarTrigger className='-ml-1' />
              <Separator
                orientation='vertical'
                className='mr-2 data-[orientation=vertical]:h-4'
              />
              <DynamicBreadcrumb />
            </div>
            <div className='flex flex-row items-center gap-2 ml-auto px-3'>
              <SimpleThemeToggle />
              <NavUser user={userData} />
            </div>
          </header>
          <div className='flex flex-1 flex-col gap-4 p-4 pt-0 max-w-full overflow-hidden'>
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
    <Breadcrumb>
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
