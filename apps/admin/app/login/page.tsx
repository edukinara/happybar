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
import { useAuth } from '@/lib/auth'
import { AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, login: authLogin } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await authLogin(email, password)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center relative overflow-hidden'>
      {/* Animated background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-neutral-900 dark:via-purple-900/20 dark:to-neutral-900' />

      {/* Floating shapes for visual interest */}
      <div className='absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse dark:opacity-10' />
      <div className='absolute bottom-20 right-20 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000 dark:opacity-10' />
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-10 dark:opacity-5' />

      <div className='max-w-md w-full space-y-8 relative z-10 px-4'>
        <Card className='border-purple-100 dark:border-purple-900/50 shadow-xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur'>
          <CardHeader className='space-y-4 text-center pb-8 pt-8'>
            <div className='flex justify-center'>
              <Logo size='lg' />
            </div>
            <div className='space-y-2'>
              <CardTitle className='text-2xl font-bold'>Welcome back</CardTitle>
              <CardDescription>
                Sign in to your admin account to continue
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              {error && (
                <Alert variant='destructive'>
                  <AlertCircle className='size-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className='space-y-2'>
                <Label htmlFor='email'>Email address</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin@happybar.io'
                  disabled={isLoading}
                  className='border-purple-200 dark:border-purple-900/50 focus:border-purple-400 dark:focus:border-purple-700'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Enter your password'
                    disabled={isLoading}
                    className='border-purple-200 dark:border-purple-900/50 focus:border-purple-400 dark:focus:border-purple-700 pr-10'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='size-4 text-gray-400' />
                    ) : (
                      <Eye className='size-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type='submit'
                className='w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transition-all transform hover:scale-[1.02]'
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='size-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    Signing in...
                  </span>
                ) : (
                  <span className='flex items-center justify-center gap-2'>
                    <Sparkles className='size-4' />
                    Sign In
                  </span>
                )}
              </Button>
            </form>

            <div className='text-center text-sm text-muted-foreground pt-6 mt-6 border-t'>
              <p className='font-medium'>Admin access only</p>
              <p className='text-xs mt-1 opacity-75'>
                Contact support for access: admin@happybar.io
              </p>
            </div>
          </CardContent>
        </Card>

        <div className='text-center'>
          <p className='text-xs text-muted-foreground'>
            © 2024 Happy Bar. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
