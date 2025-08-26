'use client'

import { LocationsGate } from '@/components/subscription/feature-gate'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  locationsApi,
  locationTypeNames,
  temperatureTypes,
  type Location,
  type LocationsResponse,
} from '@/lib/api/locations'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  Settings,
  Thermometer,
  Trash2,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface LocationsCardProps {
  locations: LocationsResponse
  loading: boolean
  fetchLocations: () => Promise<void>
}

export default function LocationsCard({
  locations,
  loading,
  fetchLocations,
}: LocationsCardProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isQuickSetupDialogOpen, setIsQuickSetupDialogOpen] = useState(false)
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  )
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(
    new Set()
  )

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORAGE',
    address: '',
    description: '',
  })

  const [zoneFormData, setZoneFormData] = useState({
    name: '',
    code: '',
    description: '',
    temperature: '',
  })

  const handleCreateLocation = async () => {
    try {
      await locationsApi.createLocation({
        name: formData.name,
        code: formData.code || undefined,
        type: formData.type,
        address: formData.address || undefined,
        description: formData.description || undefined,
      })

      toast.success('Location created successfully')
      setIsCreateDialogOpen(false)
      setFormData({
        name: '',
        code: '',
        type: 'STORAGE',
        address: '',
        description: '',
      })
      fetchLocations()
    } catch (error) {
      console.warn('Failed to create location:', error)
      toast.error('Failed to create location')
    }
  }

  const handleQuickSetup = async (
    locationType: 'BAR' | 'KITCHEN' | 'STORAGE'
  ) => {
    try {
      const result = await locationsApi.quickSetup({ locationType })
      toast.success(result.message)
      setIsQuickSetupDialogOpen(false)
      fetchLocations()
    } catch (error) {
      console.warn('Failed to create quick setup:', error)
      toast.error('Failed to create quick setup')
    }
  }

  const handleCreateZone = async () => {
    if (!selectedLocation) return

    try {
      await locationsApi.createZone(selectedLocation.id, {
        name: zoneFormData.name,
        code: zoneFormData.code,
        description: zoneFormData.description || undefined,
        temperature: zoneFormData.temperature || undefined,
      })

      toast.success('Zone created successfully')
      setIsZoneDialogOpen(false)
      setZoneFormData({
        name: '',
        code: '',
        description: '',
        temperature: '',
      })
      fetchLocations()
    } catch (error) {
      console.warn('Failed to create zone:', error)
      toast.error('Failed to create zone')
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      await locationsApi.deleteLocation(locationId)
      toast.success('Location deleted successfully')
      fetchLocations()
    } catch (error) {
      console.warn('Failed to delete location:', error)
      toast.error('Failed to delete location')
    }
  }

  const toggleLocationExpansion = (locationId: string) => {
    setExpandedLocations((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(locationId)) {
        newSet.delete(locationId)
      } else {
        newSet.add(locationId)
      }
      return newSet
    })
  }

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'BAR':
        return 'bg-purple-100 text-purple-800'
      case 'KITCHEN':
        return 'bg-orange-100 text-orange-800'
      case 'STORAGE':
        return 'bg-blue-100 text-blue-800'
      case 'WAREHOUSE':
        return 'bg-gray-100 text-gray-800'
      case 'RETAIL':
        return 'bg-green-100 text-green-800'
      case 'OFFICE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTemperatureIcon = (temperature: string | null) => {
    switch (temperature) {
      case 'refrigerated':
        return <Thermometer className='h-3 w-3 text-blue-500' />
      case 'frozen':
        return <Thermometer className='h-3 w-3 text-cyan-500' />
      case 'ambient':
        return <Thermometer className='h-3 w-3 text-orange-500' />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
        <span className='ml-2'>Loading locations...</span>
      </div>
    )
  }

  return (
    <Card id='manageLocations'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
        <div>
          <CardTitle className='flex items-center'>
            <MapPin className='mr-2 h-5 w-5' />
            Locations
          </CardTitle>
          <CardDescription>
            Manage your storage locations, zones, and bin organization
          </CardDescription>
        </div>
        <LocationsGate
          fallback={
            <Button disabled>
              <Plus className='mr-2 h-4 w-4' />
              Upgrade to add more locations
            </Button>
          }
        >
          <div className='flex gap-2'>
            <Dialog
              open={isQuickSetupDialogOpen}
              onOpenChange={setIsQuickSetupDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline'>
                  <Zap className='mr-2 h-4 w-4' />
                  Quick Setup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Location Setup</DialogTitle>
                  <DialogDescription>
                    Create a pre-configured location with standard zones for
                    common business areas.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 gap-4'>
                    <Button
                      variant='outline'
                      className='p-6 h-auto flex-col items-start'
                      onClick={() => handleQuickSetup('BAR')}
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <Building2 className='h-5 w-5' />
                        <span className='font-medium'>Bar Setup</span>
                      </div>
                      <p className='text-sm text-muted-foreground text-left'>
                        Creates bar location with Back Bar, Beer Cooler, Wine
                        Storage, and Garnish Station zones
                      </p>
                    </Button>
                    <Button
                      variant='outline'
                      className='p-6 h-auto flex-col items-start'
                      onClick={() => handleQuickSetup('KITCHEN')}
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <Building2 className='h-5 w-5' />
                        <span className='font-medium'>Kitchen Setup</span>
                      </div>
                      <p className='text-sm text-muted-foreground text-left'>
                        Creates kitchen location with Walk-in Cooler, Freezer,
                        Dry Storage, and Prep Area zones
                      </p>
                    </Button>
                    <Button
                      variant='outline'
                      className='p-6 h-auto flex-col items-start'
                      onClick={() => handleQuickSetup('STORAGE')}
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <Building2 className='h-5 w-5' />
                        <span className='font-medium'>Storage Setup</span>
                      </div>
                      <p className='text-sm text-muted-foreground text-left'>
                        Creates storage location with Receiving, General
                        Storage, and Overflow zones
                      </p>
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Location</DialogTitle>
                  <DialogDescription>
                    Add a new storage location to organize your inventory.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='name'>Name</Label>
                      <Input
                        id='name'
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder='Main Storage'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='code'>Code (Optional)</Label>
                      <Input
                        id='code'
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        placeholder='WH1'
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='type'>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(locationTypeNames).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='address'>Address (Optional)</Label>
                    <Input
                      id='address'
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder='123 Main St, City, State'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='description'>Description (Optional)</Label>
                    <Textarea
                      id='description'
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder='Description of this location...'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateLocation}
                    disabled={!formData.name}
                  >
                    Create Location
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </LocationsGate>
      </CardHeader>
      <CardContent>
        {/* Locations List */}
        {locations.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <MapPin className='h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-medium mb-2'>No locations found</h3>
              <p className='text-muted-foreground text-center mb-6'>
                Get started by creating your first storage location or using our
                quick setup.
              </p>
              <div className='flex gap-2'>
                <Button onClick={() => setIsQuickSetupDialogOpen(true)}>
                  <Zap className='mr-2 h-4 w-4' />
                  Quick Setup
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add Location
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => toggleLocationExpansion(location.id)}
                      >
                        {expandedLocations.has(location.id) ? (
                          <ChevronDown className='h-4 w-4' />
                        ) : (
                          <ChevronRight className='h-4 w-4' />
                        )}
                      </Button>
                      <div>
                        <CardTitle className='flex items-center gap-2'>
                          <MapPin className='h-5 w-5' />
                          {location.name}
                          {location.code && (
                            <Badge variant='outline'>{location.code}</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {location.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge className={getLocationTypeColor(location.type)}>
                        {
                          locationTypeNames[
                            location.type as keyof typeof locationTypeNames
                          ]
                        }
                      </Badge>
                      {location._count && (
                        <Badge variant='secondary'>
                          <Package className='mr-1 h-3 w-3' />
                          {location._count.inventoryItems} items
                        </Badge>
                      )}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setSelectedLocation(location)
                          setIsZoneDialogOpen(true)
                        }}
                      >
                        <Plus className='h-4 w-4 mr-1' />
                        Add Zone
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteLocation(location.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedLocations.has(location.id) && (
                  <CardContent>
                    {location.zones && location.zones.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Zone</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Temperature</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {location.zones.map((zone) => (
                            <TableRow key={zone.id}>
                              <TableCell className='font-medium'>
                                {zone.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant='outline'>{zone.code}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center gap-1'>
                                  {getTemperatureIcon(zone.temperature)}
                                  <span className='text-sm'>
                                    {zone.temperature
                                      ? temperatureTypes[
                                          zone.temperature as keyof typeof temperatureTypes
                                        ]
                                      : 'Not specified'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                {zone.description || 'No description'}
                              </TableCell>
                              <TableCell>
                                <Button variant='ghost' size='sm'>
                                  <Settings className='h-4 w-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Building2 className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p>No zones configured for this location</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={() => {
                            setSelectedLocation(location)
                            setIsZoneDialogOpen(true)
                          }}
                        >
                          <Plus className='h-4 w-4 mr-1' />
                          Add First Zone
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Zone Creation Dialog */}
        <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Zone to {selectedLocation?.name}</DialogTitle>
              <DialogDescription>
                Create a new zone within this location to organize your
                inventory.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='zone-name'>Zone Name</Label>
                  <Input
                    id='zone-name'
                    value={zoneFormData.name}
                    onChange={(e) =>
                      setZoneFormData({ ...zoneFormData, name: e.target.value })
                    }
                    placeholder='Beer Cooler'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='zone-code'>Zone Code</Label>
                  <Input
                    id='zone-code'
                    value={zoneFormData.code}
                    onChange={(e) =>
                      setZoneFormData({ ...zoneFormData, code: e.target.value })
                    }
                    placeholder='BC'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='temperature'>Temperature Requirements</Label>
                <Select
                  value={zoneFormData.temperature}
                  onValueChange={(value) =>
                    setZoneFormData({ ...zoneFormData, temperature: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select temperature requirement' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='_default_'>
                      No specific requirement
                    </SelectItem>
                    {Object.entries(temperatureTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='zone-description'>Description (Optional)</Label>
                <Textarea
                  id='zone-description'
                  value={zoneFormData.description}
                  onChange={(e) =>
                    setZoneFormData({
                      ...zoneFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder='Description of this zone...'
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateZone}
                disabled={!zoneFormData.name || !zoneFormData.code}
              >
                Create Zone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
