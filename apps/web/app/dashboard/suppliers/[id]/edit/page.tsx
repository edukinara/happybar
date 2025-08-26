'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  suppliersApi,
  type Supplier,
  type UpdateSupplierRequest,
} from '@/lib/api/suppliers'
import {
  ArrowLeft,
  Building2,
  Clock,
  DollarSign,
  RefreshCw,
  Save,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
]

export default function EditSupplierPage() {
  const params = useParams()
  const supplierId = params.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    terms: '',
    isActive: true,
    orderCutoffTime: '',
    orderCutoffDays: [] as number[],
    deliveryDays: [] as number[],
    deliveryTimeStart: '',
    deliveryTimeEnd: '',
    minimumOrderValue: '',
    deliveryFee: '',
  })

  useEffect(() => {
    loadSupplier()
  }, [supplierId])

  const loadSupplier = async () => {
    try {
      setLoading(true)
      const supplier = await suppliersApi.getSupplier(supplierId)
      setSupplier(supplier)
      setFormData({
        name: supplier.name,
        contactEmail: supplier.contactEmail || '',
        contactPhone: supplier.contactPhone || '',
        address: supplier.address || '',
        terms: supplier.terms || '',
        isActive: supplier.isActive,
        orderCutoffTime: supplier.orderCutoffTime || '',
        orderCutoffDays: supplier.orderCutoffDays,
        deliveryDays: supplier.deliveryDays,
        deliveryTimeStart: supplier.deliveryTimeStart || '',
        deliveryTimeEnd: supplier.deliveryTimeEnd || '',
        minimumOrderValue: supplier.minimumOrderValue?.toString() || '',
        deliveryFee: supplier.deliveryFee?.toString() || '',
      })
    } catch (error) {
      console.error('Failed to load supplier:', error)
      toast.error('Failed to load supplier')
      router.push('/dashboard/suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    try {
      setSaving(true)

      const payload: UpdateSupplierRequest = {
        ...formData,
        minimumOrderValue: formData.minimumOrderValue
          ? parseFloat(formData.minimumOrderValue)
          : undefined,
        deliveryFee: formData.deliveryFee
          ? parseFloat(formData.deliveryFee)
          : undefined,
        orderCutoffTime: formData.orderCutoffTime || undefined,
        deliveryTimeStart: formData.deliveryTimeStart || undefined,
        deliveryTimeEnd: formData.deliveryTimeEnd || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        terms: formData.terms || undefined,
      }

      await suppliersApi.updateSupplier(supplierId, payload)
      toast.success('Supplier updated successfully')
      router.push(`/dashboard/suppliers/${supplierId}`)
    } catch (error) {
      console.error('Failed to update supplier:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update supplier'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (
    dayId: number,
    field: 'orderCutoffDays' | 'deliveryDays'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(dayId)
        ? prev[field].filter((d) => d !== dayId)
        : [...prev[field], dayId].sort((a, b) => a - b),
    }))
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='h-8 w-8 animate-spin mr-2' />
        <span>Loading supplier...</span>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className='text-center py-12'>
        <h3 className='text-lg font-medium mb-2'>Supplier not found</h3>
        <Button asChild>
          <Link href='/dashboard/suppliers'>Back to Suppliers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href={`/dashboard/suppliers/${supplierId}`}>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Edit Supplier</h1>
            <p className='text-muted-foreground'>
              Update supplier information and settings
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className='grid gap-6'>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='h-5 w-5' />
                Basic Information
              </CardTitle>
              <CardDescription>
                General supplier details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Supplier Name *</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder='e.g., ABC Distributors'
                    required
                  />
                </div>
                <div className='flex items-center space-x-2 mt-6'>
                  <Switch
                    id='isActive'
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor='isActive'>Active Supplier</Label>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='contactEmail'>Contact Email</Label>
                  <Input
                    id='contactEmail'
                    type='email'
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                    placeholder='supplier@example.com'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='contactPhone'>Contact Phone</Label>
                  <Input
                    id='contactPhone'
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                    placeholder='+1 (555) 123-4567'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='address'>Address</Label>
                <Textarea
                  id='address'
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder='123 Main St, City, State ZIP'
                  rows={2}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='terms'>Payment Terms</Label>
                <Textarea
                  id='terms'
                  value={formData.terms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, terms: e.target.value }))
                  }
                  placeholder='e.g., Net 30, 2% discount for payment within 10 days'
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Order Schedule
              </CardTitle>
              <CardDescription>
                Configure when orders should be placed with this supplier
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label>Order Cutoff Days</Label>
                <div className='flex flex-wrap gap-2'>
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.id} className='flex items-center space-x-2'>
                      <Checkbox
                        id={`cutoff-${day.id}`}
                        checked={formData.orderCutoffDays.includes(day.id)}
                        onCheckedChange={() =>
                          toggleDay(day.id, 'orderCutoffDays')
                        }
                      />
                      <Label
                        htmlFor={`cutoff-${day.id}`}
                        className='text-sm font-normal cursor-pointer'
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='orderCutoffTime'>Order Cutoff Time</Label>
                <Input
                  id='orderCutoffTime'
                  type='time'
                  value={formData.orderCutoffTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      orderCutoffTime: e.target.value,
                    }))
                  }
                />
                <p className='text-sm text-muted-foreground'>
                  Orders must be placed by this time on cutoff days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Truck className='h-5 w-5' />
                Delivery Schedule
              </CardTitle>
              <CardDescription>
                Configure when this supplier delivers orders
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label>Delivery Days</Label>
                <div className='flex flex-wrap gap-2'>
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.id} className='flex items-center space-x-2'>
                      <Checkbox
                        id={`delivery-${day.id}`}
                        checked={formData.deliveryDays.includes(day.id)}
                        onCheckedChange={() =>
                          toggleDay(day.id, 'deliveryDays')
                        }
                      />
                      <Label
                        htmlFor={`delivery-${day.id}`}
                        className='text-sm font-normal cursor-pointer'
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='deliveryTimeStart'>Delivery Time Start</Label>
                  <Input
                    id='deliveryTimeStart'
                    type='time'
                    value={formData.deliveryTimeStart}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryTimeStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='deliveryTimeEnd'>Delivery Time End</Label>
                  <Input
                    id='deliveryTimeEnd'
                    type='time'
                    value={formData.deliveryTimeEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryTimeEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <DollarSign className='h-5 w-5' />
                Order Requirements
              </CardTitle>
              <CardDescription>
                Minimum order values and delivery fees
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='minimumOrderValue'>
                    Minimum Order Value ($)
                  </Label>
                  <Input
                    id='minimumOrderValue'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.minimumOrderValue}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minimumOrderValue: e.target.value,
                      }))
                    }
                    placeholder='0.00'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='deliveryFee'>Delivery Fee ($)</Label>
                  <Input
                    id='deliveryFee'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.deliveryFee}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryFee: e.target.value,
                      }))
                    }
                    placeholder='0.00'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className='flex justify-end gap-4'>
            <Button type='button' variant='outline' asChild>
              <Link href={`/dashboard/suppliers/${supplierId}`}>Cancel</Link>
            </Button>
            <Button type='submit' disabled={saving}>
              <Save className='h-4 w-4 mr-2' />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
