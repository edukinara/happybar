'use client'

import { StorageAreaManager } from '@/components/inventory/StorageAreaManager'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { inventoryApi } from '@/lib/api/inventory'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { useLocationStore } from '@/lib/stores/location-store'
import { CountType } from '@happy-bar/types'
import { ArrowLeft, Calendar, FileText, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAlertDialog } from '@/hooks/use-alert-dialog'

export default function NewInventoryCountPage() {
  const { showError } = useAlertDialog()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<LocationsResponse>([])

  // Use global location state
  const { selectedLocationId } = useLocationStore()

  const [storageAreas, setStorageAreas] = useState<
    Array<{
      id: string
      name: string
      order: number
    }>
  >([])
  const [formData, setFormData] = useState({
    name: '',
    locationId: selectedLocationId || '',
    type: CountType.FULL,
    notes: '',
  })

  useEffect(() => {
    fetchLocations()
    // Set default name with current date
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    setFormData((prev) => ({
      ...prev,
      name: `Inventory Count - ${today}`,
    }))
  }, [])

  const fetchLocations = async () => {
    try {
      const data = await locationsApi.getLocations()
      setLocations(data)
      // Use global selected location if available, otherwise auto-select first if only one exists
      if (selectedLocationId && data.some(loc => loc.id === selectedLocationId)) {
        setFormData((prev) => ({ ...prev, locationId: selectedLocationId }))
      } else if (data.length === 1) {
        setFormData((prev) => ({ ...prev, locationId: data[0]!.id }))
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.locationId) {
      showError('Please select a location')
      return
    }

    if (storageAreas.length === 0) {
      showError('Please add at least one storage area')
      return
    }

    try {
      setLoading(true)

      const newCount = await inventoryApi.createInventoryCount({
        locationId: formData.locationId,
        name: formData.name,
        type: formData.type,
        notes: formData.notes || undefined,
        areas: storageAreas.map((area) => ({
          name: area.name,
          order: area.order,
        })),
      })

      router.push(`/dashboard/inventory/counts/${newCount.id}`)
    } catch (error) {
      console.error('Failed to create inventory count:', error)
      showError('Failed to create inventory count. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const countTypeOptions = [
    {
      value: CountType.FULL,
      label: 'Full Count',
      description: 'Complete inventory count of all items',
    },
    {
      value: CountType.SPOT,
      label: 'Spot Check',
      description: 'Quick count of specific high-value items',
    },
    {
      value: CountType.CYCLE,
      label: 'Cycle Count',
      description: 'Rotating count of different areas over time',
    },
  ]

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/dashboard/inventory/counts'>
            <ArrowLeft className='size-4 mr-2' />
            Back to Counts
          </Link>
        </Button>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            New Inventory Count
          </h1>
          <p className='text-muted-foreground'>
            Create a new inventory count session
          </p>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Main Form */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Count Details</CardTitle>
              <CardDescription>
                Configure your inventory count session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-6'>
                {/* Count Name */}
                <div className='space-y-2'>
                  <Label htmlFor='name'>Count Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder='e.g., Weekly Count - Jan 15'
                    required
                  />
                </div>

                {/* Location */}
                <div className='space-y-2'>
                  <Label htmlFor='location'>Location</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, locationId: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a location' />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <div className='flex items-center gap-2'>
                            <MapPin className='size-4' />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Count Type */}
                <div className='space-y-2'>
                  <Label htmlFor='type'>Count Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: value as CountType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className='font-medium'>{option.label}</div>
                            <div className='text-sm text-muted-foreground'>
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className='space-y-2'>
                  <Label htmlFor='notes'>Notes (Optional)</Label>
                  <Textarea
                    id='notes'
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder='Any additional notes about this count...'
                    rows={3}
                  />
                </div>

                {/* Submit Buttons */}
                <div className='flex gap-3'>
                  <Button type='submit' disabled={loading}>
                    {loading ? 'Creating...' : 'Create Count'}
                  </Button>
                  <Button type='button' variant='outline' asChild>
                    <Link href='/dashboard/inventory/counts'>Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Storage Areas & Info */}
        <div className='space-y-6'>
          <StorageAreaManager
            areas={storageAreas}
            onAreasChange={setStorageAreas}
          />
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='size-5' />
                Count Types
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {countTypeOptions.map((option) => (
                <div key={option.value} className='space-y-1'>
                  <div className='font-medium text-sm'>{option.label}</div>
                  <div className='text-sm text-muted-foreground'>
                    {option.description}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='size-5' />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3 text-sm'>
                <div className='flex gap-3'>
                  <div className='flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold'>
                    1
                  </div>
                  <div>Configure count areas and storage locations</div>
                </div>
                <div className='flex gap-3'>
                  <div className='flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold'>
                    2
                  </div>
                  <div>Begin counting items using tenthing method</div>
                </div>
                <div className='flex gap-3'>
                  <div className='flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold'>
                    3
                  </div>
                  <div>Review variances and approve results</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
