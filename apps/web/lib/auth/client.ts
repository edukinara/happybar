import { ac, roles } from '@happy-bar/api/auth-exports'
import { autumn } from 'autumn-js/better-auth'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
// Note: Import roles and access controller from API package exports

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  basePath: '/api/auth',
  credentials: 'include', // Ensure cookies are sent with cross-origin requests
  plugins: [
    organizationClient({
      ac: ac as any, // Type assertion needed for client-side compatibility
      roles: {
        owner: roles.owner,
        admin: roles.admin,
        manager: roles.manager,
        inventoryManager: roles.inventoryManager,
        buyer: roles.buyer,
        supervisor: roles.supervisor,
        staff: roles.staff,
        viewer: roles.viewer,
      },
    }),
    adminClient({
      ac: ac as any, // Type assertion needed for client-side compatibility
      roles: {
        owner: roles.owner,
        admin: roles.admin,
        manager: roles.manager,
        inventoryManager: roles.inventoryManager,
        buyer: roles.buyer,
        supervisor: roles.supervisor,
        staff: roles.staff,
        viewer: roles.viewer,
      },
    }),
    autumn(),
  ],
})

export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  listSessions,
  revokeSessions,
  organization,
  admin,
} = authClient

// Types will be available through better-auth type inference
