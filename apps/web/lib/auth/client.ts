import { autumn } from 'autumn-js/better-auth'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
// Note: Type import from API package - better-auth will handle type inference

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  basePath: '/api/auth',
  plugins: [
    organizationClient(),
    adminClient(),
    autumn(),
    // Note: inferAdditionalFields will be added once we resolve type imports
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
