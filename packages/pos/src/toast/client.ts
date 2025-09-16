import {
  ConvertedPOSProduct,
  POSSale,
  SyncResult,
  ToastCredentials,
  ToastOrder,
  ToastRestaurant,
} from '@happy-bar/types'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { MenuGroup, Restaurant } from '../menu'

export interface ToastAPIResponse<T = unknown> {
  data?: T
  success: boolean
  error?: string
}

export interface ToastMenu {
  guid: string
  name: string
  groups: ToastMenuGroup[]
}

export interface ToastMenuGroup {
  guid: string
  name: string
  items: ToastMenuItem[]
}

export interface ToastMenuItem {
  guid: string
  name: string
  description?: string
  price?: number
  plu?: string
  sku?: string
  category?: string
  isActive: boolean
  modifiedDate: string
  menu?: string
  groupGuid?: string
}

export class ToastAPIClient {
  private client: AxiosInstance
  private credentials: ToastCredentials
  private baseURL: string
  private onCredentialsUpdate?: (credentials: ToastCredentials) => Promise<void>

  constructor(
    credentials: ToastCredentials,
    onCredentialsUpdate?: (credentials: ToastCredentials) => Promise<void>
  ) {
    this.credentials = credentials
    this.onCredentialsUpdate = onCredentialsUpdate

    // Toast API endpoints - always use production
    this.baseURL = 'https://ws-api.toasttab.com'

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Toast API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Check if the current access token is expired or about to expire
   * Toast recommends refreshing during the last minute of validity
   */
  private isTokenExpiredOrExpiring(): boolean {
    if (
      !this.credentials.accessToken ||
      !this.credentials.accessTokenExpiresAt
    ) {
      return true // No token or expiration info
    }

    const now = new Date()
    const expirationTime = new Date(this.credentials.accessTokenExpiresAt)

    // Refresh if token expires within the next minute (60 seconds)
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000)

    return expirationTime <= oneMinuteFromNow
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<string> {
    if (this.credentials.integrationMode !== 'standard') {
      throw new Error('Token management is only for Standard API Access mode')
    }

    // Check if we need to refresh the token
    if (this.isTokenExpiredOrExpiring()) {
      console.warn('Toast token expired or expiring soon, refreshing...')
      await this.getAccessToken()
    }

    if (!this.credentials.accessToken) {
      throw new Error('Failed to obtain valid access token')
    }

    return this.credentials.accessToken
  }

  /**
   * Get access token for Standard API Access
   */
  async getAccessToken(): Promise<string> {
    if (this.credentials.integrationMode !== 'standard') {
      throw new Error('Access token is only for Standard API Access mode')
    }

    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      throw new Error(
        'Client ID and Client Secret are required for Standard API Access'
      )
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/authentication/v1/authentication/login`,
        {
          clientId: this.credentials.clientId,
          clientSecret: this.credentials.clientSecret,
          userAccessType: 'TOAST_MACHINE_CLIENT',
        }
      )

      // Handle the response format: { "@class": ".SuccessfulResponse", "token": { "accessToken": "...", "expiresIn": 84500, ... }, "status": "SUCCESS" }
      const tokenData = response.data.token
      if (!tokenData || !tokenData.accessToken) {
        throw new Error('No access token received from Toast authentication')
      }

      // Store token and expiration information
      this.credentials.accessToken = tokenData.accessToken
      this.credentials.accessTokenExpiresIn = tokenData.expiresIn

      // Calculate expiration time: current time + expiresIn seconds
      if (tokenData.expiresIn) {
        this.credentials.accessTokenExpiresAt = new Date(
          Date.now() + tokenData.expiresIn * 1000
        )
      }

      // Save updated credentials to database if callback provided
      if (this.onCredentialsUpdate) {
        try {
          await this.onCredentialsUpdate(this.credentials)
          console.log('Toast credentials updated and saved to database')
        } catch (error) {
          console.error('Failed to save updated Toast credentials:', error)
          // Don't throw here - token refresh succeeded, saving failed
        }
      }

      return tokenData.accessToken
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Toast authentication error:',
        axiosError.response?.data || axiosError.message
      )
      throw new Error(
        `Failed to get Toast access token: ${axiosError.response?.data?.message || axiosError.message}`
      )
    }
  }

  /**
   * Get restaurants/locations for the current credentials
   */
  async getRestaurants(): Promise<ToastRestaurant[]> {
    try {
      if (this.credentials.integrationMode === 'standard') {
        // For Standard API Access, we need the specific restaurant GUID
        if (!this.credentials.partnerLocationId) {
          throw new Error('Restaurant GUID is required for Standard API Access')
        }

        // Ensure we have a valid token
        const token = await this.ensureValidToken()

        const headers: Record<string, string> = {}
        headers['Authorization'] = `Bearer ${token}`
        headers['Toast-Restaurant-External-ID'] =
          this.credentials.partnerLocationId

        // Get the specific restaurant configuration
        const response: AxiosResponse<ToastRestaurant> = await this.client.get(
          `/restaurants/v1/restaurants/${this.credentials.partnerLocationId}`,
          {
            headers,
          }
        )

        return response.data ? [response.data] : []
      } else {
        // Partner integration - this should be handled by the Partner service
        throw new Error(
          'Partner integration should use the Toast Partner Service'
        )
      }
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Failed to fetch restaurants:',
        axiosError.response?.data || axiosError.message
      )
      throw new Error(
        `Failed to fetch restaurants: ${axiosError.response?.data?.message || axiosError.message}`
      )
    }
  }

  /**
   * Get all available menu groups for a restaurant
   */
  async getMenuGroups(restaurantGuid: string): Promise<ToastMenuGroup[]> {
    try {
      // Build headers for the request
      const headers: Record<string, string> = {}

      if (this.credentials.integrationMode === 'standard') {
        const token = await this.ensureValidToken()
        headers['Authorization'] = `Bearer ${token}`
        headers['Toast-Restaurant-External-ID'] = restaurantGuid
      }

      const response: AxiosResponse<Restaurant> = await this.client.get(
        `menus/v2/menus`,
        { headers }
      )

      const groups: ToastMenuGroup[] = []
      const restaurant = response.data

      const getMenuGroupNames = (group: MenuGroup, name: string) => {
        if (group.menuItems) {
          groups.push({
            guid: group.guid,
            name: `${name} > ${group.name}`,
            items:
              group.menuItems.map((i) => ({
                ...i,
                isActive: true,
                modifiedDate: restaurant.lastUpdated,
                price: i.price || undefined,
              })) || [],
          })
        }
        if (group.menuGroups) {
          for (const subGroup of group.menuGroups) {
            getMenuGroupNames(subGroup, group.name)
          }
        }
      }

      if (restaurant?.menus) {
        for (const menu of restaurant.menus) {
          if (menu.menuGroups) {
            for (const group of menu.menuGroups) {
              getMenuGroupNames(group, menu.name)
            }
          }
        }
      }

      return groups
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Failed to fetch menu groups:',
        axiosError.response?.data || axiosError.message
      )
      return []
    }
  }

  /**
   * Get menu items for a specific restaurant using Toast Menus API v2
   * Based on official Toast Menus API specification
   */
  async getMenuItems(
    restaurantGuid: string,
    selectedGroupGuids?: string[]
  ): Promise<ToastMenuItem[]> {
    try {
      // Build headers for the request
      const headers: Record<string, string> = {}

      if (this.credentials.integrationMode === 'standard') {
        // Standard API Access requires both Authorization and restaurant context headers
        const token = await this.ensureValidToken()
        headers['Authorization'] = `Bearer ${token}`
        headers['Toast-Restaurant-External-ID'] = restaurantGuid
      }

      // Use the official Menus API v2 endpoint
      const response: AxiosResponse<Restaurant> = await this.client.get(
        `menus/v2/menus`,
        { headers }
      )

      // Extract menu items from the restaurant response
      const items: ToastMenuItem[] = []
      const restaurant = response.data

      // function to extract items from deeply nested menuGroups
      const getMenuGroupItems = (
        group: MenuGroup,
        name: string,
        selectedGroupGuids?: string[]
      ) => {
        if (group.menuItems) {
          let skip = false
          if (selectedGroupGuids && selectedGroupGuids.length > 0) {
            if (!selectedGroupGuids.includes(group.guid)) {
              skip = true // Skip this group if not selected
            }
          }
          if (!skip) {
            items.push(
              ...group.menuItems.map((item: unknown) => {
                const menuItem = item as {
                  guid: string
                  name: string
                  description?: string
                  price?: number
                  deleted?: boolean
                  modifiedDate?: string
                }
                return {
                  guid: menuItem.guid,
                  name: menuItem.name,
                  description: menuItem.description,
                  price: menuItem.price || 0,
                  isActive: !menuItem.deleted,
                  modifiedDate: menuItem.modifiedDate || restaurant.lastUpdated,
                  category: `${name}>${group.name}`,
                  menu: name,
                  groupGuid: group.guid,
                }
              })
            )
          }
        }
        if (group.menuGroups) {
          for (const subGroup of group.menuGroups) {
            getMenuGroupItems(subGroup, group.name, selectedGroupGuids)
          }
        }
      }

      if (restaurant?.menus) {
        for (const menu of restaurant.menus) {
          if (menu.menuGroups) {
            for (const group of menu.menuGroups) {
              getMenuGroupItems(group, menu.name, selectedGroupGuids)
            }
          }
        }
      }

      return items
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Failed to fetch menu items:',
        axiosError.response?.data || axiosError.message
      )
      // Return empty array instead of throwing to allow partial sync
      return []
    }
  }

  /**
   * Get sales/orders for a specific restaurant using business date
   * More efficient and accurate than date ranges for restaurant operations
   */
  async getOrdersByBusinessDate(
    restaurantGuid: string,
    businessDate: string // Format: yyyymmdd
  ): Promise<ToastOrder[]> {
    try {
      // Build headers for the request
      const headers: Record<string, string> = {}

      if (this.credentials.integrationMode === 'standard') {
        // Standard API Access requires both Authorization and restaurant context headers
        const token = await this.ensureValidToken()
        headers['Authorization'] = `Bearer ${token}`
        headers['Toast-Restaurant-External-ID'] = restaurantGuid
      }

      // Use the official Orders API bulk endpoint with business date
      const response: AxiosResponse<ToastOrder[]> = await this.client.get(
        `/orders/v2/ordersBulk`,
        {
          params: {
            businessDate: businessDate,
          },
          headers,
        }
      )

      return response.data || []
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Failed to fetch orders by business date:',
        axiosError.response?.data || axiosError.message
      )
      // Return empty array instead of throwing to allow partial sync
      return []
    }
  }

  /**
   * Get sales/orders for a specific restaurant and date range using Toast Orders API
   * Based on official Toast Orders API specification
   * Automatically handles pagination to fetch all orders
   */
  async getOrders(
    restaurantGuid: string,
    startDate: Date,
    endDate: Date
  ): Promise<ToastOrder[]> {
    try {
      // Build headers for the request
      const headers: Record<string, string> = {}

      if (this.credentials.integrationMode === 'standard') {
        // Standard API Access requires both Authorization and restaurant context headers
        const token = await this.ensureValidToken()
        headers['Authorization'] = `Bearer ${token}`
        headers['Toast-Restaurant-External-ID'] = restaurantGuid
      }

      const allOrders: ToastOrder[] = []
      let page = 1
      const pageSize = 100 // Max allowed page size

      while (true) {
        try {
          // Use the official Orders API bulk endpoint with pagination
          const response: AxiosResponse<ToastOrder[]> = await this.client.get(
            `/orders/v2/ordersBulk`,
            {
              params: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                page,
                pageSize,
              },
              headers,
            }
          )

          const orders = response.data || []

          // If no orders returned or empty array, we've reached the end
          if (!orders.length) {
            break
          }

          allOrders.push(...orders)

          // If we got fewer orders than the page size, we've reached the end
          if (orders.length < pageSize) {
            break
          }

          page++
        } catch (error: unknown) {
          const axiosError = error as {
            response?: { data?: { message?: string }; status?: number }
            message?: string
          }

          // If it's a 404 or similar, we've likely reached the end of pagination
          if (axiosError.response?.status === 404) {
            break
          }

          console.error(
            `Failed to fetch orders page ${page}:`,
            axiosError.response?.data || axiosError.message
          )

          // Don't fail the entire request for a single page error
          break
        }
      }

      return allOrders
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      console.error(
        'Failed to fetch orders:',
        axiosError.response?.data || axiosError.message
      )
      // Return empty array instead of throwing to allow partial sync
      return []
    }
  }

  /**
   * Calculate business date string in yyyymmdd format based on restaurant timezone and closeout hour
   */
  private calculateBusinessDate(
    date: Date,
    timeZone: string,
    closeoutHour: number = 3
  ): string {
    // Convert date to restaurant timezone
    const restaurantDate = new Date(date.toLocaleString('en-US', { timeZone }))

    // If current hour is before closeout hour, this is still previous business day
    if (restaurantDate.getHours() < closeoutHour) {
      restaurantDate.setDate(restaurantDate.getDate() - 1)
    }

    // Format as yyyymmdd
    const year = restaurantDate.getFullYear()
    const month = (restaurantDate.getMonth() + 1).toString().padStart(2, '0')
    const day = restaurantDate.getDate().toString().padStart(2, '0')

    return `${year}${month}${day}`
  }

  /**
   * Get orders for a date range using business dates
   * More efficient than timestamp-based queries
   */
  async getOrdersByBusinessDateRange(
    restaurantGuid: string,
    startBusinessDate: string, // yyyymmdd
    endBusinessDate: string // yyyymmdd
  ): Promise<ToastOrder[]> {
    const allOrders: ToastOrder[] = []

    // Generate list of business dates to fetch
    const startDate = new Date(
      parseInt(startBusinessDate.substring(0, 4)), // year
      parseInt(startBusinessDate.substring(4, 6)) - 1, // month (0-indexed)
      parseInt(startBusinessDate.substring(6, 8)) // day
    )

    const endDate = new Date(
      parseInt(endBusinessDate.substring(0, 4)), // year
      parseInt(endBusinessDate.substring(4, 6)) - 1, // month (0-indexed)
      parseInt(endBusinessDate.substring(6, 8)) // day
    )

    // Fetch orders for each business date
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const businessDate = this.calculateBusinessDate(
        currentDate,
        'America/Chicago'
      ) // Default timezone, should be passed from restaurant
      const orders = await this.getOrdersByBusinessDate(
        restaurantGuid,
        businessDate
      )
      allOrders.push(...orders)

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return allOrders
  }

  /**
   * Convert Toast menu items to POSProduct format
   */
  convertToPOSProducts(
    toastItems: ToastMenuItem[] | undefined | null
  ): ConvertedPOSProduct[] {
    if (!toastItems || !Array.isArray(toastItems)) {
      console.warn('No toast items to convert or invalid format')
      return []
    }

    return toastItems.map(
      (item): ConvertedPOSProduct => ({
        externalId: item.guid,
        name: item.name,
        sku: item.sku || item.plu || null,
        category: item.category || 'Uncategorized',
        price: item.price || 0,
        isActive: item.isActive,

        // modifiedAt: new Date(item.modifiedDate),
      })
    )
  }

  /**
   * Convert Toast orders to POSSale format
   */
  convertToPOSSales(toastOrders: ToastOrder[] | undefined | null): POSSale[] {
    if (!toastOrders || !Array.isArray(toastOrders)) {
      console.warn('No toast orders to convert or invalid format')
      return []
    }

    // Only include completed orders and orders with items
    return toastOrders
      .filter(
        (order) =>
          order.paidDate &&
          !order.voided &&
          order.checks?.length &&
          order.checks.some(
            (check) =>
              !check.voided &&
              check.selections?.some((sel) => !!sel.item && !sel.voided)
          )
      )
      .map(
        (order): POSSale => ({
          externalId: order.guid,
          timestamp: new Date(order.openedDate!),
          totalAmount: order.checks.reduce(
            (acc, check) => acc + check.amount,
            0
          ),
          items:
            order.checks.flatMap((check) =>
              check.selections
                .filter((s) => !s.voided)
                .map((selection) => ({
                  productId: selection.item.guid,
                  quantity: selection.quantity,
                  unitPrice: selection.receiptLinePrice,
                  totalPrice: selection.price,
                  orderNumber: check.displayNumber,
                  name: selection.displayName,
                }))
            ) || [],
        })
      )
  }

  /**
   * Test the connection with current credentials
   */
  async testConnection(): Promise<ToastAPIResponse<{ restaurants: number }>> {
    try {
      // Ensure valid token if using Standard API
      if (this.credentials.integrationMode === 'standard') {
        await this.ensureValidToken()
      }

      // Test by fetching restaurants
      const restaurants = await this.getRestaurants()

      return {
        success: true,
        data: {
          restaurants: restaurants.length,
        },
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Sync all data from Toast (products and sales)
   */
  async syncData(
    locationIds: string[],
    options?: {
      salesDateRange?: { start: Date; end: Date }
      selectedGroupGuids?: string[]
    }
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      productsSync: { created: 0, updated: 0, errors: 0, products: [] },
      salesSync: { imported: 0, errors: 0, sales: [] },
      errors: [], // Always initialize errors array
    }

    try {
      // Sync products from all restaurants
      const allProducts: ConvertedPOSProduct[] = []

      for (const restaurantGuid of locationIds) {
        try {
          const menuItems = await this.getMenuItems(
            restaurantGuid,
            options?.selectedGroupGuids
          )

          if (menuItems && menuItems.length > 0) {
            const products = this.convertToPOSProducts(menuItems)
            allProducts.push(...products)
          } else {
            console.warn(`No menu items found for restaurant ${restaurantGuid}`)
          }
        } catch (error) {
          result.productsSync.errors++
          result.errors.push(
            `Failed to sync products from ${restaurantGuid}: ${error}`
          )
        }
      }

      result.productsSync.created = allProducts.length
      result.productsSync.products = allProducts

      // Sync sales if date range provided
      if (options?.salesDateRange) {
        const allSales: POSSale[] = []

        for (const restaurantGuid of locationIds) {
          try {
            const orders = await this.getOrders(
              restaurantGuid,
              options.salesDateRange.start,
              options.salesDateRange.end
            )
            if (orders && orders.length > 0) {
              const sales = this.convertToPOSSales(orders)
              allSales.push(...sales)
            } else {
              console.warn(
                `No orders found for restaurant ${restaurantGuid} in the specified date range`
              )
            }
          } catch (error) {
            if (result.salesSync) result.salesSync.errors++
            result.errors.push(
              `Failed to sync sales from ${restaurantGuid}: ${error}`
            )
          }
        }

        if (result.salesSync) {
          result.salesSync.imported = allSales.length
          result.salesSync.sales = allSales
        }
      }

      result.success = result.errors.length === 0
      return result
    } catch (error) {
      result.success = false
      result.errors.push(`Sync failed: ${error}`)
      return result
    }
  }
}
