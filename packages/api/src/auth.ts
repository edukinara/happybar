import { expo } from '@better-auth/expo'
import { PrismaClient } from '@happy-bar/database'
import { autumn } from 'autumn-js/better-auth'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, organization } from 'better-auth/plugins'
import { ac, roles } from './auth/roles'
import { env } from './config/env'
import { sendInvitationEmail } from './utils/email'
import { PendingAssignmentManager } from './utils/pending-assignments'
import { redis } from './utils/redis-client'
import { UsageTracker } from './utils/usage-tracker'

const prisma = new PrismaClient()

export const auth: any = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user: any) => {
          // Check if this user creation is from a social provider by checking if image field exists
          // Social providers typically set an image/avatar field
          if (user.image && user.image.includes('googleusercontent.com')) {
            // Block creation of new users via social providers
            throw new Error(
              'Social sign-in is only available for existing accounts. Please create an account with email/password first, then link your social accounts from settings.'
            )
          }

          return { data: user }
        },
      },
    },
    account: {
      create: {
        before: async (account: any) => {
          // If this is a social provider account being created
          if (account.provider && account.provider !== 'credential') {
            // Check if the user already exists
            const existingUser = await prisma.user.findUnique({
              where: { id: account.userId },
            })

            if (!existingUser) {
              throw new Error(
                'Social sign-in is only available for existing accounts. Please create an account with email/password first, then link your social accounts from settings.'
              )
            }
          }

          return { data: account }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Find user's organization
          const membership = await prisma.member.findFirst({
            where: {
              userId: session.userId,
            },
            include: {
              organization: true,
            },
          })

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId || null,
            },
          }
        },
      },
    },
    member: {
      create: {
        after: async (member: any) => {
          // Track team member usage when a new member is added
          try {
            await UsageTracker.updateTeamMemberUsage(
              member.userId,
              member.organizationId,
              prisma
            )
          } catch (error) {
            console.error(
              'Failed to track team member usage after creation:',
              error
            )
          }

          // Apply pending location assignments if any exist
          try {
            const user = await prisma.user.findUnique({
              where: { id: member.userId },
            })

            if (user?.email) {
              await PendingAssignmentManager.applyPendingAssignment(
                member.userId,
                user.email,
                member.organizationId,
                prisma
              )
            }
          } catch (error) {
            console.error(
              'Failed to apply pending location assignments:',
              error
            )
          }

          // Set the organization as active in the user's session
          try {
            await prisma.session.updateMany({
              where: {
                userId: member.userId,
                expiresAt: {
                  gt: new Date(),
                },
              },
              data: {
                activeOrganizationId: member.organizationId,
              },
            })
          } catch (error) {
            console.error(
              'Failed to set active organization in session:',
              error
            )
          }
        },
      },
      delete: {
        after: async (member: any) => {
          // Track team member usage when a member is removed
          try {
            // Find any remaining member to get their userId for tracking
            const remainingMember = await prisma.member.findFirst({
              where: { organizationId: member.organizationId },
            })

            if (remainingMember) {
              await UsageTracker.updateTeamMemberUsage(
                remainingMember.userId,
                member.organizationId,
                prisma
              )
            }
          } catch (error) {
            console.error(
              'Failed to track team member usage after deletion:',
              error
            )
          }
        },
      },
    },
  },
  baseURL: env.API_BASE_URL, // Use API port for auth base URL
  basePath: '/api/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Start simple, can enable later
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    // Automatically link accounts if a user with the same email exists
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'], // Trust Google to link accounts by email
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieName: 'better-auth.session_token', // Explicit cookie name
    secure: env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax',
    cookieOptions: {
      domain: env.NODE_ENV === 'production' ? '.happybar.app' : undefined, // Allow cookie sharing across subdomains
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  },
  plugins: [
    expo(),
    organization({
      allowUserToCreateOrganization: true,
      allowUserToLeaveOrganization: true,
      sendInvitationEmail: async (data) => {
        // Use APP_BASE_URL environment variable for the frontend URL
        const invitationUrl = `${env.APP_BASE_URL}/accept-invitation/${data.invitation.id}`

        await sendInvitationEmail({
          email: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          invitationUrl,
          role: data.role,
        })
      },
    }),
    admin({
      ac,
      roles: {
        owner: roles.owner,
        admin: roles.admin,
        manager: roles.manager,
        inventory_manager: roles.inventory_manager,
        buyer: roles.buyer,
        supervisor: roles.supervisor,
        staff: roles.staff,
        viewer: roles.viewer,
      },
    }),
    autumn({
      secretKey: env.AUTUMN_SECRET_KEY!,
    }),
  ],
  trustedOrigins: [env.APP_BASE_URL],
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key)
      if (!value) return null

      // If the value is already a string, return it
      if (typeof value === 'string') return value

      // If it's an object, stringify it
      return JSON.stringify(value)
    },
    set: async (key, value, ttl) => {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value)
      if (ttl) {
        await redis.set(key, stringValue, { ex: ttl })
      } else {
        await redis.set(key, stringValue)
      }
    },
    delete: async (key) => {
      await redis.del(key)
    },
  },
})

export type Session = {
  session: {
    id: string
    userId: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    token: string
    ipAddress?: string | null | undefined
    userAgent?: string | null | undefined
    activeOrganizationId?: string | null | undefined
  }
  user: {
    id: string
    email: string
    emailVerified: boolean
    name: string
    createdAt: Date
    updatedAt: Date
    image?: string | null | undefined
  }
}
export type User = {
  id: string
  email: string
  emailVerified: boolean
  name: string
  createdAt: Date
  updatedAt: Date
  image?: string | null | undefined
}
export type Organization = {
  id: string
  name: string
  slug: string
  createdAt: Date
  logo?: string | null | undefined
  metadata?: any
}

export type Member = {
  id: string
  organizationId: string
  userId: string
  role: keyof typeof roles
  createdAt: Date
}

// Export roles and access controller for use in other files
export type { HappyBarStatements, Permission } from './auth/permissions'
export { ac, roles } from './auth/roles'
