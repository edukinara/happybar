'use client'

import { signIn, signOut, signUp, useSession } from '@/lib/auth/client'
import type { HappyBarRole, Me, UserWithRole } from '@happy-bar/types'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: UserWithRole | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  isLoading: boolean // Add alias for consistency
  // Better Auth session data
  session: unknown
}

interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  companyName: string
  domain?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Use Better Auth session hook
  const { data: session, isPending } = useSession()

  // Update user state when session changes
  useEffect(() => {
    const fetchUserRole = async () => {
      if (
        !isPending &&
        session?.user &&
        session?.session?.activeOrganizationId
      ) {
        try {
          // Fetch user's organization membership to get role
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`,
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )

          if (response.ok) {
            const apiResponse: { success?: boolean; data?: Me } =
              await response.json()
            // const apiResponse = await response.json()

            if (apiResponse.success && apiResponse.data) {
              // API returned successful response with data
              const { data } = apiResponse
              // Normalize role name from snake_case to camelCase if needed
              let role = data.member?.role || 'staff'
              if (role === 'inventory_manager') {
                role = 'inventoryManager'
              }

              // Process location assignments into permissions
              const permissions = data.locationAssignments
                ? data.locationAssignments.map((assignment) => ({
                    locationId: assignment.locationId,
                    locationName: assignment.locationName,
                    canRead: assignment.canRead,
                    canWrite: assignment.canWrite,
                    canManage: assignment.canManage,
                  }))
                : []

              const userData: UserWithRole = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || '',
                role: role as HappyBarRole,
                organizationId: session.session.activeOrganizationId,
                permissions,
              }
              setUser(userData)
            } else {
              // API returned error or no data - user might not have organization membership
              console.warn(
                'Auth API returned error or no membership data:',
                apiResponse
              )
              const userData: UserWithRole = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || '',
                role: 'staff' as HappyBarRole,
                organizationId: session.session.activeOrganizationId,
                permissions: [],
              }
              setUser(userData)
            }
          } else {
            console.error(
              'Auth API call failed:',
              response.status,
              response.statusText
            )
            const errorText = await response.text()
            console.error('Error response:', errorText)

            // Fallback to default role if API call fails
            const userData: UserWithRole = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name || '',
              role: 'staff' as HappyBarRole,
              organizationId: session.session.activeOrganizationId,
              permissions: [],
            }
            setUser(userData)
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error)
          // Fallback to default role
          const userData: UserWithRole = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || '',
            role: 'staff' as HappyBarRole,
            organizationId: session.session.activeOrganizationId,
            permissions: [],
          }
          console.warn('Setting fallback user data due to error')
          setUser(userData)
        }
      } else if (
        !isPending &&
        session?.user &&
        !session?.session?.activeOrganizationId
      ) {
        console.warn(
          'User has session but no activeOrganizationId, checking membership directly'
        )

        // Try to fetch user's organization membership even without activeOrganizationId
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`,
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )

          if (response.ok) {
            const apiResponse: { success?: boolean; data?: Me } =
              await response.json()
            // console.log('Auth API response (no active org):', apiResponse)

            if (apiResponse.success && apiResponse.data?.member) {
              // User has membership but no active organization set
              const { data } = apiResponse
              // Normalize role name from snake_case to camelCase if needed
              let role = data.member.role
              if (role === 'inventory_manager') {
                role = 'inventoryManager'
              }

              // Process location assignments into permissions
              const permissions = data.locationAssignments
                ? data.locationAssignments.map((assignment) => ({
                    locationId: assignment.locationId,
                    locationName: assignment.locationName,
                    canRead: assignment.canRead,
                    canWrite: assignment.canWrite,
                    canManage: assignment.canManage,
                  }))
                : []

              const userData: UserWithRole = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || '',
                role: role as HappyBarRole,
                organizationId: data.member.organizationId,
                permissions,
              }
              setUser(userData)
            } else {
              // User has no organization membership - still set user data for invitation flow
              console.warn(
                'User has no organization membership, setting basic user data'
              )
              const userData: UserWithRole = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || '',
                role: 'staff' as HappyBarRole, // Default role for users without organizations
                organizationId: null,
                permissions: [],
              }
              setUser(userData)
            }
          } else {
            console.error('Failed to fetch membership without active org')
            // Still set basic user data even if API call failed
            const userData: UserWithRole = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name || '',
              role: 'staff' as HappyBarRole,
              organizationId: null,
              permissions: [],
            }
            setUser(userData)
          }
        } catch (error) {
          console.error('Error fetching membership without active org:', error)
          // Still set basic user data even if API call failed
          const userData: UserWithRole = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || '',
            role: 'staff' as HappyBarRole,
            organizationId: null,
            permissions: [],
          }
          setUser(userData)
        }
      } else if (!isPending && !session?.user) {
        setUser(null)
      }

      if (!isPending) {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [session, isPending])

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Login failed')
      }

      // Router push will be handled by the session effect above
      router.push('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      // Step 1: Create the user account
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Registration failed')
      }

      // Step 2: Automatically create organization with company name (only if companyName provided)
      if (data.companyName && data.companyName.trim()) {
        try {
          // Generate a domain slug from company name
          const domain = data.companyName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .substring(0, 50) // Limit length

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/create-organization`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include cookies for session
              body: JSON.stringify({
                name: data.companyName,
                domain: domain,
              }),
            }
          )

          if (!response.ok) {
            console.warn(
              'Organization creation failed, user will need to complete onboarding manually'
            )
          }
        } catch (orgError) {
          console.warn('Organization creation failed:', orgError)
          // Don't fail registration if organization creation fails
          // User can complete onboarding manually
        }
      }
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Still redirect to login even if signOut fails
      setUser(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading: loading || isPending,
        isLoading: loading || isPending,
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
