import dotenv from 'dotenv'

// Load environment variables at the very start
dotenv.config({ quiet: true })

// Export environment variables for easy access
export const env = {
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  AUTUMN_SECRET_KEY: process.env.AUTUMN_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  APP_BASE_URL:
    process.env.APP_BASE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://happybar.app'
      : 'http://localhost:3000'),
  API_BASE_URL:
    process.env.API_BASE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.happybar.app'
      : 'http://localhost:3001'),
}

// Validate critical environment variables
if (!env.AUTUMN_SECRET_KEY) {
  console.error(
    'AUTUMN_SECRET_KEY environment variable is required but not set'
  )
  process.exit(1)
}
