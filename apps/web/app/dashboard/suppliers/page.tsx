'use client'

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import { suppliersApi, type Supplier } from '@/lib/api/suppliers'
import { cn } from '@/lib/utils'
import {
  Building2,
  Clock,
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL')

  useEffect(() => {
    loadSuppliers()
  }, [statusFilter])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const params: { active?: boolean; search?: string } = {}

      if (statusFilter === 'ACTIVE') params.active = true
      if (statusFilter === 'INACTIVE') params.active = false
      if (searchTerm) params.search = searchTerm

      const suppliers = await suppliersApi.getSuppliers(params)
      setSuppliers(suppliers)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const toggleSupplierStatus = async (id: string, isActive: boolean) => {
    try {
      await suppliersApi.updateSupplier(id, { isActive: !isActive })
      toast.success(`Supplier ${!isActive ? 'activated' : 'deactivated'}`)
      loadSuppliers()
    } catch (error) {
      console.error('Failed to update supplier status:', error)
      toast.error('Failed to update supplier status')
    }
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contacts?.some(
        (contact) =>
          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  )

  const formatOrderCutoff = (supplier: Supplier) => {
    if (supplier.orderCutoffDays.length === 0) return 'Not specified'

    const days = supplier.orderCutoffDays
      .map((day) => DAYS_OF_WEEK[day])
      .join(', ')
    const time = supplier.orderCutoffTime
      ? ` at ${supplier.orderCutoffTime}`
      : ''

    return days + time
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='size-8 animate-spin mr-2' />
        <span>Loading suppliers...</span>
      </div>
    )
  }

  return (
    <div className='min-h-screen brand-gradient relative'>
      {/* Floating orbs */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='brand-orb-primary w-96 h-96 absolute -top-20 -right-20 animate-float' />
        <div className='brand-orb-accent w-80 h-80 absolute top-72 -left-20 animate-float-reverse' />
        <div className='brand-orb-primary w-64 h-64 absolute bottom-32 right-1/4 animate-float' />
      </div>

      <div className='relative z-10 p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
              Supplier Management
            </h1>
            <p className='text-muted-foreground'>
              Manage your suppliers, product catalogs, and ordering schedules
            </p>
          </div>
          <Button asChild className='btn-brand-primary'>
            <Link href='/dashboard/suppliers/new'>
              <Plus className='size-4 mr-2' />
              Add Supplier
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Suppliers
              </CardTitle>
              <Building2 className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{suppliers.length}</div>
              <p className='text-xs text-muted-foreground'>All suppliers</p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Active Suppliers
              </CardTitle>
              <Building2 className='size-4 brand-icon-accent' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-600'>
                {suppliers.filter((s) => s.isActive).length}
              </div>
              <p className='text-xs text-muted-foreground'>Currently active</p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Products
              </CardTitle>
              <Package className='size-4 brand-icon-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {suppliers.reduce(
                  (sum, s) => sum + (s._count?.products || 0),
                  0
                )}
              </div>
              <p className='text-xs text-muted-foreground'>
                Across all suppliers
              </p>
            </CardContent>
          </Card>

          <Card className='brand-card gap-2'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Orders
              </CardTitle>
              <Truck className='size-4 brand-icon-accent' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {suppliers.reduce((sum, s) => sum + (s._count?.orders || 0), 0)}
              </div>
              <p className='text-xs text-muted-foreground'>All time orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>
              Manage your supplier relationships and ordering information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className='flex items-center gap-4 mb-6'>
              <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  placeholder='Search suppliers...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
              >
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All Suppliers</SelectItem>
                  <SelectItem value='ACTIVE'>Active Only</SelectItem>
                  <SelectItem value='INACTIVE'>Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                <Building2 className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                <h3 className='text-lg font-medium mb-2'>
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'No suppliers found'
                    : 'No suppliers yet'}
                </h3>
                <p className='text-sm mb-4'>
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first supplier to start managing orders'}
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
                  <Button asChild className='btn-brand-primary'>
                    <Link href='/dashboard/suppliers/new'>
                      <Plus className='size-4 mr-2' />
                      Add First Supplier
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Order Cut-Off</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => {
                    const primaryContact = supplier.contacts?.find(
                      (c) => c.isPrimary
                    )
                    return (
                      <TableRow key={supplier.id} className='hover:bg-muted/50'>
                        <TableCell>
                          <div>
                            <div className='font-medium'>{supplier.name}</div>
                            {supplier.minimumOrderValue && (
                              <div className='text-sm text-muted-foreground'>
                                Min order: $
                                {supplier.minimumOrderValue.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {primaryContact ? (
                            <div className='space-y-1'>
                              <div className='flex items-center gap-1 text-sm'>
                                <Mail className='size-3 text-muted-foreground' />
                                <span>{primaryContact.email}</span>
                              </div>
                              <div className='flex items-center gap-1 text-sm'>
                                <Phone className='size-3 text-muted-foreground' />
                                <span>{primaryContact.phone}</span>
                              </div>
                            </div>
                          ) : (
                            <p>--</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='text-sm'>
                            <div className='flex items-center gap-1'>
                              <Clock className='size-3 text-muted-foreground' />
                              <span>{formatOrderCutoff(supplier)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>
                            {supplier._count?.products || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className='text-sm'>
                            {supplier._count?.orders || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              supplier.isActive ? 'default' : 'secondary'
                            }
                            className={
                              supplier.isActive
                                ? 'bg-green-100 text-green-800'
                                : ''
                            }
                          >
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='w-[50px]'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <MoreHorizontal className='size-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/suppliers/${supplier.id}`}
                                >
                                  <Eye className='size-4 mr-1' />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/suppliers/${supplier.id}/edit`}
                                >
                                  <Edit className='size-4 mr-1' />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={
                                  supplier.isActive
                                    ? 'text-destructive'
                                    : 'text-foreground'
                                }
                                onClick={() =>
                                  toggleSupplierStatus(
                                    supplier.id,
                                    supplier.isActive
                                  )
                                }
                              >
                                <Trash2
                                  className={cn(
                                    'mr-2 size-4',
                                    supplier.isActive ? 'text-destructive' : ''
                                  )}
                                />
                                {supplier.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
