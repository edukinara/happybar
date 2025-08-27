import type { AutumnCheckFeature, AutumnCustomerData } from '@happy-bar/types'
import { apiClient } from './client'

export interface CheckoutRequest {
  productId: string
  successUrl?: string
  entityId?: string
  options?: Record<string, number>
}

export interface AttachProductRequest {
  productId: string
  successUrl?: string
  entityId?: string
  options?: Record<string, number>
}

export interface CheckFeatureRequest {
  featureId: string
  requiredBalance?: number
  sendEvent?: boolean
  entityId?: string
}

export interface TrackUsageRequest {
  featureId: string
  value?: number
  entityId?: string
  eventName?: string
  track?: boolean
}

export interface BillingPortalRequest {
  returnUrl?: string
}

export interface CancelRequest {
  productId: string
}

// Subscription API client
export const subscriptionApi = {
  // Create checkout session
  async createCheckout(data: CheckoutRequest) {
    const response = await apiClient.post<{
      success: boolean
      data: {
        checkout: {
          checkout_url?: string
          url?: string
          success?: boolean
          product_ids?: string[]
        }
      }
    }>('/api/subscription/checkout', data)
    return response.data.checkout
  },

  // Attach product to customer
  async attachProduct(data: AttachProductRequest) {
    const response = await apiClient.post<{
      success: boolean
      data: { result: unknown }
    }>('/api/subscription/attach', data)
    return response.data.result
  },

  // Check feature access
  async checkFeature(data: CheckFeatureRequest) {
    const response = await apiClient.post<{
      success: boolean
      data: AutumnCheckFeature
    }>('/api/subscription/check', data)
    return response.data
  },

  // Track usage
  async trackUsage(data: TrackUsageRequest) {
    const response = await apiClient.post<{
      success: boolean
      data: { event: { success: boolean } }
    }>('/api/subscription/track', data)
    return response.data.event
  },

  // Get customer data
  async getCustomer() {
    const response = await apiClient.get<{
      success: boolean
      data: { customer: AutumnCustomerData }
    }>('/api/subscription/customer')
    return response.data.customer
  },

  // Get billing portal URL
  async getBillingPortal(data: BillingPortalRequest = {}) {
    const response = await apiClient.post<{
      success: boolean
      data: { url: string }
    }>('/api/subscription/billing-portal', data)
    return response.data.url
  },

  // Cancel subscription
  async cancel(data: CancelRequest) {
    const response = await apiClient.post<{
      success: boolean
      data: { result: unknown }
    }>('/api/subscription/cancel', data)
    return response.data.result
  },

  // Get feature usage
  async getUsage(featureId: string, entityId?: string) {
    const params = entityId ? `?entityId=${entityId}` : ''
    const response = await apiClient.get<{
      success: boolean
      data: { usage: unknown }
    }>(`/api/subscription/usage/${featureId}${params}`)
    return response.data.usage
  },

  // Get feature balances
  async getBalances(entityId?: string) {
    const params = entityId ? `?entityId=${entityId}` : ''
    const response = await apiClient.get<{
      success: boolean
      data: { balances: unknown }
    }>(`/api/subscription/balances${params}`)
    return response.data.balances
  },
}

// Hook to check if user has access to a feature
export async function checkFeatureAccess(
  featureId: string,
  requiredBalance?: number
): Promise<boolean> {
  try {
    const access = await subscriptionApi.checkFeature({
      featureId,
      requiredBalance,
    })
    return !!access?.access?.allowed
  } catch (error) {
    console.error('Failed to check feature access:', error)
    return false
  }
}

// Hook to track usage for a feature
export async function trackFeatureUsage(
  featureId: string,
  value?: number,
  track?: boolean
): Promise<void> {
  try {
    await subscriptionApi.trackUsage({
      featureId,
      value,
      track,
    })
  } catch (error) {
    console.error('Failed to track usage:', error)
  }
}

// Create checkout and redirect to Stripe
export async function initiateCheckout(
  productId: string,
  successUrl?: string
): Promise<void> {
  try {
    const checkout = await subscriptionApi.createCheckout({
      productId,
      successUrl:
        successUrl || `${window.location.origin}/dashboard?upgraded=true`,
    })

    if (checkout?.url) {
      window.location.href = checkout.url
    } else if (checkout?.success) {
      // Payment was successful (card on file)
      window.location.href = successUrl || '/dashboard?upgraded=true'
    }
  } catch (error) {
    console.error('Failed to initiate checkout:', error)
    throw error
  }
}

// Open billing portal in new tab
export async function openBillingPortal(): Promise<void> {
  try {
    const url = await subscriptionApi.getBillingPortal({
      returnUrl: `${window.location.origin}/dashboard/account`,
    })
    window.open(url, '_blank')
  } catch (error) {
    console.error('Failed to open billing portal:', error)
    throw error
  }
}
