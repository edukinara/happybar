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
  Mail,
  Phone,
  RefreshCw,
  Save,
  Trash2,
  Truck,
  User,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
]

interface ContactFormData {
  id?: string
  name: string
  title: string
  email: string
  phone: string
  isPrimary: boolean
}

export default function EditSupplierPage() {
  const params = useParams()
  const supplierId = params.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [contacts, setContacts] = useState<ContactFormData[]>([])
  const [formData, setFormData] = useState({
    name: '',
    accountNumber: '',
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
        accountNumber: supplier.accountNumber || '',
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

      // Set contacts
      if (supplier.contacts) {
        setContacts(
          supplier.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            title: c.title || '',
            email: c.email || '',
            phone: c.phone || '',
            isPrimary: c.isPrimary,
          }))
        )
      }
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

    // Validate contacts
    for (const contact of contacts) {
      if (!contact.name.trim()) {
        toast.error('Contact name is required for all contacts')
        return
      }
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
        accountNumber: formData.accountNumber || undefined,
        address: formData.address || undefined,
        terms: formData.terms || undefined,
        contacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          title: c.title || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          isPrimary: c.isPrimary,
        })),
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

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        name: '',
        title: '',
        email: '',
        phone: '',
        isPrimary: contacts.length === 0,
      },
    ])
  }

  const removeContact = (index: number) => {
    const newContacts = contacts.filter((_, i) => i !== index)
    // If we removed the primary contact, make the first one primary
    if (contacts[index]?.isPrimary && newContacts?.[0]) {
      newContacts[0].isPrimary = true
    }
    setContacts(newContacts)
  }

  const updateContact = (
    index: number,
    field: keyof ContactFormData,
    value: string | boolean
  ) => {
    const newContacts = [...contacts]

    // If setting as primary, unset all others
    if (field === 'isPrimary' && value === true) {
      newContacts.forEach((c, i) => {
        c.isPrimary = i === index
      })
    } else {
      ;(newContacts[index] as any)[field] = value
    }

    setContacts(newContacts)
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
                General supplier details and account information
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
                <div className='space-y-2'>
                  <Label htmlFor='accountNumber'>Account Number</Label>
                  <Input
                    id='accountNumber'
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                    placeholder='e.g., ACC-12345'
                  />
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                <Switch
                  id='isActive'
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor='isActive'>Active Supplier</Label>
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
                  placeholder='123 Main St, City, State 12345'
                  rows={3}
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
                  placeholder='e.g., Net 30, 2% discount if paid within 10 days'
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <User className='h-5 w-5' />
                    Contacts
                  </CardTitle>
                  <CardDescription>
                    Manage supplier contact persons
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addContact}
                >
                  <UserPlus className='h-4 w-4 mr-2' />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <User className='h-12 w-12 mx-auto mb-2 opacity-50' />
                  <p>No contacts added yet</p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-2'
                    onClick={addContact}
                  >
                    <UserPlus className='h-4 w-4 mr-2' />
                    Add First Contact
                  </Button>
                </div>
              ) : (
                <div className='space-y-4'>
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className='border rounded-lg p-4 space-y-4'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex items-center gap-2'>
                          <input
                            type='radio'
                            name='primaryContact'
                            checked={contact.isPrimary}
                            onChange={() =>
                              updateContact(index, 'isPrimary', true)
                            }
                            className='mt-1'
                          />
                          <Label>Primary Contact</Label>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeContact(index)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>

                      <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label>Name *</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) =>
                              updateContact(index, 'name', e.target.value)
                            }
                            placeholder='Contact name'
                            required
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label>Title</Label>
                          <Input
                            value={contact.title}
                            onChange={(e) =>
                              updateContact(index, 'title', e.target.value)
                            }
                            placeholder='e.g., Sales Manager'
                          />
                        </div>
                      </div>

                      <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label className='flex items-center gap-2'>
                            <Mail className='h-4 w-4' />
                            Email
                          </Label>
                          <Input
                            type='email'
                            value={contact.email}
                            onChange={(e) =>
                              updateContact(index, 'email', e.target.value)
                            }
                            placeholder='contact@example.com'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label className='flex items-center gap-2'>
                            <Phone className='h-4 w-4' />
                            Phone
                          </Label>
                          <Input
                            type='tel'
                            value={contact.phone}
                            onChange={(e) =>
                              updateContact(index, 'phone', e.target.value)
                            }
                            placeholder='(555) 123-4567'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Settings */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Order Settings
              </CardTitle>
              <CardDescription>
                Configure order cutoff times and schedules
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
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
                </div>
              </div>

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
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Truck className='h-5 w-5' />
                Delivery Settings
              </CardTitle>
              <CardDescription>
                Configure delivery schedules and requirements
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
                  <Label htmlFor='deliveryTimeStart'>Delivery Start Time</Label>
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
                  <Label htmlFor='deliveryTimeEnd'>Delivery End Time</Label>
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

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='minimumOrderValue'>
                    Minimum Order Value ($)
                  </Label>
                  <Input
                    id='minimumOrderValue'
                    type='number'
                    step='0.01'
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
          <div className='flex gap-2'>
            <Button
              type='submit'
              disabled={
                saving ||
                !formData.name.trim() ||
                !contacts?.[0]?.email ||
                !contacts?.[0]?.name
              }
              className='flex items-center gap-2'
            >
              {saving ? (
                <>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='h-4 w-4' />
                  Save Changes
                </>
              )}
            </Button>
            <Button variant='outline' asChild>
              <Link href={`/dashboard/suppliers/${supplierId}`}>Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
