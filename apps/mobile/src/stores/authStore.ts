import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { authClient } from '../lib/auth'

interface User {
  id: string
  email: string
  name?: string
  organizationId: string
  organizationName?: string
  role:
    | 'owner'
    | 'admin'
    | 'manager'
    | 'inventory_manager'
    | 'buyer'
    | 'supervisor'
    | 'staff'
    | 'viewer'
}

interface AuthState {
  user: User | null
  session: any
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: any) => void
}

const USER_DATA_KEY = '@happy_bar_user'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      // Check if there's an active session with Better-auth
      const sessionData = await authClient.getSession()

      if (sessionData.data?.session && sessionData.data?.user) {
        // Try to get stored user data, or fetch fresh data from session
        const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY)
        let userData: User | null = null

        if (storedUserData) {
          userData = JSON.parse(storedUserData)
        } else {
          // Create user data from session if not stored
          userData = {
            id: sessionData.data.user.id,
            email: sessionData.data.user.email,
            name:
              sessionData.data.user.name ||
              sessionData.data.user.email.split('@')[0],
            organizationId:
              (sessionData.data.session as any).activeOrganizationId || '',
            organizationName: '', // Will need to fetch from API if needed
            role: 'staff', // Default role, actual role will come from member data
          }

          // Store user data for offline access
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
        }

        set({
          session: sessionData.data,
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      set({ isLoading: false })
    }
  },

  login: async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Login failed')
      }

      if (result.data?.user) {
        const userData: User = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name || result.data.user.email.split('@')[0],
          organizationId: '', // Will be populated from session or API
          organizationName: '', // Will need to fetch from API if needed
          role: 'staff', // Default role, actual role will come from member data
        }

        // Store user data for offline access
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))

        set({
          session: result.data,
          user: userData,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  logout: async () => {
    try {
      await authClient.signOut()
      await AsyncStorage.removeItem(USER_DATA_KEY)

      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if API logout fails, clear local state
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
    }
  },

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, isAuthenticated: !!session }),
}))
