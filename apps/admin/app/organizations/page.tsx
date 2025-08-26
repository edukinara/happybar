'use client'

import { AdminHeader } from '@/components/admin-header'
import { AuthGuard } from '@/components/auth-guard'
import { adminApi } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Package,
  Search,
  Settings,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'

interface Organization {
  id: string
  name: string
  slug: string | null
  createdAt: string
  updatedAt: string
  status: 'active' | 'inactive' | 'suspended' | 'canceled'
  lastActivity: string | null
  owner: {
    email: string
  }
  plan: string
  stats: {
    users: number
    locations: number
    products: number
    monthlyRevenue: number
  }
  lastActiveAt: string
  _count: {
    members: number
    products: number
    orders: number
  }
}

interface OrganizationsResponse {
  organizations: Organization[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-amber-100 text-amber-800',
    canceled: 'bg-red-100 text-red-800',
  }

  const icons = {
    active: CheckCircle,
    inactive: Clock,
    suspended: AlertTriangle,
    canceled: XCircle,
  }

  const Icon = icons[status as keyof typeof icons] || Clock

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}
    >
      <Icon className='h-3 w-3' />
      {status}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const styles = {
    free: 'bg-gray-100 text-gray-800',
    starter: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[plan as keyof typeof styles] || styles.free}`}
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  )
}

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery<OrganizationsResponse>({
    queryKey: ['admin', 'organizations', { page, limit, search: searchQuery }],
    queryFn: () =>
      adminApi.getOrganizations({ page, limit, search: searchQuery }),
    placeholderData: (previousData) => previousData,
  })

  const filteredOrgs =
    data?.organizations.filter((org: Organization) => {
      const matchesStatus =
        filterStatus === 'all' || org.status === filterStatus
      return matchesStatus
    }) || []

  const _formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    if (days < 30) return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }

  return (
    <AuthGuard>
      <div className='min-h-screen bg-background'>
        <AdminHeader />

        <main className='container mx-auto px-4 py-8'>
          {/* Page Header */}
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h1 className='text-3xl font-bold mb-2'>Organizations</h1>
              <p className='text-muted-foreground'>
                Manage customer organizations and subscriptions
              </p>
            </div>
            <button className='px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90'>
              Create Organization
            </button>
          </div>

          {/* Filters */}
          <div className='flex gap-4 mb-6'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <input
                type='text'
                placeholder='Search by name or email...'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1) // Reset to first page on search
                }}
                className='w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value='all'>All Status</option>
              <option value='active'>Active</option>
              <option value='suspended'>Suspended</option>
              <option value='canceled'>Canceled</option>
            </select>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-4 gap-4 mb-6'>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>
                Total Organizations
              </p>
              <p className='text-2xl font-bold'>
                {data?.pagination.total || 0}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Active</p>
              <p className='text-2xl font-bold text-green-600'>
                {filteredOrgs.filter((o: Organization) => o.status === 'active').length}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Monthly Revenue</p>
              <p className='text-2xl font-bold'>
                $
                {filteredOrgs
                  .reduce((sum: number, o: Organization) => sum + (o.stats?.monthlyRevenue || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Total Users</p>
              <p className='text-2xl font-bold'>
                {filteredOrgs.reduce(
                  (sum: number, o: Organization) => sum + (o.stats?.users || 0),
                  0
                )}
              </p>
            </div>
          </div>

          {/* Organizations Table */}
          <div className='bg-card rounded-lg border overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='text-left p-4 font-medium'>Organization</th>
                  <th className='text-left p-4 font-medium'>Status</th>
                  <th className='text-left p-4 font-medium'>Plan</th>
                  <th className='text-left p-4 font-medium'>Usage</th>
                  <th className='text-left p-4 font-medium'>Revenue</th>
                  <th className='text-left p-4 font-medium'>Last Active</th>
                  <th className='text-left p-4 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className='text-center p-8'>
                      <div className='flex items-center justify-center gap-2'>
                        <Clock className='h-4 w-4 animate-spin' />
                        Loading organizations...
                      </div>
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='text-center p-8 text-muted-foreground'
                    >
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org: Organization) => (
                    <tr key={org.id} className='border-t hover:bg-muted/50'>
                      <td className='p-4'>
                        <div>
                          <p className='font-medium'>{org.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            {org.owner?.email || 'No owner'}
                          </p>
                        </div>
                      </td>
                      <td className='p-4'>
                        <StatusBadge status={org.status} />
                      </td>
                      <td className='p-4'>
                        <PlanBadge plan={org.plan || 'free'} />
                      </td>
                      <td className='p-4'>
                        <div className='flex gap-4 text-sm'>
                          <span className='flex items-center gap-1'>
                            <Users className='h-3 w-3' />
                            {org.stats?.users || org._count.members || 0}
                          </span>
                          <span className='flex items-center gap-1'>
                            <Building2 className='h-3 w-3' />
                            {org.stats?.locations || 1}
                          </span>
                          <span className='flex items-center gap-1'>
                            <Package className='h-3 w-3' />
                            {org.stats?.products || org._count.products || 0}
                          </span>
                        </div>
                      </td>
                      <td className='p-4'>
                        <span className='font-medium'>
                          ${org.stats?.monthlyRevenue || 0}/mo
                        </span>
                      </td>
                      <td className='p-4'>
                        <span className='text-sm text-muted-foreground'>
                          {formatRelativeTime(
                            org.lastActiveAt || org.lastActivity
                          )}
                        </span>
                      </td>
                      <td className='p-4'>
                        <div className='flex gap-2'>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='View Details'
                          >
                            <Eye className='h-4 w-4' />
                          </button>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='Impersonate'
                          >
                            <UserCog className='h-4 w-4' />
                          </button>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='Settings'
                          >
                            <Settings className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.pages > 1 && (
            <div className='flex items-center justify-between mt-6'>
              <p className='text-sm text-muted-foreground'>
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, data.pagination.total)} of{' '}
                {data.pagination.total} organizations
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                <div className='flex gap-1'>
                  {Array.from(
                    { length: Math.min(5, data.pagination.pages) },
                    (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1 rounded-lg ${
                            page === pageNum
                              ? 'bg-primary text-primary-foreground'
                              : 'border hover:bg-muted'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                  )}
                  {data.pagination.pages > 5 && (
                    <>
                      <span className='px-2 py-1'>...</span>
                      <button
                        onClick={() => setPage(data.pagination.pages)}
                        className={`px-3 py-1 rounded-lg ${
                          page === data.pagination.pages
                            ? 'bg-primary text-primary-foreground'
                            : 'border hover:bg-muted'
                        }`}
                      >
                        {data.pagination.pages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination.pages, p + 1))
                  }
                  disabled={page === data.pagination.pages}
                  className='p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
