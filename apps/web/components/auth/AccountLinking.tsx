'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  accountLinkingApi,
  type LinkedAccount,
} from '@/lib/api/account-linking'
import { signIn, useSession } from '@/lib/auth/client'
import { Link2, Loader2, Unlink, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function AccountLinking() {
  const { data: session } = useSession()
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLinkedAccounts = async () => {
    try {
      setLoading(true)
      const accounts = await accountLinkingApi.getLinkedAccounts()
      setLinkedAccounts(accounts)
    } catch (error) {
      console.warn('Failed to fetch linked accounts:', error)
      toast.error('Failed to load linked accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchLinkedAccounts()
    }
  }, [session?.user])

  const handleLinkGoogle = async () => {
    setLinking(true)
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/dashboard/account`,
      })

      if (result.error) {
        toast.error('Failed to link Google account', {
          description: result.error.message || 'Please try again',
        })
      } else {
        toast.success('Google account linked successfully')
        await fetchLinkedAccounts()
      }
    } catch (error) {
      console.warn('Google linking error:', error)
      toast.error('Failed to link Google account')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkAccount = async (accountId: string, provider: string) => {
    if (!confirm(`Are you sure you want to unlink your ${provider} account?`)) {
      return
    }

    setUnlinking(accountId)
    try {
      await accountLinkingApi.unlinkAccount(accountId)
      toast.success(`${provider} account unlinked successfully`)
      await fetchLinkedAccounts()
    } catch (error) {
      console.warn('Unlinking error:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to unlink ${provider} account`
      toast.error(errorMessage)
    } finally {
      setUnlinking(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Link2 className='mr-2 h-5 w-5' />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage social accounts linked to your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' />
            <span>Loading connected accounts...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center'>
          <Link2 className='mr-2 h-5 w-5' />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          Link social accounts to make signing in easier
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {linkedAccounts.length > 0 && (
          <div className='space-y-3'>
            <h4 className='text-sm font-medium'>Linked Accounts</h4>
            {linkedAccounts.map((account) => (
              <div
                key={account.id}
                className='flex items-center justify-between p-3 border rounded-lg'
              >
                <div className='flex items-center space-x-3'>
                  <div className='w-8 h-8 bg-primary rounded-full flex items-center justify-center'>
                    {account.provider === 'google' ? (
                      <svg className='w-4 h-4 text-white' viewBox='0 0 24 24'>
                        <path
                          fill='currentColor'
                          d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                        />
                        <path
                          fill='currentColor'
                          d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                        />
                        <path
                          fill='currentColor'
                          d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                        />
                        <path
                          fill='currentColor'
                          d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                        />
                      </svg>
                    ) : (
                      <User className='w-4 h-4 text-white' />
                    )}
                  </div>
                  <div>
                    <p className='font-medium capitalize'>{account.provider}</p>
                    <p className='text-sm text-muted-foreground'>
                      Connected{' '}
                      {new Date(account.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    handleUnlinkAccount(account.id, account.provider)
                  }
                  disabled={unlinking === account.id}
                >
                  {unlinking === account.id ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Unlink className='h-4 w-4' />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!linkedAccounts.find((account) => account.provider === 'google') && (
          <div className='space-y-3'>
            <h4 className='text-sm font-medium'>Available Connections</h4>

            {/* Google Account Linking */}
            <div className='flex items-center justify-between p-3 border rounded-lg'>
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-red-500 rounded-full flex items-center justify-center'>
                  <svg className='w-4 h-4 text-white' viewBox='0 0 24 24'>
                    <path
                      fill='currentColor'
                      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                    />
                    <path
                      fill='currentColor'
                      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                    />
                    <path
                      fill='currentColor'
                      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                    />
                    <path
                      fill='currentColor'
                      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                    />
                  </svg>
                </div>
                <div>
                  <p className='font-medium'>Google</p>
                  <p className='text-sm text-muted-foreground'>
                    Sign in faster with your Google account
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                onClick={handleLinkGoogle}
                disabled={linking}
              >
                {linking ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className='mr-2 h-4 w-4' />
                    Link Account
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <Alert>
          <Link2 className='h-4 w-4' />
          <AlertDescription>
            Linking social accounts allows you to sign in using those providers
            while maintaining your current account and all associated data.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
