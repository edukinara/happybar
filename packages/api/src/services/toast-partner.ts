import axios, { AxiosInstance } from 'axios'

/**
 * Toast Partner API Service
 *
 * Implementation based on the official Toast Partner API OpenAPI specification:
 * https://doc.toasttab.com/toast-api-specifications/toast-partners-api.yaml
 *
 * Key Features:
 * - OAuth2 authentication with Bearer tokens
 * - Paginated responses using page tokens
 * - Support for both /restaurants and /connectedRestaurants endpoints
 * - Location code mapping via externalRestaurantRef field
 * - Proper error handling and type safety
 *
 * API Endpoints:
 * - GET /restaurants: Basic list of accessible restaurants
 * - GET /connectedRestaurants: Paginated list with connection details
 * - GET /menus/v2/menus: Get restaurant menu data (Menus API v2), { headers: {'Toast-Restaurant-External-ID': restaurantGuid } }
 * - GET /orders/v2/ordersBulk: Get restaurant orders (Orders API), { headers: {'Toast-Restaurant-External-ID': restaurantGuid } }
 *
 * Authentication:
 * - Requires TOAST_PARTNER_TOKEN for production
 */

/**
 * Toast Partner API schema for connected restaurants
 * Based on official OpenAPI specification
 */
export interface PartnerAccessExternalRep {
  restaurantGuid: string // UUID - Unique Toast POS restaurant identifier
  managementGroupGuid: string // UUID - Management group GUID
  deleted: boolean // Restaurant's active status
  restaurantName: string // Human-readable restaurant name
  locationName: string // Specific location identifier
  createdByEmailAddress: string // Email of employee who connected restaurant
  externalGroupRef: string | null // Partner service restaurant group identifier
  externalRestaurantRef: string | null // Partner service restaurant location identifier (our location codes)
  modifiedDate: string // Last edit timestamp in epoch time
  createdDate: string // Creation timestamp in epoch time
  isoModifiedDate: string // Last edit timestamp in ISO8601 format
  isoCreatedDate: string // Creation timestamp in ISO8601 format
}

/**
 * Toast Partner API paginated response structure
 * Based on official OpenAPI specification
 */
export interface PaginatedResponse<T = PartnerAccessExternalRep> {
  currentPageNum: number // Current page number
  results: T[] // List of results
  totalResultCount: number // Total number of records
  pageSize: number // Number of items per page
  currentPageToken: string // Current page identifier
  nextPageToken: string | null // Next page identifier
  totalCount: number // Total results count
  nextPageNum: number | null // Next available page number
  lastPageNum: number // Last page number
  previousPageNum: number | null // Previous page number
}

// Type alias for backward compatibility
export type ToastConnectedRestaurant = PartnerAccessExternalRep
export type ConnectedRestaurantsResponse =
  PaginatedResponse<PartnerAccessExternalRep>

/**
 * Service to handle Toast Partner API operations
 * As a Toast partner, we can access restaurants that have connected to our integration
 */
export class ToastPartnerService {
  private partnerToken: string
  private partnerApiClient: AxiosInstance

  constructor() {
    this.partnerToken = process.env.TOAST_PARTNER_TOKEN || ''

    if (!this.partnerToken) {
      console.warn(
        'Toast partner token not configured. Partner integration will not work.'
      )
    }

    // Create authenticated client for partner API
    this.partnerApiClient = this.createPartnerClient()
  }

