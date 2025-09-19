/**
 * Business Day Utilities
 *
 * Efficient calculations for business day boundaries based on location settings.
 * Optimized for frequent use throughout the application.
 */

import { DateTime } from 'luxon'
import type { LocationTimeConfig, BusinessDayBounds } from '@happy-bar/types'

// Cache for business day calculations to avoid repeated computations
const businessDayCache = new Map<string, CacheEntry>()

// Cache TTL in milliseconds (4 hours - sufficient for most use cases)
const CACHE_TTL = 4 * 60 * 60 * 1000

interface CacheEntry {
  bounds: BusinessDayBounds
  timestamp: number
}

/**
 * Clears expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of businessDayCache.entries()) {
    if (now - (entry as CacheEntry).timestamp > CACHE_TTL) {
      businessDayCache.delete(key)
    }
  }
}

/**
 * Generates a cache key for business day calculations
 */
function getCacheKey(config: LocationTimeConfig, date: Date): string {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `${config.timezone}:${config.businessCloseTime}:${dateStr}`
}

/**
 * Calculates business day boundaries for a given date and location config
 * Returns the start and end times in UTC for the business day that contains the given date
 */
export function getBusinessDayBounds(
  date: Date,
  config: LocationTimeConfig
): BusinessDayBounds {
  // Clean up expired cache entries periodically
  if (businessDayCache.size > 100) {
    clearExpiredCache()
  }

  const cacheKey = getCacheKey(config, date)
  const cached = businessDayCache.get(cacheKey)

  if (cached && Date.now() - (cached as CacheEntry).timestamp < CACHE_TTL) {
    return (cached as CacheEntry).bounds
  }

  // Parse the business close time
  const timeParts = config.businessCloseTime.split(':')
  if (timeParts.length !== 2 || !timeParts[0] || !timeParts[1]) {
    throw new Error(`Invalid business close time format: ${config.businessCloseTime}`)
  }

  const closeHour = parseInt(timeParts[0], 10)
  const closeMinute = parseInt(timeParts[1], 10)

  if (isNaN(closeHour) || isNaN(closeMinute) || closeHour < 0 || closeHour > 23 || closeMinute < 0 || closeMinute > 59) {
    throw new Error(`Invalid business close time: ${config.businessCloseTime}`)
  }

  // Convert input date to location timezone
  const inputDateTime = DateTime.fromJSDate(date).setZone(config.timezone)

  // Calculate business day boundaries
  let businessDayStart: DateTime
  let businessDayEnd: DateTime

  if (closeHour === 0 && closeMinute === 0) {
    // Special case: midnight close time = standard calendar day
    businessDayStart = inputDateTime.startOf('day')
    businessDayEnd = inputDateTime.endOf('day')
  } else {
    // Business day spans across calendar days
    const closeTimeToday = inputDateTime.set({
      hour: closeHour,
      minute: closeMinute,
      second: 0,
      millisecond: 0
    })

    if (inputDateTime < closeTimeToday) {
      // Current time is before today's close time, so business day started yesterday
      businessDayStart = closeTimeToday.minus({ days: 1 })
      businessDayEnd = closeTimeToday.minus({ seconds: 1 })
    } else {
      // Current time is after today's close time, so business day started today
      businessDayStart = closeTimeToday
      businessDayEnd = closeTimeToday.plus({ days: 1 }).minus({ seconds: 1 })
    }
  }

  const bounds: BusinessDayBounds = {
    start: businessDayStart.toUTC().toJSDate(),
    end: businessDayEnd.toUTC().toJSDate()
  }

  // Cache the result
  businessDayCache.set(cacheKey, {
    bounds,
    timestamp: Date.now()
  } as CacheEntry)

  return bounds
}

/**
 * Gets business day bounds for today
 */
export function getTodayBusinessDayBounds(config: LocationTimeConfig): BusinessDayBounds {
  return getBusinessDayBounds(new Date(), config)
}

/**
 * Gets business day bounds for yesterday
 */
export function getYesterdayBusinessDayBounds(config: LocationTimeConfig): BusinessDayBounds {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return getBusinessDayBounds(yesterday, config)
}

/**
 * Gets business day bounds for a range of days
 * Returns an array of bounds for each business day in the range
 */
export function getBusinessDayBoundsRange(
  startDate: Date,
  endDate: Date,
  config: LocationTimeConfig
): BusinessDayBounds[] {
  const bounds: BusinessDayBounds[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    bounds.push(getBusinessDayBounds(current, config))
    current.setDate(current.getDate() + 1)
  }

  return bounds
}

/**
 * Converts a date range filter to business day UTC bounds
 * This is the main function used throughout the app for date filtering
 */
export function convertDateRangeToBusinessDayBounds(
  startDate: Date,
  endDate: Date,
  config: LocationTimeConfig
): { start: Date; end: Date } {
  const startBounds = getBusinessDayBounds(startDate, config)
  const endBounds = getBusinessDayBounds(endDate, config)

  return {
    start: startBounds.start,
    end: endBounds.end
  }
}

/**
 * Determines which business day a given timestamp belongs to
 */
export function getBusinessDayForTimestamp(
  timestamp: Date,
  config: LocationTimeConfig
): Date {
  const bounds = getBusinessDayBounds(timestamp, config)

  // Return the start date of the business day (in location timezone)
  const startInLocalTz = DateTime.fromJSDate(bounds.start)
    .setZone(config.timezone)
    .startOf('day')

  return startInLocalTz.toJSDate()
}

/**
 * Checks if a timestamp falls within a specific business day
 */
export function isTimestampInBusinessDay(
  timestamp: Date,
  businessDay: Date,
  config: LocationTimeConfig
): boolean {
  const bounds = getBusinessDayBounds(businessDay, config)
  return timestamp >= bounds.start && timestamp <= bounds.end
}

/**
 * Clears the entire business day cache (useful for testing or config changes)
 */
export function clearBusinessDayCache(): void {
  businessDayCache.clear()
}

/**
 * Gets cache statistics (useful for monitoring)
 */
export function getBusinessDayCacheStats(): { size: number; entries: string[] } {
  return {
    size: businessDayCache.size,
    entries: Array.from(businessDayCache.keys())
  }
}