const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface LinkedAccount {
  id: string
  provider: string
  providerId: string
  createdAt: string
}

export interface LinkStatus {
  isLinked: boolean
  account: LinkedAccount | null
}

export const accountLinkingApi = {
  // Get all linked accounts for current user
  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    const response = await fetch(`${API_URL}/api/linked-accounts`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch linked accounts')
    }

    return response.json()
  },

  // Unlink a specific account
  async unlinkAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/linked-accounts/${accountId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to unlink account')
    }

    return response.json()
  },

  // Check if a specific provider is linked
  async getLinkStatus(provider: string): Promise<LinkStatus> {
    const response = await fetch(`${API_URL}/api/link-status/${provider}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check ${provider} link status`)
    }

    return response.json()
  },
}