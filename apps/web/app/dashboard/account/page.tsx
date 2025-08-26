'use client'

import { AccountLinking } from '@/components/auth/AccountLinking'
import { ThemeSelector } from '@/components/theme-selector'
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
import { Loader2, Mail, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function AccountPage() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    // Profile updates would be implemented here
    // For now, just simulate saving
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            User Preferences
          </h1>
          <p className='text-muted-foreground'>
            Manage your account details and subscription.
          </p>
        </div>
        <Button variant='outline' asChild>
          <Link href='/dashboard/settings'>
            <Settings className='mr-2 h-4 w-4' />
            Settings
          </Link>
        </Button>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <User className='mr-2 h-5 w-5' />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and account details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='grid md:grid-cols-2 sm:grid-cols-1 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <div className='flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <Input
                    id='email'
                    type='email'
                    defaultValue={user?.email || ''}
                    disabled
                    className='flex-1'
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  Email cannot be changed. Contact support if you need to update
                  your email address.
                </p>
              </div>
              <div className='grid md:grid-cols-2 sm:grid-cols-1 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>First Name</Label>
                  <Input
                    id='firstName'
                    type='text'
                    defaultValue={user?.name?.split(' ')[0] || ''}
                    placeholder='Enter your First name'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Last Name</Label>
                  <Input
                    id='lastName'
                    type='text'
                    defaultValue={user?.name?.split(' ').slice(1).join(' ') || ''}
                    placeholder='Enter your Last name'
                  />
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2 pt-4 border-t'>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <p className='text-xs text-muted-foreground'>
                Changes will be saved to your profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Linking */}
      <AccountLinking />

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the appearance of your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h4 className='text-sm font-medium mb-3'>Theme</h4>
              <ThemeSelector />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
