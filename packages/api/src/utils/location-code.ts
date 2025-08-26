/**
 * Utility functions for generating and managing Toast location codes
 */

/**
 * Generate a 6-digit unique location code
 * Format: XXXXXX (6 digits)
 */
export function generateLocationCode(): string {
  // Generate a random 6-digit number (100000 to 999999)
  const code = Math.floor(100000 + Math.random() * 900000)
  return code.toString()
}

/**
 * Validate that a location code is in the correct format
 */
export function validateLocationCode(code: string): boolean {
  // Must be exactly 6 digits
  const regex = /^\d{6}$/
  return regex.test(code)
}

/**
 * Format a location code for display (with spacing for readability)
 */
export function formatLocationCode(code: string): string {
  if (!validateLocationCode(code)) {
    return code
  }
  // Format as XXX-XXX for better readability
  return `${code.slice(0, 3)}-${code.slice(3)}`
}

/**
 * Check if a location code is already in use
 * This would typically check against the database
 */
export async function isLocationCodeInUse(
  code: string,
  prisma: any
): Promise<boolean> {
  try {
    const existing = await prisma.pOSIntegration.findFirst({
      where: {
        credentials: {
          path: ['partnerLocationId'],
          equals: code,
        },
      },
    })
    return !!existing
  } catch (error) {
    console.error('Error checking location code:', error)
    return false
  }
}

/**
 * Generate a unique location code that isn't already in use
 */
export async function generateUniqueLocationCode(prisma: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const code = generateLocationCode()
    const inUse = await isLocationCodeInUse(code, prisma)

    if (!inUse) {
      return code
    }

    attempts++
  }

  throw new Error(
    'Unable to generate unique location code after multiple attempts'
  )
}
