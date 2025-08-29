'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { organization } from '@/lib/auth/client'
import { getRoleDisplayInfo } from '@/lib/utils/permissions'
import type { HappyBarRole } from '@happy-bar/types'
import {
  AlertTriangle,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  UserX,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface PendingInvitation {
  id: string
  email: string
  role: HappyBarRole
  createdAt?: string
  expiresAt?: string | Date
  status: 'pending' | 'expired'
}

interface PendingInvitationsProps {
  onRefresh?: () => void
}

export function PendingInvitations({ onRefresh }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await organization.listInvitations()

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch invitations')
      }

      if (result.data) {
        // The data is directly an array of invitations from Better Auth
        const invitationsList = Array.isArray(result.data) ? result.data : []
        setInvitations(
          invitationsList.map((inv) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            createdAt: inv.expiresAt.toISOString() || new Date().toISOString(),
            expiresAt: inv.expiresAt,
            status: inv.status === 'pending' ? 'pending' : 'expired',
          }))
        )
      } else {
        setInvitations([])
      }
    } catch (err) {
      console.warn('Failed to fetch pending invitations:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load invitations'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchInvitations()
  }, [])

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setCancellingIds((prev) => new Set(prev.add(invitationId)))

      const result = await organization.cancelInvitation({
        invitationId,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Failed to cancel invitation')
      }

      toast.success('Invitation cancelled successfully')

      // Remove from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))

      // Trigger refresh of parent component if needed
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.warn('Failed to cancel invitation:', error)
      toast.error('Failed to cancel invitation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    } finally {
      setCancellingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  const handleResendInvitation = async (email: string, role: string) => {
    try {
      // Map role to Better Auth standard roles
      const authRole =
        role === 'admin'
          ? 'admin'
          : role === 'owner'
            ? 'owner'
            : ('member' as HappyBarRole)

      const result = await organization.inviteMember({
        email,
        role: authRole,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Failed to resend invitation')
      }

      toast.success('Invitation resent successfully')
      await fetchInvitations() // Refresh the list
    } catch (error) {
      console.warn('Failed to resend invitation:', error)
      toast.error('Failed to resend invitation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    }
  }

  const getRoleBadge = (role: HappyBarRole) => {
    const roleInfo = getRoleDisplayInfo(role)
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      gray: 'bg-gray-100 text-gray-800',
      slate: 'bg-slate-100 text-slate-800',
    }

    return (
      <Badge className={colorMap[roleInfo.color] || colorMap.gray}>
        {roleInfo.title}
      </Badge>
    )
  }

  const getStatusBadge = (invitation: PendingInvitation) => {
    if (invitation.status === 'expired') {
      return <Badge variant='destructive'>Expired</Badge>
    }

    return <Badge variant='secondary'>Pending</Badge>
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8'>
          <Loader2 className='size-6 animate-spin mr-2' />
          <span>Loading pending invitations...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='text-center py-8'>
          <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-red-500' />
          <h3 className='text-lg font-medium mb-2'>
            Failed to load invitations
          </h3>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchInvitations}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Clock className='mr-2 size-5' />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Manage pending team member invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-muted-foreground'>
            <Mail className='h-12 w-12 mx-auto mb-4 text-gray-300' />
            <h3 className='text-lg font-medium mb-2'>No pending invitations</h3>
            <p>All invitations have been accepted or expired.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
        <div>
          <CardTitle className='flex items-center'>
            <Clock className='mr-2 size-5' />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Manage pending team member invitations.
          </CardDescription>
        </div>
        <Button variant='outline' size='sm' onClick={fetchInvitations}>
          <RefreshCw className='size-4 mr-2' />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className='w-[140px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div className='flex items-center space-x-2'>
                    <Mail className='size-4 text-muted-foreground' />
                    <span className='font-medium'>{invitation.email}</span>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                <TableCell>{getStatusBadge(invitation)}</TableCell>
                <TableCell className='text-muted-foreground'>
                  {formatDate(invitation.createdAt)}
                </TableCell>
                <TableCell>
                  <div className='flex items-center space-x-2'>
                    {invitation.status === 'expired' ? (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          handleResendInvitation(
                            invitation.email,
                            invitation.role
                          )
                        }
                      >
                        <RefreshCw className='size-3 mr-1' />
                        Resend
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={cancellingIds.has(invitation.id)}
                          >
                            {cancellingIds.has(invitation.id) ? (
                              <Loader2 className='size-3 animate-spin' />
                            ) : (
                              <>
                                <X className='size-3 mr-1' />
                                Cancel
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className='flex items-center'>
                              <UserX className='mr-2 size-5' />
                              Cancel Invitation
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel the invitation for{' '}
                              <strong>{invitation.email}</strong>? They will no
                              longer be able to accept this invitation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Keep Invitation
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleCancelInvitation(invitation.id)
                              }
                              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            >
                              Cancel Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
