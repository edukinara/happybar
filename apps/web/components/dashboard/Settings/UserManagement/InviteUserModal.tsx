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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { organization } from '@/lib/auth/client'
import { getRoleDisplayInfo } from '@/lib/utils/permissions'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Mail, MapPin, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum([
    'admin',
    'manager',
    'inventoryManager',
    'buyer',
    'supervisor',
    'staff',
    'viewer',
  ]),
  locationIds: z.array(z.string()).optional(),
  permissions: z
    .object({
      canRead: z.boolean(),
      canWrite: z.boolean(),
      canManage: z.boolean(),
    })
    .optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface Location {
  id: string
  name: string
  type: string
}

interface InviteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  locations?: Location[]
}

const availableRoles = [
  'admin',
  'manager',
  'inventoryManager',
  'buyer',
  'supervisor',
  'staff',
  'viewer',
] as const

export function InviteUserModal({
  open,
  onOpenChange,
  onSuccess,
  locations = [],
}: InviteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'staff' as const,
      locationIds: [],
      permissions: {
        canRead: true,
        canWrite: false,
        canManage: false,
      },
    },
  })

  const selectedRole = form.watch('role')
  const selectedLocationIds = form.watch('locationIds') || []

  // Helper function to check if a role needs location assignment
  const isLocationRestrictedRole = (role: string) => {
    return ['inventoryManager', 'supervisor', 'staff', 'viewer'].includes(role)
  }

  const handleSubmit = async (data: InviteFormData) => {
    try {
      setIsLoading(true)

      // Validate location assignments for restricted roles
      if (
        isLocationRestrictedRole(data.role) &&
        (!data.locationIds || data.locationIds.length === 0)
      ) {
        toast.error('Location assignment required', {
          description: 'Please select at least one location for this role.',
        })
        return
      }

      // Use Better Auth organization invite with the actual role
      // Better Auth now supports all our custom roles directly
      const result = await organization.inviteMember({
        email: data.email,
        role: data.role, // Send the actual role directly
      })

      if (result.error) {
        toast.error('Failed to send invitation', {
          description: result.error.message || 'An unexpected error occurred',
        })
        return
      }

      // Store pending location assignments if applicable
      if (
        isLocationRestrictedRole(data.role) &&
        data.locationIds &&
        data.locationIds.length > 0 &&
        data.permissions
      ) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/pending-assignments`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                email: data.email,
                locationIds: data.locationIds,
                permissions: data.permissions,
              }),
            }
          )

          if (!response.ok) {
            console.warn('Failed to store pending location assignments')
          }
        } catch (error) {
          console.warn('Failed to store pending location assignments:', error)
        }
      }

      let successMessage = `${data.email} will receive an email invitation to join your organization.`

      if (
        isLocationRestrictedRole(data.role) &&
        data.locationIds &&
        data.locationIds.length > 0
      ) {
        const locationNames = data.locationIds
          .map(
            (id) => locations.find((loc) => loc.id === id)?.name || 'Unknown'
          )
          .join(', ')
        successMessage += ` Location access will be automatically configured for: ${locationNames}.`
      }

      toast.success('Invitation sent successfully', {
        description: successMessage,
      })

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.warn('Failed to invite user:', error)
      toast.error('Failed to send invitation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <UserPlus className='mr-2 h-5 w-5' />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new team member to your organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                      <Input
                        placeholder='colleague@example.com'
                        className='pl-10'
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    They&apos;ll receive an email invitation to join your
                    organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => {
                        const roleInfo = getRoleDisplayInfo(role)
                        return (
                          <SelectItem key={role} value={role}>
                            <div className='flex items-center space-x-2'>
                              <span>{roleInfo.title}</span>
                              <span className='text-xs text-muted-foreground'>
                                ({roleInfo.description})
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the appropriate role for this team member.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Assignment for Restricted Roles */}
            {isLocationRestrictedRole(selectedRole) && (
              <>
                <FormField
                  control={form.control}
                  name='locationIds'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center'>
                        <Building2 className='mr-2 h-4 w-4' />
                        Location Access
                        <Badge variant='secondary' className='ml-2 text-xs'>
                          Required
                        </Badge>
                      </FormLabel>
                      <FormDescription>
                        Select which locations this user can access. They will
                        be restricted to these locations only.
                      </FormDescription>
                      <FormControl>
                        <div className='space-y-3 max-h-48 overflow-y-auto border rounded-md p-3'>
                          {locations.length === 0 ? (
                            <div className='text-center py-4 text-muted-foreground'>
                              <MapPin className='h-8 w-8 mx-auto mb-2 text-gray-300' />
                              <p className='text-sm'>No locations available</p>
                              <p className='text-xs'>
                                Create locations first to assign access
                              </p>
                            </div>
                          ) : (
                            locations.map((location) => (
                              <div
                                key={location.id}
                                className='flex items-center space-x-2'
                              >
                                <Checkbox
                                  id={`location-${location.id}`}
                                  checked={selectedLocationIds.includes(
                                    location.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    const currentIds = field.value || []
                                    if (checked) {
                                      field.onChange([
                                        ...currentIds,
                                        location.id,
                                      ])
                                    } else {
                                      field.onChange(
                                        currentIds.filter(
                                          (id) => id !== location.id
                                        )
                                      )
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`location-${location.id}`}
                                  className='flex items-center space-x-2 cursor-pointer flex-1'
                                >
                                  <MapPin className='h-4 w-4 text-muted-foreground' />
                                  <span className='font-medium'>
                                    {location.name}
                                  </span>
                                  <Badge variant='outline' className='text-xs'>
                                    {location.type}
                                  </Badge>
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Permission Level for Selected Locations */}
                {selectedLocationIds.length > 0 && (
                  <FormField
                    control={form.control}
                    name='permissions'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permission Level</FormLabel>
                        <FormDescription>
                          Set the permission level for the selected locations.
                        </FormDescription>
                        <FormControl>
                          <div className='space-y-2 border rounded-md p-3'>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                id='perm-read'
                                checked={field.value?.canRead || false}
                                onCheckedChange={(checked) => {
                                  field.onChange({
                                    ...field.value,
                                    canRead: checked,
                                  })
                                }}
                              />
                              <label
                                htmlFor='perm-read'
                                className='cursor-pointer'
                              >
                                <span className='font-medium'>Read Access</span>
                                <p className='text-xs text-muted-foreground'>
                                  View inventory and data
                                </p>
                              </label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                id='perm-write'
                                checked={field.value?.canWrite || false}
                                onCheckedChange={(checked) => {
                                  field.onChange({
                                    ...field.value,
                                    canWrite: checked,
                                  })
                                }}
                              />
                              <label
                                htmlFor='perm-write'
                                className='cursor-pointer'
                              >
                                <span className='font-medium'>
                                  Write Access
                                </span>
                                <p className='text-xs text-muted-foreground'>
                                  Modify inventory and create orders
                                </p>
                              </label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                id='perm-manage'
                                checked={field.value?.canManage || false}
                                onCheckedChange={(checked) => {
                                  field.onChange({
                                    ...field.value,
                                    canManage: checked,
                                  })
                                }}
                              />
                              <label
                                htmlFor='perm-manage'
                                className='cursor-pointer'
                              >
                                <span className='font-medium'>
                                  Management Access
                                </span>
                                <p className='text-xs text-muted-foreground'>
                                  Full control including approvals
                                </p>
                              </label>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
