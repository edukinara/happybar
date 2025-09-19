/**
 * Business Day Types
 *
 * Shared types for business day functionality across the application
 */

export interface LocationTimeConfig {
  businessCloseTime: string // HH:mm format (e.g., "02:00" for 2 AM)
  timezone: string // IANA timezone identifier (e.g., "America/New_York")
}

export interface BusinessDayBounds {
  start: Date // Start of business day in UTC
  end: Date   // End of business day in UTC
}

export interface BusinessDayRange {
  start: Date // Start date (inclusive)
  end: Date   // End date (inclusive)
}

/**
 * Default business close times for common scenarios
 */
export const DEFAULT_BUSINESS_CLOSE_TIMES = {
  MIDNIGHT: '00:00',      // Standard calendar day
  TWO_AM: '02:00',        // Common for bars/restaurants
  THREE_AM: '03:00',      // Late night establishments
  FOUR_AM: '04:00',       // Very late establishments
  SIX_AM: '06:00',        // Early morning establishments
} as const

/**
 * Common timezone identifiers
 */
export const COMMON_TIMEZONES = [
  'America/New_York',     // Eastern Time
  'America/Chicago',      // Central Time
  'America/Denver',       // Mountain Time
  'America/Los_Angeles',  // Pacific Time
  'America/Phoenix',      // Arizona (no DST)
  'America/Anchorage',    // Alaska Time
  'Pacific/Honolulu',     // Hawaii Time
  'Europe/London',        // GMT/BST
  'Europe/Paris',         // Central European Time
  'Asia/Tokyo',           // Japan Standard Time
  'Australia/Sydney',     // Australian Eastern Time
] as const

export type CommonTimezone = typeof COMMON_TIMEZONES[number]
export type DefaultBusinessCloseTime = typeof DEFAULT_BUSINESS_CLOSE_TIMES[keyof typeof DEFAULT_BUSINESS_CLOSE_TIMES]