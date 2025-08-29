'use client'

import { AdminHeader } from '@/components/admin-header'
import { AuthGuard } from '@/components/auth-guard'
import { adminApi } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Search,
  Shield,
  User,
  UserCheck,
  UserX,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface UserOrganization {
  id: string
  name: string
}

interface Member {
  organization: UserOrganization
}

interface UserData {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  createdAt: string
  members: Member[]
  sessions: { createdAt: string }[]
}

interface UsersResponse {
  users: UserData[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

function StatusBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
        <UserCheck className='size-3' />
        Verified
      </span>
    )
  }

  return (
    <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
      <UserX className='size-3' />
      Unverified
    </span>
  )
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', { page, limit, search: searchQuery }],
    queryFn: () => adminApi.getUsers({ page, limit, search: searchQuery }),
    placeholderData: (previousData) => previousData,
  })

  const users = data?.users || []

  const formatDate = (dateString: string) => {
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
              <h1 className='text-3xl font-bold mb-2'>Users</h1>
              <p className='text-muted-foreground'>
                Manage platform users across all organizations
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className='flex gap-4 mb-6'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground' />
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
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-4 gap-4 mb-6'>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Total Users</p>
              <p className='text-2xl font-bold'>
                {data?.pagination.total || 0}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Verified</p>
              <p className='text-2xl font-bold text-green-600'>
                {users.filter((u) => u.emailVerified).length}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>
                Multi-Organization
              </p>
              <p className='text-2xl font-bold'>
                {users.filter((u) => u.members.length > 1).length}
              </p>
            </div>
            <div className='bg-card p-4 rounded-lg border'>
              <p className='text-sm text-muted-foreground'>Active Today</p>
              <p className='text-2xl font-bold'>
                {
                  users.filter((u) => {
                    const lastSession = u.sessions[0]?.createdAt
                    if (!lastSession) return false
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                    return new Date(lastSession) > oneDayAgo
                  }).length
                }
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className='bg-card rounded-lg border overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='text-left p-4 font-medium'>User</th>
                  <th className='text-left p-4 font-medium'>Status</th>
                  <th className='text-left p-4 font-medium'>Organizations</th>
                  <th className='text-left p-4 font-medium'>Joined</th>
                  <th className='text-left p-4 font-medium'>Last Active</th>
                  <th className='text-left p-4 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className='text-center p-8'>
                      <div className='flex items-center justify-center gap-2'>
                        <Clock className='size-4 animate-spin' />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='text-center p-8 text-muted-foreground'
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className='border-t hover:bg-muted/50'>
                      <td className='p-4'>
                        <div className='flex items-center gap-3'>
                          <div className='h-10 w-10 rounded-full bg-muted flex items-center justify-center'>
                            <User className='size-5' />
                          </div>
                          <div>
                            <p className='font-medium'>
                              {user.name || 'No name'}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='p-4'>
                        <StatusBadge verified={user.emailVerified} />
                      </td>
                      <td className='p-4'>
                        {user.members.length === 0 ? (
                          <span className='text-muted-foreground'>
                            No organizations
                          </span>
                        ) : user.members.length === 1 ? (
                          <Link
                            href={`/organizations/${user.members[0].organization.id}`}
                            className='text-primary hover:underline flex items-center gap-1'
                          >
                            <Building2 className='size-3' />
                            {user.members[0].organization.name}
                          </Link>
                        ) : (
                          <span className='inline-flex items-center gap-1'>
                            <Building2 className='size-3' />
                            {user.members.length} organizations
                          </span>
                        )}
                      </td>
                      <td className='p-4'>
                        <div className='flex items-center gap-1 text-sm'>
                          <Calendar className='size-3' />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className='p-4'>
                        <span className='text-sm text-muted-foreground'>
                          {formatRelativeTime(
                            user.sessions[0]?.createdAt || null
                          )}
                        </span>
                      </td>
                      <td className='p-4'>
                        <div className='flex gap-2'>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='View Details'
                          >
                            <User className='size-4' />
                          </button>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='Send Email'
                          >
                            <Mail className='size-4' />
                          </button>
                          <button
                            className='p-1 hover:bg-muted rounded'
                            title='Permissions'
                          >
                            <Shield className='size-4' />
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
                {data.pagination.total} users
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='size-4' />
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
                  <ChevronRight className='size-4' />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
