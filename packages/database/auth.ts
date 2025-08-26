import { autumn } from 'autumn-js/better-auth'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { PrismaClient } from './dist/client'

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      allowUserToLeaveOrganization: true,
      sendInvitationEmail: async (data) => {
        console.log('Organization invitation:', data)
      },
      // schema: {
      //   organization: {
      //     // fields: {
      //     //   domain: {
      //     //     type: "string",
      //     //     required: false,
      //     //   },
      //     //   settings: {
      //     //     type: "string", // JSON string
      //     //     required: false,
      //     //   },
      //     //   plan: {
      //     //     type: "string",
      //     //     required: false,
      //     //     defaultValue: "free",
      //     //   },
      //     // },
      //   },
      // },
    }),
    autumn({
      secretKey: process.env.AUTUMN_SECRET_KEY || '',
    }),
  ],
  telemetry: { enabled: false },
})
