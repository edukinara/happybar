'use client'

import { NewLogo } from '@/components/brand/new-logo'
import { HappyBarLoader } from '@/components/HappyBarLoader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth-context'
import { Loader2, Mail, UserPlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const { register } = useAuth()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitation')
  const isInvitationFlow = !!invitationId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check both password fields.')
      return
    }

    // Basic password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      if (isInvitationFlow) {
        // For invitation flow, just create the user account (no organization)
        await register({
          firstName,
          lastName,
          email,
          password,
          companyName: '',
        })
      } else {
        // Regular registration flow - create user and organization
        await register({ firstName, lastName, email, password, companyName })
      }

      // Show success message instead of redirecting
      setRegistrationSuccess(true)
      setRegisteredEmail(email)
      setLoading(false)

      // Clear form
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setCompanyName('')
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined
      setError(errorMessage || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show success message if registration completed
  if (registrationSuccess) {
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
                      <p className='text-2xl font-bold'>
                        Registration Successful!
                      </p>
                      <p className='text-base'>
                        We&apos;ve sent a verification email to{' '}
                        <strong>{registeredEmail}</strong>
                      </p>
                    </div>
                  </div>
                  <Alert className='border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'>
                    <Mail className='size-4' />
                    <AlertDescription>
                      Please check your inbox and click the verification link to
                      activate your account. The link will automatically log you
                      in and redirect you to{' '}
                      {isInvitationFlow
                        ? 'accept your organization invitation'
                        : 'your dashboard'}
                      .
                    </AlertDescription>
                  </Alert>

                  <div className='text-center text-sm text-muted-foreground'>
                    <p>Didn&apos;t receive the email?</p>
                    <p className='mt-2'>
                      Check your spam folder or{' '}
                      <button
                        onClick={() => {
                          setRegistrationSuccess(false)
                          setError('Please try registering again.')
                        }}
                        className='text-purple-600 hover:text-purple-700 hover:underline font-medium'
                      >
                        try again
                      </button>
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
            <div className='w-full max-w-md'>
              <div className='p-8'>
                <div className='text-center space-y-4 py-4 pb-8'>
                  <div className='gap-1'>
                    <p className='text-2xl font-bold'>Create your account</p>
                    <p className='text-base'>
                      {isInvitationFlow
                        ? 'Create your account to accept the organization invitation.'
                        : 'Start managing your bar inventory with ease.'}
                    </p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  {error && (
                    <Alert variant='destructive'>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='firstName'>First Name</Label>
                      <Input
                        id='firstName'
                        type='text'
                        placeholder='John'
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='lastName'>Last Name</Label>
                      <Input
                        id='lastName'
                        type='text'
                        placeholder='Doe'
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

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
                      minLength={8}
                      placeholder='Minimum 8 characters'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='confirmPassword'>Confirm Password</Label>
                    <Input
                      id='confirmPassword'
                      type='password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder='Re-enter your password'
                    />
                  </div>

                  {!isInvitationFlow && (
                    <div className='space-y-2'>
                      <Label htmlFor='companyName'>Company Name</Label>
                      <Input
                        id='companyName'
                        type='text'
                        placeholder='Happy Bar Inc.'
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <Button
                    type='submit'
                    className='w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transition-all transform hover:scale-[1.02]'
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className='mr-2 size-4' />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                <div className='mt-6 text-center text-sm text-muted-foreground border-t pt-6'>
                  <p>
                    Already have an account?{' '}
                    <a
                      href='/login'
                      className='text-purple-600 hover:text-purple-700 hover:underline font-medium'
                    >
                      Sign in
                    </a>
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-full flex items-center justify-center'>
          <HappyBarLoader />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
