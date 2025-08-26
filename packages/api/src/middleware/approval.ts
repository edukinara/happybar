import { FastifyRequest, FastifyReply } from 'fastify'
import { AppError, ErrorCode } from '@happy-bar/types'
import type { HappyBarRole } from '@happy-bar/types'
import { canApproveOrder, getNextApproverRole, hasMinimumRoleLevel } from '../utils/permissions'
import { AuthenticatedRequest } from './auth-simple'

/**
 * Approval workflow middleware for handling various approval processes
 */

export interface ApprovalRequest extends AuthenticatedRequest {
  approvalContext?: {
    type: 'order' | 'transfer' | 'adjustment' | 'bulk_operation'
    amount?: number
    items?: any[]
    targetLocationId?: string
    reason?: string
  }
}

/**
 * Order approval middleware
 * Checks if user can approve orders based on role and amount
 */
export const requireOrderApproval = (getOrderAmount: (request: FastifyRequest) => Promise<number> | number) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderAmount = typeof getOrderAmount === 'function' ? await getOrderAmount(request) : 0
      
      if (!canApproveOrder(request.member!.role, orderAmount)) {
        const nextApprover = getNextApproverRole(request.member!.role)
        throw new AppError(
          `Order amount $${orderAmount.toFixed(2)} exceeds your approval limit. Requires approval from ${nextApprover || 'higher authority'}`,
          ErrorCode.FORBIDDEN,
          403
        )
      }

      // Set approval context for downstream handlers
      request.approvalContext = {
        type: 'order',
        amount: orderAmount
      }
    } catch (error) {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      } else {
        console.error('Order approval check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Transfer approval middleware
 * Checks if user can approve inventory transfers between locations
 */
export const requireTransferApproval = (minimumRole: HappyBarRole = 'supervisor') => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!hasMinimumRoleLevel(request.member!.role, minimumRole)) {
        throw new AppError(
          `Transfer approval requires at least ${minimumRole} role`,
          ErrorCode.FORBIDDEN,
          403
        )
      }

      // Set approval context
      request.approvalContext = {
        type: 'transfer'
      }
    } catch (error) {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      } else {
        console.error('Transfer approval check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Adjustment approval middleware
 * Checks if user can approve inventory adjustments
 */
export const requireAdjustmentApproval = (minimumRole: HappyBarRole = 'inventoryManager') => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!hasMinimumRoleLevel(request.member!.role, minimumRole)) {
        throw new AppError(
          `Inventory adjustment approval requires at least ${minimumRole} role`,
          ErrorCode.FORBIDDEN,
          403
        )
      }

      // Set approval context
      request.approvalContext = {
        type: 'adjustment'
      }
    } catch (error) {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      } else {
        console.error('Adjustment approval check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Bulk operation approval middleware
 * Checks if user can perform bulk operations (requires supervisor or higher)
 */
export const requireBulkOperationApproval = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!hasMinimumRoleLevel(request.member!.role, 'supervisor')) {
        throw new AppError(
          'Bulk operations require supervisor role or higher',
          ErrorCode.FORBIDDEN,
          403
        )
      }

      // Set approval context
      request.approvalContext = {
        type: 'bulk_operation'
      }
    } catch (error) {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      } else {
        console.error('Bulk operation approval check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Dynamic approval middleware factory
 * Creates approval middleware based on context and business rules
 */
export const createApprovalMiddleware = (config: {
  type: 'order' | 'transfer' | 'adjustment' | 'bulk_operation'
  minimumRole?: HappyBarRole
  amountField?: string
  customValidator?: (request: FastifyRequest) => Promise<boolean> | boolean
}) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type, minimumRole, amountField, customValidator } = config

      // Check minimum role if specified
      if (minimumRole && !hasMinimumRoleLevel(request.member!.role, minimumRole)) {
        throw new AppError(
          `Operation requires at least ${minimumRole} role`,
          ErrorCode.FORBIDDEN,
          403
        )
      }

      // Handle amount-based approvals for orders
      if (type === 'order' && amountField) {
        const amount = (request.body as any)?.[amountField] || 0
        if (!canApproveOrder(request.member!.role, amount)) {
          const nextApprover = getNextApproverRole(request.member!.role)
          throw new AppError(
            `Amount $${amount.toFixed(2)} exceeds your approval limit. Requires approval from ${nextApprover || 'higher authority'}`,
            ErrorCode.FORBIDDEN,
            403
          )
        }
      }

      // Run custom validation if provided
      if (customValidator) {
        const isValid = await customValidator(request)
        if (!isValid) {
          throw new AppError(
            'Custom approval validation failed',
            ErrorCode.FORBIDDEN,
            403
          )
        }
      }

      // Set approval context
      request.approvalContext = {
        type,
        amount: amountField ? (request.body as any)?.[amountField] : undefined
      }
    } catch (error) {
      if (error instanceof AppError) {
        reply.code(error.statusCode).send({
          success: false,
          error: error.message,
          code: error.code
        })
      } else {
        console.error('Dynamic approval check error:', error)
        reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR
        })
      }
    }
  }
}

