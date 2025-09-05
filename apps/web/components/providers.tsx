'use client'

import { AuthProvider } from '@/lib/auth/auth-context'
import { AutumnProvider } from '@/lib/subscription/autumn-provider'
import { AlertDialogProvider } from '@/hooks/use-alert-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors
              if (error?.status === 401 || error?.status === 403) {
                return false
              }
              return failureCount < 3
            },
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <AutumnProvider>
            <AlertDialogProvider>
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </AlertDialogProvider>
          </AutumnProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
