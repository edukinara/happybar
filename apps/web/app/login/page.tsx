'use client'

import { NewLogo } from '@/components/brand/new-logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth-context'
import { signIn } from '@/lib/auth/client'
import { CheckCircle, Loader2, Mail, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      const email = searchParams.get('email')
      const invitationId = searchParams.get('invitation')
      if (email) {
        if (invitationId) {
          setSuccess(
            `Registration successful! Please check your email at ${decodeURIComponent(email)} for a verification link. After verifying, you'll be able to accept your organization invitation.`
          )
        } else {
          setSuccess(
            `Registration successful! Please check your email at ${decodeURIComponent(email)} for a verification link to activate your account.`
          )
        }
      } else {
        setSuccess(
          'Registration successful! Please check your email for a verification link to activate your account.'
        )
      }
    }

    if (searchParams.get('verified') === 'true') {
      setSuccess('Email verified successfully! You can now sign in.')
    }

    // Handle error parameter from OAuth failures
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      
      // After successful login, check for invitation or redirect parameter
      const invitationId = searchParams.get('invitation')
      const redirect = searchParams.get('redirect')

      // In production, use window.location for reliable navigation after login
      if (typeof window !== 'undefined') {
        if (invitationId) {
          window.location.replace(`/accept-invitation/${invitationId}`)
        } else if (redirect) {
          window.location.replace(redirect)
        } else {
          window.location.replace('/dashboard')
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      // First check if user exists with this email
      const result = await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/login?google=callback`,
      })

      // Better Auth will handle the OAuth flow
      if (result.error) {
        if (
          result.error.message?.includes('User not found') ||
          result.error.message?.includes('Account not linked')
        ) {
          setError(
            'No account found with this Google email. Please sign in with your email and password first, then link your Google account from your profile settings.'
          )
        } else {
          setError(
            'Google sign-in failed. Please try again or use email and password.'
          )
        }
      }
    } catch (err: unknown) {
      console.error('Google sign-in error:', err)
      setError(
        'Google sign-in failed. Please try again or use email and password.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className='overflow-hidden p-0 bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-neutral-900 dark:via-purple-900/20 dark:to-neutral-900'>
      <div className='absolute -top-20 -left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <div className='absolute -bottom-20 -right-20 lg:right-[45%] w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <div className='grid min-h-svh lg:grid-cols-2'>
        <div className='flex flex-col gap-4 p-6 md:p-10'>
          <div className='flex justify-center gap-2 md:justify-start'>
            <Link href='/' className='flex items-center gap-2 font-medium'>
              <div className='flex flex-row gap-1 items-center'>
                <NewLogo className='size-10' />
                <span className='font-bold tracking-tight text-xl text-nowrap'>
                  Happy Bar
                </span>
              </div>
            </Link>
          </div>
          <div className='flex flex-1 items-center justify-center'>
            <div className='w-full max-w-sm'>
              <div className='p-8'>
                <div className='text-center space-y-4 py-4 pb-8'>
                  <div className='gap-1'>
                    <p className='text-2xl font-bold'>Welcome back</p>
                    <p className='text-base'>
                      Sign in to manage your inventory
                    </p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  {error && (
                    <Alert
                      variant={
                        error.includes('verification') ||
                        error.includes('verify your account')
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {(error.includes('verification') ||
                        error.includes('verify your account')) && (
                        <Mail className='size-4' />
                      )}
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert
                      variant='default'
                      className={
                        success.includes('check your email')
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
                          : ''
                      }
                    >
                      {success.includes('check your email') ? (
                        <Mail className='size-4' />
                      ) : (
                        <CheckCircle className='size-4' />
                      )}
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='you@company.com'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='password'>Password</Label>
                    <Input
                      id='password'
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type='submit'
                    className='w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transition-all transform hover:scale-[1.02]'
                    disabled={loading || googleLoading}
                    loading={loading}
                  >
                    <>
                      <Sparkles className='mr-2 size-4' />
                      Sign In
                    </>
                  </Button>
                </form>

                {/* Divider */}
                <div className='mt-6 mb-6'>
                  <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-background px-2 text-muted-foreground'>
                        Or
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Sign-in Button */}
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      Signing in with Google...
                    </>
                  ) : (
                    <>
                      <svg className='mr-2 size-4' viewBox='0 0 24 24'>
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
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className='mt-6 text-center text-sm text-muted-foreground border-t pt-6'>
                  <p>
                    Don&apos;t have an account?{' '}
                    <a
                      href='/register'
                      className='text-purple-600 hover:text-purple-700 hover:underline font-medium'
                    >
                      Get started
                    </a>
                  </p>
                  <p className='text-xs mt-2 opacity-75'>
                    Join the Happy Bar community today
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='bg-muted relative hidden lg:block'>
          <Image
            src='/login_side.webp'
            alt='Image'
            className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.8] dark:grayscale'
            width={1024}
            height={1024}
            priority={false}
          />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
