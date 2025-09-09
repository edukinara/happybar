/**
 * App Configuration Constants
 * Uses environment variables with fallback defaults
 */

// API Configuration
export const API_CONFIG = {
  // Base API URL - uses environment variable or fallback
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.happybar.app',
  
  // API Endpoints
  ENDPOINTS: {
    AUTH: '/auth',
    PRODUCTS: '/products',
    ORDERS: '/orders',
    SUPPLIERS: '/suppliers',
    INVENTORY: '/inventory',
    COUNT: '/count',
  },
  
  // Request timeout (milliseconds)
  TIMEOUT: 10000,
} as const

// App Configuration
export const APP_CONFIG = {
  // Development mode
  DEV_MODE: process.env.EXPO_PUBLIC_DEV_MODE === 'true',
  
  // App info
  NAME: 'Happy Bar',
  VERSION: '1.0.0',
  
  // Feature flags
  FEATURES: {
    BARCODE_SCANNING: true,
    OFFLINE_MODE: false, // Future feature
    ANALYTICS: true,
  },
} as const

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

// Helper function for debugging
export const getEnvInfo = () => {
  if (__DEV__) {
    return {
      apiUrl: API_CONFIG.BASE_URL,
      devMode: APP_CONFIG.DEV_MODE,
      environment: process.env.NODE_ENV,
    }
  }
  return null
}