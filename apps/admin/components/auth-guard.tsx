'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900`}></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}