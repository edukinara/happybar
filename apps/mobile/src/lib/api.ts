import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await authClient.getSession()

    if (session.data?.session?.token) {
    }
    return {
      'Content-Type': 'application/json',
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'omit',
      })

      const responseText = await response.text()

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
