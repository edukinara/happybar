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
import { suppliersApi, type CreateSupplierRequest } from '@/lib/api/suppliers'
import {
  ArrowLeft,
  Building2,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Save,
  Trash2,
  Truck,
  User,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

export default function NewSupplierPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    try {
      setSaving(true)

      const payload: CreateSupplierRequest = {
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

      const supplier = await suppliersApi.createSupplier(payload)
      toast.success('Supplier created successfully')
      router.push(`/dashboard/suppliers/${supplier.id}`)
    } catch (error) {
      console.error('Failed to create supplier:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to create supplier'
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

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href='/dashboard/suppliers'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Add New Supplier
            </h1>
            <p className='text-muted-foreground'>
              Create a new supplier for product ordering
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
                <Building2 className='size-5' />
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

          {/* Contacts */}
          <Card className='gap-2'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <User className='size-5' />
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
                  <UserPlus className='size-4 mr-2' />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground'>
                  <User className='size-12 mx-auto mb-2 opacity-50' />
                  <p>No contacts added yet</p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-2'
                    onClick={addContact}
                  >
                    <UserPlus className='size-4 mr-2' />
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
                          <Trash2 className='size-4' />
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
                            <Mail className='size-4' />
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
                            <Phone className='size-4' />
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

          {/* Order Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='size-5' />
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
                <Truck className='size-5' />
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
                <DollarSign className='size-5' />
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
              <Link href='/dashboard/suppliers'>Cancel</Link>
            </Button>
            <Button type='submit' disabled={saving}>
              <Save className='size-4 mr-2' />
              {saving ? 'Creating...' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
