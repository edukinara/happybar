// Load environment configuration first
import { Autumn } from 'autumn-js'
import { env } from '../config/env'

// Define Result type based on autumn-js internal structure
type Success<T> = {
  data: T
  error: null
  statusCode?: number
}
type Failure<E> = {
  data: null
  error: E
  statusCode?: number
}
type Result<T, E> = Success<T> | Failure<E>

// Initialize Autumn with secret key from env config
const autumn = new Autumn({
  secretKey: env.AUTUMN_SECRET_KEY,
})

export interface SubscriptionCustomer {
  id: string
  email?: string
  name?: string
  fingerprint?: string
}

export interface CheckoutOptions {
  customerId: string
  productId: string
  successUrl?: string
  entityId?: string
  options?: Record<string, number>
  customerData?: Record<string, any>
}

export interface FeatureCheckOptions {
  customerId: string
  featureId: string
  requiredBalance?: number
  sendEvent?: boolean
  entityId?: string
}

export interface UsageTrackingOptions {
  customerId: string
  featureId: string
  track?: boolean
  value?: number
  entityId?: string
  eventName?: string
}

export class SubscriptionService {
  /**
   * Create a new customer in Autumn
   */
  static async createCustomer(customer: SubscriptionCustomer) {
    try {
      const result = await autumn.customers.create({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        fingerprint: customer.fingerprint,
      })

      if (result.error) {
        console.error('Autumn API error creating customer:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to create customer in Autumn:', error)
      throw error
    }
  }

  /**
   * Get customer data from Autumn
   */
  static async getCustomer(customerId: string) {
    try {
      const result = await autumn.customers.get(customerId)

      if (result.error) {
        // Don't log 404 errors as errors - they're expected for new users
        if (result.error.code === 'customer_not_found') {
          throw new Error('Customer not found') // Convert to standard error for existing logic
        }
        console.error('Autumn API error getting customer:', result.error)
        throw result.error
      }

      return result.data
    } catch (error: any) {
      // Handle legacy error format for backward compatibility
      if (error.message === 'Customer not found') {
        const mockError = { response: { status: 404 } }
        throw mockError
      }
      console.error('Failed to get customer from Autumn:', error)
      throw error
    }
  }

  /**
   * Update customer in Autumn
   */
  static async updateCustomer(
    customerId: string,
    data: Partial<SubscriptionCustomer>
  ) {
    try {
      const result = await autumn.customers.update(customerId, data)

      if (result.error) {
        console.error('Autumn API error updating customer:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to update customer in Autumn:', error)
      throw error
    }
  }

  /**
   * Create checkout session for subscription
   */
  static async createCheckout(options: CheckoutOptions) {
    try {
      const result = await autumn.checkout({
        customer_id: options.customerId,
        product_id: options.productId,
        success_url: options.successUrl,
        entity_id: options.entityId,
        // options: options.options, // Remove this for now since we need to check the correct format
        customer_data: options.customerData,
      })

      if (result.error) {
        console.error('Autumn API error creating checkout:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      throw error
    }
  }

  /**
   * Attach product to customer (for existing payment methods)
   */
  static async attachProduct(options: CheckoutOptions) {
    try {
      const result = await autumn.attach({
        customer_id: options.customerId,
        product_id: options.productId,
        success_url: options.successUrl,
        entity_id: options.entityId,
        // options: options.options, // Remove this for now since we need to check the correct format
        customer_data: options.customerData,
      })

      if (result.error) {
        console.error('Autumn API error attaching product:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to attach product:', error)
      throw error
    }
  }

  /**
   * Check if customer has access to a feature/product
   */
  static async checkFeatureAccess(options: FeatureCheckOptions) {
    try {
      const result = await autumn.check({
        customer_id: options.customerId,
        feature_id: options.featureId,
        required_balance: options.requiredBalance,
        send_event: options.sendEvent,
        entity_id: options.entityId,
      })

      if (result.error) {
        console.error('Autumn API error checking feature access:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to check feature access:', error)
      throw error
    }
  }

  /**
   * Track usage for a feature
   */
  static async trackUsage(options: UsageTrackingOptions) {
    try {
      const result =
        !options.track && options.value !== undefined
          ? await autumn.usage({
              customer_id: options.customerId,
              feature_id: options.featureId,
              value: options.value,
            })
          : await autumn.track({
              customer_id: options.customerId,
              feature_id: options.featureId,
              value: options.value,
              entity_id: options.entityId,
              event_name: options.eventName,
            })

      if (result.error) {
        console.error('Autumn API error tracking usage:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to track usage:', error)
      throw error
    }
  }

  /**
   * Get billing portal URL for customer
   */
  static async getBillingPortal(customerId: string, returnUrl?: string) {
    try {
      const result = await autumn.customers.billingPortal(customerId, {
        return_url: returnUrl,
      })

      if (result.error) {
        console.error('Autumn API error getting billing portal:', result.error)
        throw result.error
      }

      return result.data?.url
    } catch (error) {
      console.error('Failed to get billing portal URL:', error)
      throw error
    }
  }

  /**
   * Cancel customer's subscription/product
   */
  static async cancelProduct(customerId: string, productId: string) {
    try {
      const result = await autumn.cancel({
        customer_id: customerId,
        product_id: productId,
      })

      if (result.error) {
        console.error('Autumn API error canceling product:', result.error)
        throw result.error
      }

      return result.data
    } catch (error) {
      console.error('Failed to cancel product:', error)
      throw error
    }
  }

  /**
   * Get feature usage for customer
   */
  static async getFeatureUsage(
    customerId: string,
    featureId: string,
    entityId?: string
  ) {
    try {
      // Note: This might need to be updated based on actual Autumn SDK API
      console.log('Feature usage tracking not yet implemented for:', {
        customerId,
        featureId,
        entityId,
      })
      return { usage: 0 }
    } catch (error) {
      console.error('Failed to get feature usage:', error)
      throw error
    }
  }

  /**
   * Get feature balances for customer
   */
  static async getFeatureBalances(customerId: string, entityId?: string) {
    try {
      // Note: This might need to be updated based on actual Autumn SDK API
      console.log('Feature balances not yet implemented for:', {
        customerId,
        entityId,
      })
      return { balances: {} }
    } catch (error) {
      console.error('Failed to get feature balances:', error)
      throw error
    }
  }

  static async getProducts() {
    try {
      const result = await autumn.products.list()

      if (result.error) {
        console.error('Autumn API error getting products:', result.error)
        throw result.error
      }

      return result.data?.list || []
    } catch (error) {
      console.error('Failed to get products:', error)
      throw error
    }
  }
}
