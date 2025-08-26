import { useAuth } from '@/lib/auth/auth-context'
import {
  createEnhancedErrorMessage,
  handleAsync,
  isAuthenticationError,
  isPermissionError,
  showErrorToast,
} from '@/lib/error-handling'
import { useCallback } from 'react'
import { toast } from 'sonner'

interface UseErrorHandlingOptions {
  showToast?: boolean
  customMessage?: string
  logError?: boolean
}

/**
 * Custom hook for handling API errors with user-friendly messages
 */
export function useErrorHandling() {
  const { user } = useAuth()

  /**
   * Handle an error with appropriate user feedback
   */
  const handleError = useCallback(
    (error: any, options: UseErrorHandlingOptions = {}) => {
      const {
        showToast: shouldShowToast = true,
        customMessage,
        logError = true,
      } = options

      // Log the error for debugging
      if (logError) {
        console.error('Error handled by useErrorHandling:', error)
      }

      // Show user-friendly error message
      if (shouldShowToast) {
        const message = customMessage || createEnhancedErrorMessage(error)

        if (isPermissionError(error)) {
          const { userRole, requiredPermission } = error.response.data.context
          toast.error(message, {
            description: `Current role: ${userRole} | Required: ${requiredPermission}`,
            duration: 6000,
            action: {
              label: 'Contact Admin',
              onClick: () => {
                // Could open a support modal or redirect to help page
                console.warn(
                  'User requested admin contact for permission issue'
                )
              },
            },
          })
        } else if (isAuthenticationError(error)) {
          toast.error(message, {
            description: 'You will be redirected to the login page',
            duration: 3000,
          })
        } else {
          toast.error(message)
        }
      }

      return error
    },
    []
  )

  /**
   * Wrapper for async operations with built-in error handling
   */
  const withErrorHandling = useCallback(
    <T>(operation: () => Promise<T>, options: UseErrorHandlingOptions = {}) => {
      return handleAsync(operation, options.customMessage).then(
        ([result, error]) => {
          if (error) {
            handleError(error, options)
          }
          return [result, error] as const
        }
      )
    },
    [handleError]
  )

  /**
   * Check if an error should block the UI (like permission errors)
   */
  const isBlockingError = useCallback((error: any): boolean => {
    return isPermissionError(error) || isAuthenticationError(error)
  }, [])

  /**
   * Get a user-friendly error message without showing toast
   */
  const getMessageFromError = useCallback((error: any): string => {
    return createEnhancedErrorMessage(error)
  }, [])

  /**
   * Show a permission-specific error with role context
   */
  const showPermissionError = useCallback(
    (requiredPermission: string, action?: string) => {
      const userRole = user?.role || 'unknown'
      const message = `Access denied: You need '${requiredPermission}' permission${action ? ` to ${action}` : ''}. Your current role '${userRole}' does not have sufficient privileges.`

      toast.error(message, {
        description: `Current role: ${userRole} | Required: ${requiredPermission}`,
        duration: 6000,
        action: {
          label: 'Contact Admin',
          onClick: () => {
            console.warn(
              'User requested admin contact for permission:',
              requiredPermission
            )
          },
        },
      })
    },
    [user?.role]
  )

  return {
    handleError,
    withErrorHandling,
    isBlockingError,
    getMessageFromError,
    showPermissionError,
    showErrorToast,
    isPermissionError,
    isAuthenticationError,
  }
}

/**
 * Hook for handling form submission errors
 */
export function useFormErrorHandling() {
  const { handleError } = useErrorHandling()

  const handleSubmitError = useCallback(
    (error: any, fieldName?: string) => {
      // Handle validation errors
      if (error.response?.status === 422 || error.response?.status === 400) {
        const validationErrors = error.response.data?.errors
        if (validationErrors && fieldName) {
          const fieldError = validationErrors[fieldName]
          if (fieldError) {
            toast.error(`${fieldName}: ${fieldError}`)
            return
          }
        }
      }

      // Fall back to general error handling
      handleError(error, {
        customMessage:
          'Failed to submit form. Please check your input and try again.',
      })
    },
    [handleError]
  )

  return {
    handleSubmitError,
    handleError,
  }
}
