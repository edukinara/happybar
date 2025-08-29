'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import React, { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * Error boundary component that catches React errors and displays a user-friendly fallback
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.warn('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
                <AlertTriangle className='w-6 h-6 text-red-600 dark:text-red-400' />
              </div>
              <CardTitle className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                Something went wrong
              </CardTitle>
              <CardDescription className='text-gray-600 dark:text-gray-400'>
                We&apos;re sorry, but something unexpected happened. This has
                been logged and we&apos;ll look into it.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className='p-3 bg-gray-100 dark:bg-gray-800 rounded-lg'>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
                    Error Details (Development Only):
                  </p>
                  <p className='text-xs text-gray-700 dark:text-gray-300 font-mono break-all'>
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <details className='mt-2'>
                      <summary className='text-xs text-gray-600 dark:text-gray-400 cursor-pointer'>
                        Component Stack
                      </summary>
                      <pre className='text-xs text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap'>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className='space-y-2'>
                <Button
                  onClick={() =>
                    this.setState({
                      hasError: false,
                      error: undefined,
                      errorInfo: undefined,
                    })
                  }
                  className='w-full'
                >
                  <RefreshCw className='mr-2 size-4' />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = '/dashboard')}
                  variant='outline'
                  className='w-full'
                >
                  <Home className='mr-2 size-4' />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Wrapper component for easier usage
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function ErrorBoundaryWrapper({
  children,
  fallback,
  onError: _,
}: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}

/**
 * Permission-specific error boundary
 */
export function PermissionErrorBoundary({ children }: { children: ReactNode }) {
  const fallback = (
    <div className='min-h-[400px] flex items-center justify-center'>
      <Card className='w-full max-w-md mx-4'>
        <CardContent className='text-center py-8'>
          <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-amber-500' />
          <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
            Permission Error
          </h3>
          <p className='text-muted-foreground mb-4'>
            A permission-related error occurred while loading this component.
          </p>
          <Button onClick={() => window.location.reload()} variant='outline'>
            <RefreshCw className='mr-2 size-4' />
            Reload Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
