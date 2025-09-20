import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { isPermissionError, isAuthenticationError, showErrorToast } from '@/lib/error-handling'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL:
        typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          : 'http://localhost:3001',
      timeout: 15000, // Increased from 10s for better reliability
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor - Better Auth handles authentication via cookies
    this.client.interceptors.request.use(
      (config) => {
        // Better Auth uses cookies for authentication, so no need to manually add tokens
        // Ensure credentials are included for cookie-based auth
        config.withCredentials = true
        
        // Add organization context if available
        if (typeof window !== 'undefined') {
          const activeOrgId = localStorage.getItem('activeOrganizationId')
          if (activeOrgId) {
            config.headers['X-Organization-Id'] = activeOrgId
          }
        }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Enhanced error logging
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })

        const originalRequest = error.config

        // Handle authentication errors (401)
        if (isAuthenticationError(error) && !originalRequest._retry) {
          originalRequest._retry = true

          console.error('401 Unauthorized - redirecting to login')

          // Show user-friendly error message
          showErrorToast(error)

          // Redirect to login (Better Auth session will be cleared automatically)
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              window.location.href = '/login'
            }, 1500) // Give time for toast to show
          }

          return Promise.reject(error)
        }

        // Handle permission errors (403) with enhanced messaging
        if (isPermissionError(error)) {
          console.warn('Permission denied:', {
            userRole: error.response?.data?.context?.userRole,
            requiredPermission: error.response?.data?.context?.requiredPermission,
            url: error.config?.url,
          })

          // Don't show toast here - let the component handle it
          // This allows for more contextual error handling
        }

        // Handle other client/server errors
        if (error.response?.status >= 400) {
          console.error(`${error.response.status} Error:`, error.response.data)
        }

        return Promise.reject(error)
      }
    )
  }

  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // Upload files
  async upload<T = unknown>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig & {
      onUploadProgress?: (progressEvent: unknown) => void
    }
  ): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    })
    return response.data
  }
}

export const apiClient = new ApiClient()
export default apiClient
