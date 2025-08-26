'use client'

import { TeamMembersGate } from '@/components/subscription/feature-gate'
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
import { locationsApi } from '@/lib/api/locations'
import {
  userLocationAssignmentApi,
  type UserLocationAssignment,
} from '@/lib/api/user-location-assignments'
import { organization } from '@/lib/auth/client'
import { getRoleDisplayInfo } from '@/lib/utils/permissions'
import {
  AlertTriangle,
  Edit,
  Loader2,
  MapPin,
  Plus,
  Shield,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { InviteUserModal } from './InviteUserModal'
import { LocationAssignmentModal } from './LocationAssignmentModal'
import { PendingInvitations } from './PendingInvitations'

interface Member {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface Location {
  id: string
  name: string
  type: string
}

export function UserManagementCard() {
  const [members, setMembers] = useState<Member[]>([])
  const [assignments, setAssignments] = useState<UserLocationAssignment[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<Member | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [membersResult, assignmentsResult, locationsResult] =
        await Promise.all([
          organization.listMembers(),
          userLocationAssignmentApi.getAll(),
          locationsApi.getLocations(),
        ])

      if (membersResult.data) {
        const membersWithUserData = (membersResult.data.members || []).map(
          (member) => ({
            id: member.userId,
            name: member.user.name,
            email: member.user.email,
            role: member.role,
            createdAt: member.createdAt.toISOString(),
          })
        )
        setMembers(membersWithUserData)
      }

      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data)
      }

      setLocations(locationsResult || [])
    } catch (err) {
      console.warn('Failed to fetch user management data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const getUserAssignments = (userId: string) => {
    return assignments.filter((a) => a.userId === userId && a.isActive)
  }

  const handleManageLocations = (user: Member) => {
    setSelectedUser(user)
    setShowAssignmentModal(true)
  }

  const handleAssignmentSuccess = () => {
    setShowAssignmentModal(false)
    setSelectedUser(null)
    void fetchData() // Refresh data
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    void fetchData() // Refresh data
  }

  const getRoleBadge = (role: string) => {
    const roleInfo = getRoleDisplayInfo(role as any)
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

  const getLocationAccessSummary = (userId: string) => {
    const userAssignments = getUserAssignments(userId)
    if (userAssignments.length === 0) {
      return { text: 'No locations assigned', color: 'text-gray-500' }
    }

    const totalLocations = locations.length
    const assignedCount = userAssignments.length
    const hasManageAccess = userAssignments.some((a) => a.canManage)
    const hasWriteAccess = userAssignments.some((a) => a.canWrite)

    if (assignedCount === totalLocations) {
      return {
        text: `All ${totalLocations} locations`,
        color: hasManageAccess
          ? 'text-purple-600'
          : hasWriteAccess
            ? 'text-blue-600'
            : 'text-green-600',
      }
    }

    return {
      text: `${assignedCount} of ${totalLocations} locations`,
      color: hasManageAccess
        ? 'text-purple-600'
        : hasWriteAccess
          ? 'text-blue-600'
          : 'text-green-600',
    }
  }

  const isLocationRestrictedRole = (role: string) => {
    return ['inventoryManager', 'supervisor', 'staff', 'viewer'].includes(role)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin mr-2' />
          <span>Loading user management...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='text-center py-8'>
          <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-red-500' />
          <h3 className='text-lg font-medium mb-2'>Failed to load user data</h3>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <TeamMembersGate
        fallback={
          <Button disabled>
            <Plus className='mr-2 h-4 w-4' />
            Upgrade to add more users
          </Button>
        }
      >
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
            <div>
              <CardTitle className='flex items-center'>
                <Users className='mr-2 h-5 w-5' />
                User Management
              </CardTitle>
              <CardDescription>
                Manage team members and their location access permissions.
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Invite Member
            </Button>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                <Users className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                <h3 className='text-lg font-medium mb-2'>
                  No team members found
                </h3>
                <p className='mb-4'>
                  Invite team members to get started with collaboration.
                </p>
                <Button onClick={() => setShowInviteModal(true)}>
                  <Plus className='mr-2 h-4 w-4' />
                  Invite Your First Member
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location Access</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className='w-[120px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const locationSummary = getLocationAccessSummary(member.id)
                    const userAssignments = getUserAssignments(member.id)
                    const isRestricted = isLocationRestrictedRole(member.role)

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className='font-medium'>{member.name}</div>
                            <div className='text-sm text-muted-foreground'>
                              {member.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center space-x-2'>
                            {getRoleBadge(member.role)}
                            {isRestricted && (
                              <Shield className='h-4 w-4 text-amber-500' />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isRestricted ? (
                            <div className='flex items-center space-x-2'>
                              <MapPin className='h-4 w-4 text-muted-foreground' />
                              <span className={locationSummary.color}>
                                {locationSummary.text}
                              </span>
                              {userAssignments.length > 0 && (
                                <div className='flex space-x-1'>
                                  {userAssignments.some((a) => a.canManage) && (
                                    <Badge
                                      variant='outline'
                                      className='text-xs'
                                    >
                                      Manage
                                    </Badge>
                                  )}
                                  {userAssignments.some(
                                    (a) => a.canWrite && !a.canManage
                                  ) && (
                                    <Badge
                                      variant='outline'
                                      className='text-xs'
                                    >
                                      Write
                                    </Badge>
                                  )}
                                  {userAssignments.some(
                                    (a) =>
                                      a.canRead && !a.canWrite && !a.canManage
                                  ) && (
                                    <Badge
                                      variant='outline'
                                      className='text-xs'
                                    >
                                      Read
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className='flex items-center space-x-2 text-muted-foreground'>
                              <Shield className='h-4 w-4' />
                              <span>Full access (all locations)</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isRestricted && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleManageLocations(member)}
                              title='Manage location access'
                            >
                              <Edit className='h-3 w-3 mr-1' />
                              Locations
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TeamMembersGate>

      <PendingInvitations onRefresh={fetchData} />

      <InviteUserModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSuccess={handleInviteSuccess}
        locations={locations}
      />

      {selectedUser && (
        <LocationAssignmentModal
          open={showAssignmentModal}
          onOpenChange={setShowAssignmentModal}
          user={selectedUser}
          locations={locations}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </>
  )
}
