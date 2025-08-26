'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { createContext, type ReactNode, useContext } from 'react'

type AutumnContextType = Record<string, never>

const AutumnContext = createContext<AutumnContextType | undefined>(undefined)

interface AutumnProviderProps {
  children: ReactNode
}

export function AutumnProvider({ children }: AutumnProviderProps) {
  const { user, loading } = useAuth()

  // Don't initialize Autumn SDK if user is not authenticated
  // This prevents unnecessary API calls when users are not logged in
  if (loading) {
    // Show loading state while checking authentication
    return (
      <AutumnContext.Provider value={{}}>{children}</AutumnContext.Provider>
    )
  }

  if (!user) {
    // User not authenticated, don't initialize Autumn SDK
    return (
      <AutumnContext.Provider value={{}}>{children}</AutumnContext.Provider>
    )
  }

  // Only initialize Autumn SDK for users with billing access
  // This prevents the SDK from making automatic customer calls for non-billing users
  const hasBillingAccess = user?.role && ['owner', 'admin'].includes(user.role)

  if (!hasBillingAccess) {
    // For non-billing users, don't initialize the SDK to prevent automatic calls
    return (
      <AutumnContext.Provider value={{}}>{children}</AutumnContext.Provider>
    )
  }

  // For now, disable the Autumn SDK completely and handle all interactions via our API
  // This prevents any automatic customer creation calls
  // All Autumn functionality will go through our backend endpoints

  return <AutumnContext.Provider value={{}}>{children}</AutumnContext.Provider>
}

export function useAutumn() {
  const context = useContext(AutumnContext)
  if (context === undefined) {
    throw new Error('useAutumn must be used within an AutumnProvider')
  }
  return context
}
