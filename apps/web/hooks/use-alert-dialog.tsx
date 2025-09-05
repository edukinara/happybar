'use client'

import React, { createContext, useContext, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface AlertDialogOptions {
  title: string
  description: string
  cancelText?: string
  actionText?: string
  onAction?: () => void | Promise<void>
  onCancel?: () => void
  variant?: 'default' | 'destructive'
}

interface AlertDialogContextType {
  showAlert: (options: AlertDialogOptions) => void
  showError: (message: string, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showConfirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    title?: string,
    confirmText?: string
  ) => void
  showDestructiveConfirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    title?: string,
    confirmText?: string
  ) => void
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(
  undefined
)

export function AlertDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [dialog, setDialog] = useState<AlertDialogOptions | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const showAlert = (options: AlertDialogOptions) => {
    setDialog(options)
    setOpen(true)
  }

  const showError = (message: string, title = 'Error') => {
    showAlert({
      title,
      description: message,
      actionText: 'OK',
      variant: 'destructive',
    })
  }

  const showSuccess = (message: string, title = 'Success') => {
    showAlert({
      title,
      description: message,
      actionText: 'OK',
    })
  }

  const showConfirm = (
    message: string,
    onConfirm: () => void | Promise<void>,
    title = 'Confirm',
    confirmText = 'Confirm'
  ) => {
    showAlert({
      title,
      description: message,
      cancelText: 'Cancel',
      actionText: confirmText,
      onAction: onConfirm,
    })
  }

  const showDestructiveConfirm = (
    message: string,
    onConfirm: () => void | Promise<void>,
    title = 'Confirm',
    confirmText = 'Delete'
  ) => {
    showAlert({
      title,
      description: message,
      cancelText: 'Cancel',
      actionText: confirmText,
      onAction: onConfirm,
      variant: 'destructive',
    })
  }

  const handleClose = () => {
    setOpen(false)
    setLoading(false)
    setTimeout(() => setDialog(null), 200) // Wait for animation
  }

  const handleAction = async () => {
    if (!dialog?.onAction) return
    
    try {
      setLoading(true)
      const result = dialog.onAction()
      
      // Handle both sync and async actions
      if (result instanceof Promise) {
        await result
      }
      
      handleClose()
    } catch (error) {
      // Keep dialog open on error, just stop loading
      setLoading(false)
      console.error('Dialog action failed:', error)
      // Optionally, you could show an error message here
    }
  }

  const handleCancel = () => {
    dialog?.onCancel?.()
    handleClose()
  }

  return (
    <AlertDialogContext.Provider
      value={{ showAlert, showError, showSuccess, showConfirm, showDestructiveConfirm }}
    >
      {children}
      {dialog && (
        <AlertDialog 
          open={open} 
          onOpenChange={(open) => {
            // Prevent closing while loading
            if (!loading) {
              setOpen(open)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {dialog.cancelText && (
                <AlertDialogCancel onClick={handleCancel} disabled={loading}>
                  {dialog.cancelText}
                </AlertDialogCancel>
              )}
              <Button
                onClick={handleAction}
                disabled={loading}
                loading={loading}
                variant={dialog.variant === 'destructive' ? 'destructive' : 'default'}
              >
                {dialog.actionText || 'OK'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AlertDialogContext.Provider>
  )
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext)
  if (!context) {
    throw new Error('useAlertDialog must be used within an AlertDialogProvider')
  }
  return context
}