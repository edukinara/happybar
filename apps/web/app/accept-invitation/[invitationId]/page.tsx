'use client'

import { HappBarLoader } from '@/components/HappyBarLoader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { organization } from '@/lib/auth/client'
import { CheckCircle, Mail, UserPlus, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface InvitationData {
  id: string
  email: string
  role: string
  organizationId: string
  status: string
  expiresAt: string
  organization?: {
    id: string
    name: string
    slug: string
  }
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const invitationId = params.invitationId as string

  useEffect(() => {
    // Skip fetching invitation details since Better Auth doesn't expose a public endpoint
    // We'll show a generic invitation acceptance page instead
    setLoading(false)
    setInvitation({
      id: invitationId,
      email: '',
      role: '',
      organizationId: '',
      status: 'pending',
      expiresAt: '',
    })
  }, [invitationId])

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return

    try {
      setAccepting(true)

      const result = await organization.acceptInvitation({
        invitationId: invitation.id,
      })

      if (result.error) {
        toast.error('Failed to accept invitation', {
          description: result.error.message || 'An unexpected error occurred',
        })
        return
      }

      setAccepted(true)
      toast.success('Invitation accepted successfully!', {
        description: `Welcome to ${invitation.organization?.name || 'the organization'}`,
      })

      // Apply pending assignments and set up user after successful invitation acceptance
      try {
        // First, get the user's membership to find the organization ID
        const userResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`,
          {
            credentials: 'include',
          }
        )

        if (userResponse.ok) {
          const userData = await userResponse.json()
          const organizationId = userData.data?.member?.organizationId

          if (organizationId) {
            const setupResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/apply-pending-assignments`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  organizationId,
                }),
              }
            )

            if (setupResponse.ok) {
              // Give a moment for the session to be updated, then redirect
              setTimeout(() => {
                window.location.href = '/dashboard'
              }, 500)
              return // Exit early to avoid the setTimeout redirect
            }
          }
        }
      } catch (setupError) {
        console.warn('Failed to apply post-invitation setup:', setupError)
      }

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.warn('Failed to accept invitation:', error)
      toast.error('Failed to accept invitation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    } finally {
      setAccepting(false)
    }
  }

  const handleRejectInvitation = async () => {
    if (!invitation) return

    try {
      const result = await organization.rejectInvitation({
        invitationId: invitation.id,
      })

      if (result.error) {
        toast.error('Failed to reject invitation', {
          description: result.error.message || 'An unexpected error occurred',
        })
        return
      }

      toast.success('Invitation rejected')
      router.push('/')
    } catch (error) {
      console.warn('Failed to reject invitation:', error)
      toast.error('Failed to reject invitation')
    }
  }

  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardContent className='flex items-center justify-center py-8'>
            <HappBarLoader showText={false} size='sm' />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <XCircle className='h-12 w-12 mx-auto mb-4 text-red-500' />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className='flex justify-center'>
            <Link href='/'>
              <Button variant='outline'>Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <Mail className='h-12 w-12 mx-auto mb-4 text-blue-500' />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in or create an account to accept this
              invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex flex-col space-y-2'>
            <Link href={`/login?invitation=${invitationId}`} className='w-full'>
              <Button className='w-full'>Sign In</Button>
            </Link>
            <Link
              href={`/register?invitation=${invitationId}`}
              className='w-full'
            >
              <Button variant='outline' className='w-full'>
                Create Account
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <CheckCircle className='h-12 w-12 mx-auto mb-4 text-green-500' />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              Welcome to {invitation?.organization?.name || 'the organization'}.
              Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <XCircle className='h-12 w-12 mx-auto mb-4 text-red-500' />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation may have expired or been revoked.
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex justify-center'>
            <Link href='/'>
              <Button variant='outline'>Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (invitation.status !== 'pending') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <XCircle className='h-12 w-12 mx-auto mb-4 text-red-500' />
            <CardTitle>
              Invitation{' '}
              {invitation.status === 'expired' ? 'Expired' : 'Unavailable'}
            </CardTitle>
            <CardDescription>
              This invitation is no longer available.
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex justify-center'>
            <Link href='/'>
              <Button variant='outline'>Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <UserPlus className='h-12 w-12 mx-auto mb-4 text-blue-500' />
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join an organization on Happy Bar.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='text-center'>
            <p className='text-muted-foreground'>
              Click the button below to accept your invitation and join the
              organization.
            </p>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col space-y-2'>
          <Button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className='w-full'
          >
            {accepting && <HappBarLoader size='sm' />}
            Accept Invitation
          </Button>
          <Button
            variant='outline'
            onClick={handleRejectInvitation}
            disabled={accepting}
            className='w-full'
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
