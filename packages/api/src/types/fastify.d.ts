import { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      name: string
    }
    organization?: {
      id: string
      name: string
      slug: string
    }
  }
}
