import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async testConnectivity(): Promise<boolean> {
    try {
      console.log('🌐 Testing connectivity to:', this.baseURL)
      const response = await fetch(`${this.baseURL}/api/auth/get-session`, {
        method: 'GET',
        credentials: 'omit',
      })
      console.log('🌐 Connectivity test result:', {
        status: response.status,
        ok: response.ok,
        reachable: true,
      })
      return true
    } catch (error) {
      console.error('🌐 Connectivity test failed:', error)
      return false
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await authClient.getSession()

    console.log('🔐 Auth Session Check:', {
      hasSession: !!session.data?.session,
      hasToken: !!session.data?.session?.token,
      hasUser: !!session.data?.user,
      sessionData: session.data
        ? {
            session: session.data.session
              ? {
                  id: session.data.session.id,
                  userId: session.data.session.userId,
                  tokenLength: session.data.session.token
                    ? session.data.session.token.length
                    : 0,
                  tokenPrefix: session.data.session.token
                    ? session.data.session.token.substring(0, 10) + '...'
                    : 'none',
                }
              : null,
            user: session.data.user
              ? { id: session.data.user.id, email: session.data.user.email }
              : null,
          }
        : null,
    })

    if (session.data?.session?.token) {
      console.log('✅ Using authenticated request')
      // Try multiple header approaches for Better Auth with Expo
      return {
        authorization: `Bearer ${session.data.session.token}`, // lowercase
        Authorization: `Bearer ${session.data.session.token}`, // capitalized
        'x-better-auth-token': session.data.session.token, // direct token
        'Content-Type': 'application/json',
      }
    }

    console.log('❌ No valid session token, making unauthenticated request')
    return {
      'Content-Type': 'application/json',
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseURL}${endpoint}`

    console.log('🔄 API Request:', {
      method: 'GET',
      url,
      headers: {
        ...headers,
        Authorization: headers.Authorization ? '[REDACTED]' : undefined,
      },
    })

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'omit',
      })

      const responseText = await response.text()
      console.log('📥 API Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        data:
          responseText.substring(0, 500) +
          (responseText.length > 500 ? '...' : ''),
      })

      if (!response.ok) {
        console.error('❌ API Error:', {
          url,
          status: response.status,
          response: responseText,
        })
        throw new Error(
          `HTTP error! status: ${response.status} - ${responseText}`
        )
      }

      try {
        return JSON.parse(responseText)
      } catch (e) {
        console.error('❌ JSON Parse Error:', { url, responseText })
        throw new Error(`Failed to parse JSON response: ${e}`)
      }
    } catch (error) {
      console.error('❌ API Error:', { url, error })
      throw error
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const apiClient = new ApiClient(API_URL)
