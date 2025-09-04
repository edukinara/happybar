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
import { Textarea } from '@/components/ui/textarea'
import {
  locationsApi,
  locationTypeNames,
  type Location,
  type LocationsResponse,
} from '@/lib/api/locations'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Edit2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

function LocationsSettings() {
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLocations, setExpandedLocations] = useState(
    new Set<string>()
  )
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  )
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORAGE' as keyof typeof locationTypeNames,
    address: '',
    description: '',
  })

  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    type: 'STORAGE' as keyof typeof locationTypeNames,
    address: '',
    description: '',
  })

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setIsLoading(true)
      const data = await locationsApi.getLocations()
      setLocations(data)
    } catch (error) {
      console.error('Failed to fetch locations:', error)
      toast.error('Failed to load locations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLocation = async () => {
    if (!formData.name.trim()) {
      toast.error('Location name is required')
      return
    }

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

  const handleEditLocation = async () => {
    if (!selectedLocation || !editFormData.name.trim()) {
      toast.error('Location name is required')
      return
    }

    try {
      await locationsApi.updateLocation(selectedLocation.id, {
        name: editFormData.name,
        code: editFormData.code || undefined,
        type: editFormData.type,
        address: editFormData.address || undefined,
        description: editFormData.description || undefined,
      })
      toast.success('Location updated successfully')
      setIsEditDialogOpen(false)
      setSelectedLocation(null)
      fetchLocations()
    } catch (error) {
      console.warn('Failed to update location:', error)
      toast.error('Failed to update location')
    }
  }

  const handleDeleteLocation = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return
    }

    try {
      await locationsApi.deleteLocation(location.id)
      toast.success('Location deleted successfully')
      fetchLocations()
    } catch (error) {
      console.warn('Failed to delete location:', error)
      toast.error('Failed to delete location')
    }
  }

  const toggleLocationExpansion = (locationId: string) => {
    const newExpanded = new Set(expandedLocations)
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId)
    } else {
      newExpanded.add(locationId)
    }
    setExpandedLocations(newExpanded)
  }

  const openEditDialog = (location: Location) => {
    setSelectedLocation(location)
    setEditFormData({
      name: location.name,
      code: location.code || '',
      type: location.type as keyof typeof locationTypeNames,
      address: location.address || '',
      description: location.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleQuickSetup = async (locationType: 'BAR' | 'KITCHEN' | 'STORAGE') => {
    try {
      await locationsApi.quickSetup({ type: locationType })
      toast.success(`${locationType.toLowerCase()} location created successfully`)
      fetchLocations()
    } catch (error) {
      console.warn('Failed to create location:', error)
      toast.error('Failed to create location')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Loading locations...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Manage your storage locations and inventory organization
            </CardDescription>
          </div>
          <LocationsGate>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className='size-4 mr-2' />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Location</DialogTitle>
                  <DialogDescription>
                    Add a new location to organize your inventory
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='location-name'>Location Name</Label>
                      <Input
                        id='location-name'
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder='Main Bar'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='location-code'>Location Code</Label>
                      <Input
                        id='location-code'
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        placeholder='BAR1'
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='location-type'>Location Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          type: value as keyof typeof locationTypeNames,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(locationTypeNames).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='location-address'>Address (Optional)</Label>
                    <Input
                      id='location-address'
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder='123 Main St, City, State'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='location-description'>
                      Description (Optional)
                    </Label>
                    <Textarea
                      id='location-description'
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
          </LocationsGate>
        </div>
      </CardHeader>

      <CardContent>
        {locations.length === 0 ? (
          <div className='text-center py-12'>
            <Building2 className='size-12 mx-auto text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium mb-2'>No locations yet</h3>
            <p className='text-muted-foreground mb-6'>
              Get started by creating your first location or using quick setup.
            </p>
            <div className='flex gap-2 justify-center'>
              <Button
                variant='outline'
                onClick={() => handleQuickSetup('BAR')}
              >
                <Building2 className='size-4 mr-2' />
                Bar
              </Button>
              <Button
                variant='outline'
                onClick={() => handleQuickSetup('KITCHEN')}
              >
                <Building2 className='size-4 mr-2' />
                Kitchen
              </Button>
              <Button
                variant='outline'
                onClick={() => handleQuickSetup('STORAGE')}
              >
                <Building2 className='size-4 mr-2' />
                Storage
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex gap-2 mb-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleQuickSetup('BAR')}
              >
                <Plus className='size-4 mr-2' />
                Quick Bar
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleQuickSetup('KITCHEN')}
              >
                <Plus className='size-4 mr-2' />
                Quick Kitchen
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleQuickSetup('STORAGE')}
              >
                <Plus className='size-4 mr-2' />
                Quick Storage
              </Button>
            </div>

            {locations.map((location) => (
              <Card key={location.id} className='border'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => toggleLocationExpansion(location.id)}
                      >
                        {expandedLocations.has(location.id) ? (
                          <ChevronDown className='size-4' />
                        ) : (
                          <ChevronRight className='size-4' />
                        )}
                      </Button>
                      <div>
                        <div className='flex items-center gap-2'>
                          <h3 className='font-semibold'>{location.name}</h3>
                          {location.code && (
                            <Badge variant='outline'>{location.code}</Badge>
                          )}
                          <Badge variant='secondary'>
                            {locationTypeNames[location.type as keyof typeof locationTypeNames]}
                          </Badge>
                        </div>
                        <div className='flex items-center gap-4 text-sm text-muted-foreground mt-1'>
                          <span>
                            {location._count.inventoryItems} items
                          </span>
                          {location.address && (
                            <span className='flex items-center gap-1'>
                              <MapPin className='size-3' />
                              {location.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit2 className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteLocation(location)}
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedLocations.has(location.id) && (
                  <CardContent>
                    <div className='space-y-4'>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-muted-foreground'>Items:</span>
                          <span className='ml-2 font-medium'>
                            {location._count.inventoryItems}
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground'>Address:</span>
                          <span className='ml-2'>
                            {location.address || 'Not specified'}
                          </span>
                        </div>
                      </div>
                      {location.description && (
                        <div className='text-sm'>
                          <span className='text-muted-foreground'>Description:</span>
                          <p className='mt-1'>{location.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Edit Location Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update location information
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-location-name'>Location Name</Label>
                  <Input
                    id='edit-location-name'
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    placeholder='Main Bar'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-location-code'>Location Code</Label>
                  <Input
                    id='edit-location-code'
                    value={editFormData.code}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, code: e.target.value })
                    }
                    placeholder='BAR1'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-location-type'>Location Type</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      type: value as keyof typeof locationTypeNames,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(locationTypeNames).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-location-address'>Address (Optional)</Label>
                <Input
                  id='edit-location-address'
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, address: e.target.value })
                  }
                  placeholder='123 Main St, City, State'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-location-description'>
                  Description (Optional)
                </Label>
                <Textarea
                  id='edit-location-description'
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder='Description of this location...'
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleEditLocation}
                disabled={!editFormData.name}
              >
                Update Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Export as LocationsCard for compatibility with existing usage
export const LocationsCard = LocationsSettings

export default LocationsSettings