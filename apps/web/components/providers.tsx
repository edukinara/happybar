'use client'

import { AuthProvider } from '@/lib/auth/auth-context'
import { AutumnProvider } from '@/lib/subscription/autumn-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: unknown) => {
              // Don't retry on 401/403 errors
              if (
                (error as { response?: { status?: number } })?.response
                  ?.status === 401 ||
                (error as { response?: { status?: number } })?.response
                  ?.status === 403
              ) {
                return false
              }
              return failureCount < 3
            },
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
          <AutumnProvider>{children}</AutumnProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
