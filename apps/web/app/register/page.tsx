'use client'

import { Logo } from '@/components/brand/logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Loader2, UserPlus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const { register } = useAuth()
  const router = useRouter()
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
        // Redirect back to accept invitation page
        router.push(`/accept-invitation/${invitationId}`)
      } else {
        // Regular registration flow - create user and organization
        await register({ firstName, lastName, email, password, companyName })
        router.push('/login?registered=true')
      }
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

  return (
    <div className='min-h-screen flex items-center justify-center relative overflow-hidden p-4'>
      {/* Animated background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-neutral-900 dark:via-purple-900/20 dark:to-neutral-900' />

      {/* Floating shapes for visual interest */}
      <div className='absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <div className='absolute bottom-20 right-20 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <Card className='w-full max-w-lg relative z-10 border-purple-100 dark:border-purple-900/50 shadow-xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur'>
        <CardHeader className='text-center space-y-2 py-4'>
          <div className='flex justify-center'>
            <Logo size='lg' />
          </div>
          <div className='gap-1'>
            <CardTitle className='text-2xl'>Create your account</CardTitle>
            <CardDescription>
              {isInvitationFlow
                ? 'Create your account to accept the organization invitation.'
                : 'Start managing your bar inventory with ease.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
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
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className='mr-2 h-4 w-4' />
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
            <p className='text-xs mt-2 opacity-75'>
              Join the Happy Bar community today
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