  /**
   * Create an authenticated client for the Toast Partner API (Production)
   */
  private createPartnerClient(): AxiosInstance {
    return axios.create({
      baseURL: 'https://ws-api.toasttab.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.partnerToken}`,
      },
    })
  }

  /**
   * Get the production API client
   */
  private getClient(): AxiosInstance {
    return this.partnerApiClient
  }

  /**
   * Get all restaurants connected to our partner integration
   * Uses the official /connectedRestaurants endpoint from Toast Partner API
   *
   * @param options - Query parameters for filtering and pagination
   * @returns Paginated response with connected restaurants
   */
  async getConnectedRestaurants(options?: {
    pageToken?: string
    pageSize?: number // Default 100, max 200
    lastModified?: string // Filter by last modified date
  }): Promise<PaginatedResponse<PartnerAccessExternalRep>> {
    try {
      const client = this.getClient()

      const params: Record<string, any> = {}

      if (options?.pageSize) {
        // Validate page size limits according to API spec
        const pageSize = Math.min(Math.max(options.pageSize, 1), 200)
        params.pageSize = pageSize
      }

      if (options?.pageToken) {
        params.pageToken = options.pageToken
      }

      if (options?.lastModified) {
        params.lastModified = options.lastModified
      }

      const response = await client.get('partners/v1/connectedRestaurants', {
        params,
      })

      return response.data
    } catch (error: any) {
      console.error(
        'Failed to fetch connected restaurants:',
        error.response?.data || error.message
      )
      throw new Error(`Failed to fetch connected restaurants: ${error.message}`)
    }
  }

  /**
   * Get restaurants for a specific location code
   * Filters connected restaurants by externalRestaurantRef field (our 6-digit location codes)
   *
   * @param locationCode - The 6-digit location code to search for
   * @returns Array of restaurants matching the location code
   */
  async getRestaurantsByLocationCode(
    locationCode: string
  ): Promise<PartnerAccessExternalRep[]> {
    try {
      // The Toast Partner API doesn't support direct filtering by externalRestaurantRef
      // We need to fetch all connected restaurants and filter client-side
      const allRestaurants: PartnerAccessExternalRep[] = []
      let nextPageToken: string | null = null

      do {
        const result = await this.getConnectedRestaurants({
          pageToken: nextPageToken || undefined,
          pageSize: 200, // Use max page size for efficiency
        })

        allRestaurants.push(...result.results)
        nextPageToken = result.nextPageToken
      } while (nextPageToken)

      // Filter by externalRestaurantRef (our 6-digit location code)
      // Also filter out deleted restaurants
      return allRestaurants.filter(
        (restaurant) =>
          restaurant.externalRestaurantRef === locationCode &&
          !restaurant.deleted
      )
    } catch (error: any) {
      console.error('Failed to fetch restaurants by location code:', error)
      throw error
    }
  }

  /**
   * Get restaurant configuration details using the Toast Restaurants API
   * Based on official Toast Restaurants API specification
   *
   * @param restaurantGuid - Restaurant GUID from partner API
   * @returns Restaurant configuration details
   */
  async getRestaurantConfig(restaurantGuid: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.get(
        `restaurants/v1/restaurants/${restaurantGuid}`,
        {
          headers: {
            'Toast-Restaurant-External-ID': restaurantGuid,
          },
        }
      )
      return response.data
    } catch (error: any) {
      console.error(
        'Failed to fetch restaurant config:',
        error.response?.data || error.message
      )
      throw new Error(`Failed to fetch restaurant config: ${error.message}`)
    }
  }

  /**
   * Get menu items for a specific restaurant using Toast Menus API v2
   */
  async getMenuItems(restaurantGuid: string): Promise<any> {
    try {
      const client = this.getClient()
      const headers: Record<string, string> = {}
      headers['Toast-Restaurant-External-ID'] = restaurantGuid
      const response = await client.get(`/menus/v2/menus`, {
        headers,
      })
      return response.data
    } catch (error: any) {
      console.error(
        'Failed to fetch menu items:',
        error.response?.data || error.message
      )
      throw new Error(`Failed to fetch menu items: ${error.message}`)
    }
  }

  /**
   * Get orders for a specific restaurant using Toast Orders API
   */
  async getOrders(
    restaurantGuid: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const client = this.getClient()
      const headers: Record<string, string> = {}
      headers['Toast-Restaurant-External-ID'] = restaurantGuid
      const response = await client.get(`/orders/v2/ordersBulk`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        headers,
      })
      return response.data
    } catch (error: any) {
      console.error(
        'Failed to fetch orders:',
        error.response?.data || error.message
      )
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }
  }

  /**
   * Get all connected restaurants with pagination support
   * Iterates through all pages to collect complete dataset
   *
   * @param includeDeleted - Whether to include deleted restaurants (default: false)
   * @returns Array of all connected restaurants
   */
  async getAllConnectedRestaurants(
    includeDeleted: boolean = false
  ): Promise<PartnerAccessExternalRep[]> {
    try {
      const allRestaurants: PartnerAccessExternalRep[] = []
      let nextPageToken: string | null = null

      do {
        const result = await this.getConnectedRestaurants({
          pageToken: nextPageToken || undefined,
          pageSize: 200, // Use max page size for efficiency
        })

        allRestaurants.push(...result.results)
        nextPageToken = result.nextPageToken
      } while (nextPageToken)

      // Filter out deleted restaurants unless explicitly requested
      return includeDeleted
        ? allRestaurants
        : allRestaurants.filter((restaurant) => !restaurant.deleted)
    } catch (error: any) {
      console.error('Failed to fetch all connected restaurants:', error)
      throw error
    }
  }

  /**
   * Validate that we can access restaurants for a given location code
   * Used during integration setup to verify location code mapping
   *
   * @param locationCode - The 6-digit location code to validate
   * @returns Validation result with restaurant details
   */
  async validateLocationCode(locationCode: string): Promise<{
    valid: boolean
    restaurantCount: number
    restaurants?: PartnerAccessExternalRep[]
    error?: string
  }> {
    try {
      const restaurants = await this.getRestaurantsByLocationCode(locationCode)

      return {
        valid: restaurants.length > 0,
        restaurantCount: restaurants.length,
        restaurants,
      }
    } catch (error: any) {
      console.error('Failed to validate location code:', error)
      return {
        valid: false,
        restaurantCount: 0,
        error: error.message,
      }
    }
  }

  /**
   * Process webhook update from Toast
   * This is called when restaurants are added/removed/updated
   */
  async processWebhookUpdate(webhookData: any): Promise<void> {
    try {
      // Log the webhook for debugging
      console.log(
        'Received Toast webhook update:',
        JSON.stringify(webhookData, null, 2)
      )

      // TODO: Implement webhook processing logic
      // This would typically:
      // 1. Validate the webhook signature
      // 2. Update our database with the restaurant changes
      // 3. Notify the affected tenant
    } catch (error) {
      console.error('Failed to process webhook update:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const toastPartnerService = new ToastPartnerService()
