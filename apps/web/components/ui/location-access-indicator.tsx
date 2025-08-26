'use client'

import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/auth-context'
import { isLocationRestrictedRole } from '@/lib/utils/permissions'
import { AlertTriangle, MapPin, Shield } from 'lucide-react'

interface LocationAccessIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function LocationAccessIndicator({
  className = '',
  showDetails = false,
}: LocationAccessIndicatorProps) {
  const { user } = useAuth()

  if (!user) return null

  const isRestricted = isLocationRestrictedRole(user.role as any)

  if (!isRestricted) {
    return showDetails ? (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Shield className='h-4 w-4 text-green-600' />
        <span className='text-sm text-green-600'>Full location access</span>
      </div>
    ) : null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <AlertTriangle className='h-4 w-4 text-amber-500' />
      <Badge variant='outline' className='text-amber-700 border-amber-300'>
        <MapPin className='h-3 w-3 mr-1' />
        Location-restricted view
      </Badge>
      {showDetails && (
        <span className='text-xs text-muted-foreground'>
          Only showing assigned locations
        </span>
      )}
    </div>
  )
}

interface LocationAccessAlertProps {
  className?: string
}

export function LocationAccessAlert({
  className = '',
}: LocationAccessAlertProps) {
  const { user } = useAuth()

  if (!user) return null

  const isRestricted = isLocationRestrictedRole(user.role as any)

  if (!isRestricted) return null

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg p-3 ${className}`}
    >
      <div className='flex items-start space-x-2'>
        <AlertTriangle className='h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0' />
        <div className='text-sm'>
          <p className='text-amber-800 font-medium'>Location Access Notice</p>
          <p className='text-amber-700 mt-1'>
            {`Your role (`}
            <strong>{user.role}</strong>
            {`) has restricted access. You can only view and manage 
            inventory for locations you&apos;ve been assigned to by an administrator.`}
          </p>
        </div>
      </div>
    </div>
  )
}
