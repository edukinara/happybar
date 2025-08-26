'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSidebar } from './ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

interface Organization {
  id: string
  name: string
  slug: string | null
  logo: string | null
  role: string
  isActive: boolean
  memberSince: Date
}

interface OrganizationSwitcherProps {
  className?: string
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/organizations`,
          {
            credentials: 'include',
          }
        )

        if (response.ok) {
          const data: {
            success: boolean
            data?: { organizations: Organization[] }
          } = await response.json()
          if (!data.data?.organizations?.length) return
          const orgs = data.data.organizations

          setOrganizations(data.data.organizations)

          // Set current organization (first one or from local storage)
          const savedOrgId = localStorage.getItem('activeOrganizationId')
          const activeOrg =
            orgs.find((org: Organization) => org.id === savedOrgId) || orgs[0]
          if (activeOrg) setCurrentOrg(activeOrg)
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchOrganizations()
    }
  }, [user])

  const handleSelectOrganization = async (org: Organization) => {
    if (org.id === currentOrg?.id) {
      setOpen(false)
      return
    }

    try {
      // Call API to switch organization
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/set-active-organization`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ organizationId: org.id }),
        }
      )

      if (response.ok) {
        // Update local state and storage
        setCurrentOrg(org)
        localStorage.setItem('activeOrganizationId', org.id)

        // Show success message
        toast.success(`Switched to ${org.name}`)

        // Refresh the page to reload with new org context
        router.refresh()
        window.location.reload()
      } else {
        toast.error('Failed to switch organization')
      }
    } catch (error) {
      console.error('Error switching organization:', error)
      toast.error('Failed to switch organization')
    } finally {
      setOpen(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      inventory_manager: 'bg-green-100 text-green-800',
      buyer: 'bg-orange-100 text-orange-800',
      supervisor: 'bg-yellow-100 text-yellow-800',
      staff: 'bg-gray-100 text-gray-800',
      viewer: 'bg-slate-100 text-slate-800',
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const { state } = useSidebar()

  if (loading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className='h-9 w-[200px] bg-muted animate-pulse rounded-md' />
      </div>
    )
  }

  // Don't show switcher if user only has one organization
  if (organizations.length <= 1) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label='Select organization'
          className={cn('w-full justify-between px-2', className)}
          // onClick={() => setOpen(!open)}
        >
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className='flex items-center gap-2 truncate w-full'>
                  {currentOrg?.logo ? (
                    <Avatar className='size-5'>
                      <AvatarImage
                        src={currentOrg.logo}
                        alt={currentOrg.name}
                      />
                      <AvatarFallback>
                        <Building2 className='size-3' />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Building2 className='size-4 shrink-0' />
                  )}
                  <div className='flex flex-row justify-between w-full'>
                    <span className='truncate'>
                      {currentOrg?.name || 'Select organization'}
                    </span>
                  </div>
                  <ChevronsUpDown className='ml-auto size-4 shrink-0 opacity-50' />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side='right'
                align='center'
                hidden={state !== 'collapsed'}
              >
                Change Organization
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0'>
        <Command>
          <CommandInput placeholder='Search organizations...' />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandGroup heading='Your Organizations'>
              {organizations?.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => handleSelectOrganization(org)}
                >
                  <div className='flex items-center gap-2 flex-1'>
                    {org.logo ? (
                      <Avatar className='h-6 w-6'>
                        <AvatarImage src={org.logo} alt={org.name} />
                        <AvatarFallback>
                          <Building2 className='h-3 w-3' />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className='h-4 w-4' />
                    )}
                    <div className='flex flex-col flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>{org.name}</span>
                        {currentOrg?.id === org.id && (
                          <Check className='h-3 w-3 text-primary' />
                        )}
                      </div>
                      <Badge
                        variant='secondary'
                        className={cn(
                          'text-xs w-fit',
                          getRoleBadgeColor(org.role)
                        )}
                      >
                        {org.role}
                      </Badge>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {/* <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  toast.info('Contact support to create a new organization')
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                Create New Organization
              </CommandItem>
            </CommandGroup> */}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
