'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  userLocationAssignmentApi,
  type UserLocationAssignment,
  type UserLocationData,
} from '@/lib/api/user-location-assignments'
import { Building2, Edit, Eye, Loader2, MapPin, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface Location {
  id: string
  name: string
  type: string
}

interface LocationPermissions {
  canRead: boolean
  canWrite: boolean
  canManage: boolean
}

interface LocationAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Member
  locations: Location[]
  onSuccess: () => void
}

export function LocationAssignmentModal({
  open,
  onOpenChange,
  user,
  locations,
  onSuccess,
}: LocationAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<UserLocationData | null>(null)
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    new Set()
  )
  const [permissions, setPermissions] = useState<
    Record<string, LocationPermissions>
  >({})
  const [saving, setSaving] = useState(false)

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const result = await userLocationAssignmentApi.getUserAssignments(user.id)

      if (result.success) {
        setUserData(result.data)

        // Set currently assigned locations
        const assignedLocationIds = result.data.assignments
          .filter((a) => a.isActive)
          .map((a) => a.locationId)
        setSelectedLocations(new Set(assignedLocationIds))

        // Set current permissions
        const currentPermissions: Record<string, LocationPermissions> = {}
        result.data.assignments
          .filter((a) => a.isActive)
          .forEach((assignment) => {
            currentPermissions[assignment.locationId] = {
              canRead: assignment.canRead,
              canWrite: assignment.canWrite,
              canManage: assignment.canManage,
            }
          })
        setPermissions(currentPermissions)
      }
    } catch (error) {
      console.warn('Failed to fetch user assignments:', error)
      toast.error('Failed to load user location data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && user) {
      void fetchUserData()
    } else {
      // Reset state when modal closes
      setUserData(null)
      setSelectedLocations(new Set())
      setPermissions({})
    }
  }, [open, user])

  const handleLocationToggle = (locationId: string, checked: boolean) => {
    const newSelected = new Set(selectedLocations)

    if (checked) {
      newSelected.add(locationId)
      // Set default permissions for new assignments
      if (!permissions[locationId]) {
        setPermissions((prev) => ({
          ...prev,
          [locationId]: {
            canRead: true,
            canWrite: false,
            canManage: false,
          },
        }))
      }
    } else {
      newSelected.delete(locationId)
      // Remove permissions for unselected locations
      setPermissions((prev) => {
        const updated = { ...prev }
        delete updated[locationId]
        return updated
      })
    }

    setSelectedLocations(newSelected)
  }

  const handlePermissionChange = (
    locationId: string,
    permissionType: keyof LocationPermissions,
    checked: boolean
  ) => {
    setPermissions((prev) => {
      const locationPerms = prev[locationId] || {
        canRead: true,
        canWrite: false,
        canManage: false,
      }
      const updated = { ...locationPerms, [permissionType]: checked }

      // Ensure permission hierarchy: manage > write > read
      if (permissionType === 'canManage' && checked) {
        updated.canWrite = true
        updated.canRead = true
      } else if (permissionType === 'canWrite' && checked) {
        updated.canRead = true
      } else if (permissionType === 'canRead' && !checked) {
        updated.canWrite = false
        updated.canManage = false
      } else if (permissionType === 'canWrite' && !checked) {
        updated.canManage = false
      }

      return {
        ...prev,
        [locationId]: updated,
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Prepare bulk assignment data
      const locationIds = Array.from(selectedLocations)

      if (locationIds.length === 0) {
        // Remove all assignments if none selected
        await userLocationAssignmentApi.bulkAssign({
          userId: user.id,
          locationIds: [],
          permissions: { canRead: true, canWrite: false, canManage: false },
        })
      } else {
        // For simplicity, we'll use the most common permission level
        // In a more sophisticated implementation, you'd handle individual permissions per location
        const hasAnyManage = locationIds.some(
          (id) => permissions[id]?.canManage
        )
        const hasAnyWrite = locationIds.some((id) => permissions[id]?.canWrite)

        await userLocationAssignmentApi.bulkAssign({
          userId: user.id,
          locationIds,
          permissions: {
            canRead: true,
            canWrite: hasAnyWrite,
            canManage: hasAnyManage,
          },
        })

        // Handle individual location permissions if they differ
        for (const locationId of locationIds) {
          const locationPerms = permissions[locationId]
          if (
            locationPerms &&
            (locationPerms.canManage !== hasAnyManage ||
              locationPerms.canWrite !== hasAnyWrite)
          ) {
            // Find the assignment and update it individually
            const assignment = userData?.assignments.find(
              (a) => a.locationId === locationId && a.isActive
            )
            if (assignment) {
              await userLocationAssignmentApi.updateAssignment(
                assignment.id,
                locationPerms
              )
            }
          }
        }
      }

      toast.success('Location assignments updated successfully')
      onSuccess()
    } catch (error) {
      console.warn('Failed to save location assignments:', error)
      toast.error('Failed to update location assignments')
    } finally {
      setSaving(false)
    }
  }

  const getLocationTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      STORAGE: 'bg-blue-100 text-blue-800',
      BAR: 'bg-purple-100 text-purple-800',
      KITCHEN: 'bg-orange-100 text-orange-800',
      RETAIL: 'bg-green-100 text-green-800',
      WAREHOUSE: 'bg-gray-100 text-gray-800',
      OFFICE: 'bg-slate-100 text-slate-800',
    }

    return (
      <Badge className={typeColors[type] || typeColors.STORAGE}>
        {type.toLowerCase()}
      </Badge>
    )
  }

  const getCurrentAssignment = (
    locationId: string
  ): UserLocationAssignment | undefined => {
    return userData?.assignments.find(
      (a) => a.locationId === locationId && a.isActive
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <MapPin className='mr-2 size-5' />
            Manage Location Access - {user.name}
          </DialogTitle>
          <DialogDescription>
            Configure which locations {user.name} can access and their
            permission level for each location. Role:{' '}
            <strong>{user.role}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='size-6 animate-spin mr-2' />
            <span>Loading current assignments...</span>
          </div>
        ) : (
          <ScrollArea className='flex-1 -mx-6 px-6'>
            <div className='space-y-4'>
              {locations.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Building2 className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <p>No locations available</p>
                </div>
              ) : (
                locations.map((location) => {
                  const isSelected = selectedLocations.has(location.id)
                  const locationPerms = permissions[location.id] || {
                    canRead: true,
                    canWrite: false,
                    canManage: false,
                  }
                  const currentAssignment = getCurrentAssignment(location.id)

                  return (
                    <div
                      key={location.id}
                      className='border rounded-lg p-4 space-y-3'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleLocationToggle(
                                location.id,
                                checked as boolean
                              )
                            }
                          />
                          <div>
                            <div className='flex items-center space-x-2'>
                              <h4 className='font-medium'>{location.name}</h4>
                              {getLocationTypeBadge(location.type)}
                            </div>
                            {currentAssignment && (
                              <p className='text-xs text-muted-foreground'>
                                Currently assigned with{' '}
                                {currentAssignment.canManage
                                  ? 'manage'
                                  : currentAssignment.canWrite
                                    ? 'write'
                                    : 'read'}{' '}
                                access
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className='ml-6 space-y-2'>
                          <p className='text-sm text-muted-foreground mb-2'>
                            Permission Level:
                          </p>
                          <div className='space-y-2'>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                checked={locationPerms.canRead}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    location.id,
                                    'canRead',
                                    checked as boolean
                                  )
                                }
                              />
                              <Eye className='size-4 text-muted-foreground' />
                              <Label className='text-sm'>
                                Read - View inventory and data
                              </Label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                checked={locationPerms.canWrite}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    location.id,
                                    'canWrite',
                                    checked as boolean
                                  )
                                }
                              />
                              <Edit className='size-4 text-muted-foreground' />
                              <Label className='text-sm'>
                                Write - Modify inventory and perform transfers
                              </Label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                checked={locationPerms.canManage}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    location.id,
                                    'canManage',
                                    checked as boolean
                                  )
                                }
                              />
                              <Shield className='size-4 text-muted-foreground' />
                              <Label className='text-sm'>
                                Manage - Full control including settings
                              </Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className='mr-2 size-4 animate-spin' />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
