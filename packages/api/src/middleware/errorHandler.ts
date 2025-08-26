import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { AppError, ErrorCode } from '@happy-bar/types'
import { ZodError, ZodIssue } from 'zod'
import { Prisma } from '@happy-bar/database'

export async function errorHandler(
  error: FastifyError & { statusCode?: number; code?: string },
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Use Fastify's built-in logger
  request.log.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      query: request.query
    }
  })

  // Handle custom application errors
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      success: false,
      error: error.code,
      message: error.message,
      details: error.details
    })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const zodErr = error as any // Temporary fix for complex type intersection
    return reply.code(400).send({
      success: false,
      error: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: zodErr.errors ? zodErr.errors.map((e: any) => ({
        path: e.path ? e.path.join('.') : '',
        message: e.message,
        code: e.code
      })) : []
    })
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return reply.code(409).send({
          success: false,
          error: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists'
        })
      case 'P2025':
        return reply.code(404).send({
          success: false,
          error: ErrorCode.NOT_FOUND,
          message: 'Record not found'
        })
      default:
        request.log.error({ prismaError: error }, 'Unhandled Prisma error')
        return reply.code(500).send({
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Database operation failed'
        })
    }
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      error: ErrorCode.VALIDATION_ERROR,
      message: 'Request validation failed',
      details: error.validation
    })
  }

  // Handle JWT errors
  if (error.code === 'FAST_JWT_MALFORMED' || error.code === 'FAST_JWT_INVALID_SIGNATURE') {
    return reply.code(401).send({
      success: false,
      error: ErrorCode.UNAUTHORIZED,
      message: 'Invalid or malformed token'
    })
  }

  if (error.code === 'FAST_JWT_EXPIRED') {
    return reply.code(401).send({
      success: false,
      error: ErrorCode.UNAUTHORIZED,
      message: 'Token has expired'
    })
  }

  // Handle specific HTTP errors
  const statusCode = error.statusCode || 500

  switch (statusCode) {
    case 400:
      return reply.code(400).send({
        success: false,
        error: ErrorCode.VALIDATION_ERROR,
        message: error.message || 'Bad request'
      })
    case 401:
      return reply.code(401).send({
        success: false,
        error: ErrorCode.UNAUTHORIZED,
        message: error.message || 'Unauthorized'
      })
    case 403:
      return reply.code(403).send({
        success: false,
        error: ErrorCode.FORBIDDEN,
        message: error.message || 'Forbidden'
      })
    case 404:
      return reply.code(404).send({
        success: false,
        error: ErrorCode.NOT_FOUND,
        message: error.message || 'Not found'
      })
    case 429:
      return reply.code(429).send({
        success: false,
        error: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: error.message || 'Too many requests'
      })
  }

  // Generic server error
  return reply.code(500).send({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  })
}