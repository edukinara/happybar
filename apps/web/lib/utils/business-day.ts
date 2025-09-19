import type { LocationTimeConfig } from '@happy-bar/types'
import type { DateRange } from 'react-day-picker'

/**
 * Converts a calendar date range to business day bounds using location settings
 * This is a simplified version for the frontend that handles basic business day logic
 */
export function convertToBusinessDayRange(
  dateRange: DateRange,
  locationConfig?: LocationTimeConfig
): DateRange | null {
  if (!dateRange.from || !dateRange.to) {
    return null
  }

  // If no location config provided, use standard calendar day boundaries (midnight to midnight)
  if (!locationConfig?.businessCloseTime || !locationConfig?.timezone) {
    return {
      from: new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), 0, 0, 0, 0), // Start of day (midnight)
      to: new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999) // End of day (23:59:59.999)
    }
  }

  try {
    // Parse business close time
    const timeParts = locationConfig.businessCloseTime.split(':')
    if (timeParts.length !== 2 || !timeParts[0] || !timeParts[1]) {
      throw new Error(`Invalid business close time format: ${locationConfig.businessCloseTime}`)
    }

    const closeHour = parseInt(timeParts[0], 10)
    const closeMinute = parseInt(timeParts[1], 10)

    if (isNaN(closeHour) || isNaN(closeMinute) || closeHour < 0 || closeHour > 23 || closeMinute < 0 || closeMinute > 59) {
      throw new Error(`Invalid business close time: ${locationConfig.businessCloseTime}`)
    }

    // Start date should be the beginning of the business day that contains the selected start date
    const startBounds = getBusinessDayStart(dateRange.from, closeHour, closeMinute)
    // End date should be the end of the business day that contains the selected end date
    const endBounds = getBusinessDayEnd(dateRange.to, closeHour, closeMinute)

    return {
      from: startBounds,
      to: endBounds
    }
  } catch (error) {
    console.warn('Failed to convert to business day range:', error)
    // Fallback to calendar day boundaries
    return {
      from: new Date(dateRange.from.getTime()),
      to: new Date(dateRange.to.getTime())
    }
  }
}

/**
 * Gets the business day start for a given date
 * For Sept 18 with 2AM close time: returns Sept 18 at 2:00 AM
 * This is the start of the business day that contains Sept 18
 */
function getBusinessDayStart(date: Date, closeHour: number, closeMinute: number): Date {
  const result = new Date(date)

  if (closeHour === 0 && closeMinute === 0) {
    // Standard calendar day - start at midnight
    result.setHours(0, 0, 0, 0)
  } else {
    // Business day starts at the close time on the same calendar date
    // For Sept 18 with 2AM close time, business day starts Sept 18 at 2:00 AM
    result.setHours(closeHour, closeMinute, 0, 0)
  }

  return result
}

/**
 * Gets the business day end for a given date
 * For Sept 19 with 2AM close time: returns Sept 20 at 1:59:59 AM
 * This is the end of the business day that contains Sept 19
 */
function getBusinessDayEnd(date: Date, closeHour: number, closeMinute: number): Date {
  const result = new Date(date)

  if (closeHour === 0 && closeMinute === 0) {
    // Standard calendar day - end at 23:59:59.999
    result.setHours(23, 59, 59, 999)
  } else {
    // Business day ends at the close time the next day
    // For Sept 19 with 2AM close time, business day ends Sept 20 at 1:59:59 AM
    result.setDate(result.getDate() + 1) // Move to next day
    result.setHours(closeHour, closeMinute, 0, 0) // Set to close time
    result.setTime(result.getTime() - 1) // Subtract 1ms to get 1:59:59.999
  }

  return result
}

/**
 * Creates a LocationTimeConfig from location data
 */
export function createLocationTimeConfig(location: {
  businessCloseTime?: string | null
  timezone?: string | null
}): LocationTimeConfig | null {
  if (!location.businessCloseTime || !location.timezone) {
    return null
  }

  return {
    businessCloseTime: location.businessCloseTime,
    timezone: location.timezone
  }
}