'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth-context'
import { Building2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface OrganizationDetailsProps {
  onOrganizationUpdate?: () => void
}

export default function OrganizationDetailsCard({
  onOrganizationUpdate,
}: OrganizationDetailsProps) {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      phone: '',
    },
  })

  // Helper function to parse corrupted metadata
  const parseMetadata = (metadata: any) => {
    try {
      if (typeof metadata === 'string') {
        return JSON.parse(metadata)
      } else if (typeof metadata === 'object' && metadata !== null) {
        // Check if it's the corrupted numeric-key object
        if ('0' in metadata && typeof metadata['0'] === 'string') {
          // Try to reconstruct the JSON string from the numeric keys
          const jsonStr = Object.keys(metadata)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => metadata[key])
            .join('')
          return JSON.parse(jsonStr)
        } else {
          return metadata
        }
      }
      return {}
    } catch (error) {
      console.error('Failed to parse metadata:', error)
      return {}
    }
  }

  // Fetch organization details when user is available
  const fetchOrganization = async () => {
    if (!user?.organizationId) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization')
      }
      
      const result = await response.json()
      if (result.success && result.data) {
        const org = result.data
        const parsedMetadata = parseMetadata(org.metadata)
        
        setFormData({
          name: org.name || '',
          logo: org.logo || '',
          address: {
            street: parsedMetadata?.address?.street || '',
            city: parsedMetadata?.address?.city || '',
            state: parsedMetadata?.address?.state || '',
            zip: parsedMetadata?.address?.zip || '',
            country: parsedMetadata?.address?.country || '',
            phone: parsedMetadata?.address?.phone || '',
          },
        })
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error)
      toast.error('Failed to load organization details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      fetchOrganization()
    }
  }, [user, authLoading])

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          logo: formData.logo || null,
          address: formData.address,
          organizationId: user?.organizationId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update organization')
      }
      
      const result = await response.json()
      if (result.success) {
        toast.success('Organization details updated successfully')
        onOrganizationUpdate?.()
        // Refresh the organization data
        await fetchOrganization()
      } else {
        throw new Error(result.error || 'Failed to update organization')
      }
    } catch (error) {
      console.error('Failed to update organization:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update organization'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleAddressChange = (
    field: keyof typeof formData.address,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }))
  }

  if (authLoading || loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full size-8 border-b-2 border-primary'></div>
          <span className='ml-2'>Loading organization details...</span>
        </CardContent>
      </Card>
    )
  }

  if (!user?.organizationId) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8'>
          <Building2 className='h-12 w-12 mx-auto mb-4 text-gray-300' />
          <h3 className='text-lg font-medium mb-2'>No Organization Found</h3>
          <p className='text-muted-foreground'>
            You need to be part of an organization to manage its details.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center'>
          <Building2 className='mr-2 size-5' />
          Organization Details
        </CardTitle>
        <CardDescription>
          Manage your organization information and shipping address
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Organization Info */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Basic Information</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='org-name'>Organization Name</Label>
              <Input
                id='org-name'
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder='Your Organization Name'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='org-logo'>Logo URL (Optional)</Label>
              <Input
                id='org-logo'
                value={formData.logo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo: e.target.value }))
                }
                placeholder='https://example.com/logo.png'
              />
            </div>
          </div>
        </div>

        {/* Address Info */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Shipping Address</h3>
          <p className='text-sm text-muted-foreground'>
            This address will be included in supplier order emails
          </p>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='address-street'>Street Address</Label>
              <Input
                id='address-street'
                value={formData.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder='123 Main Street'
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='address-city'>City</Label>
                <Input
                  id='address-city'
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder='New York'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='address-state'>State</Label>
                <Input
                  id='address-state'
                  value={formData.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  placeholder='NY'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='address-zip'>ZIP Code</Label>
                <Input
                  id='address-zip'
                  value={formData.address.zip}
                  onChange={(e) => handleAddressChange('zip', e.target.value)}
                  placeholder='10001'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='address-country'>Country</Label>
                <Input
                  id='address-country'
                  value={formData.address.country}
                  onChange={(e) =>
                    handleAddressChange('country', e.target.value)
                  }
                  placeholder='United States'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='address-phone'>Phone Number</Label>
                <Input
                  id='address-phone'
                  value={formData.address.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                  placeholder='(555) 123-4567'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className='flex justify-end pt-4 border-t'>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className='btn-brand-primary'
          >
            {saving ? (
              <div className='animate-spin rounded-full size-4 border-b-2 border-white mr-2'></div>
            ) : (
              <Save className='mr-2 size-4' />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
