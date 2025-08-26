'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AlertsRedirectPage = () => {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the unified inventory alerts page
    router.replace('/dashboard/inventory/alerts')
  }, [router])

  return (
    <div className='flex items-center justify-center min-h-[400px]'>
      <div className='text-center'>
        <p className='text-muted-foreground'>Redirecting to Inventory Alerts...</p>
      </div>
    </div>
  )
}

export default AlertsRedirectPage
