'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className='min-h-screen flex items-center justify-center p-4 bg-background'>
          <Card className='w-full max-w-lg'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
                <AlertTriangle className='h-6 w-6 text-red-600' />
              </div>
              <CardTitle className='text-xl text-red-600'>
                Something went wrong!
              </CardTitle>
              <CardDescription>
                A critical error occurred that couldn&apos;t be recovered from.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {error.message && (
                <div className='p-4 bg-gray-50 rounded-lg'>
                  <p className='text-sm text-gray-600 font-mono break-all'>
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className='text-xs text-gray-400 mt-2'>
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}
              <div className='flex justify-center space-x-2'>
                <Button onClick={reset} variant='outline'>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = '/dashboard')}
                  variant='default'
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