/**
 * Approval workflow helpers
 */

/**
 * Get approval requirements for an operation
 */
export function getApprovalRequirements(
  type: 'order' | 'transfer' | 'adjustment' | 'bulk_operation',
  amount?: number
): {
  requiredRole: HappyBarRole
  nextApprover?: HappyBarRole
  canAutoApprove: boolean
} {
  switch (type) {
    case 'order':
      if (!amount) {
        return { requiredRole: 'staff', canAutoApprove: true }
      }
      
      // Determine required role based on amount
      if (amount <= 1000) {
        return { requiredRole: 'supervisor', canAutoApprove: true }
      } else if (amount <= 5000) {
        return { requiredRole: 'buyer', canAutoApprove: true }
      } else if (amount <= 10000) {
        return { requiredRole: 'manager', canAutoApprove: true }
      } else {
        return { 
          requiredRole: 'admin', 
          nextApprover: 'owner',
          canAutoApprove: false 
        }
      }

    case 'transfer':
      return { requiredRole: 'supervisor', canAutoApprove: true }

    case 'adjustment':
      return { requiredRole: 'inventoryManager', canAutoApprove: true }

    case 'bulk_operation':
      return { requiredRole: 'supervisor', canAutoApprove: true }

    default:
      return { requiredRole: 'admin', canAutoApprove: false }
  }
}

/**
 * Create approval workflow record
 */
export async function createApprovalWorkflow(
  prisma: any,
  data: {
    type: string
    entityId: string
    entityType: string
    requesterId: string
    organizationId: string
    amount?: number
    reason?: string
    metadata?: any
  }
) {
  const approval = await prisma.approvalWorkflow.create({
    data: {
      type: data.type,
      entityId: data.entityId,
      entityType: data.entityType,
      requesterId: data.requesterId,
      organizationId: data.organizationId,
      amount: data.amount,
      reason: data.reason,
      metadata: data.metadata,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return approval
}

/**
 * Process approval decision
 */
export async function processApprovalDecision(
  prisma: any,
  approvalId: string,
  approverId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string
) {
  const approval = await prisma.approvalWorkflow.update({
    where: { id: approvalId },
    data: {
      status: decision,
      approverId,
      approvedAt: decision === 'APPROVED' ? new Date() : null,
      rejectedAt: decision === 'REJECTED' ? new Date() : null,
      approverReason: reason,
      updatedAt: new Date()
    },
    include: {
      requester: true,
      approver: true
    }
  })

  return approval
}

/**
 * Check pending approvals for user
 */
export async function getPendingApprovals(
  prisma: any,
  userId: string,
  organizationId: string,
  userRole: HappyBarRole
) {
  // Users can see approvals they need to act on based on their role
  const approvals = await prisma.approvalWorkflow.findMany({
    where: {
      organizationId,
      status: 'PENDING',
      // Add logic to filter based on what the user can approve
    },
    include: {
      requester: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return approvals
}