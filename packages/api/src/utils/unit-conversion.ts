/**
 * Unit conversion utilities for inventory management
 * Handles conversions between different measurement units commonly used in bar/restaurant inventory
 */

// Base units for volume (all converted to ml)
export const VOLUME_TO_ML: Record<string, number> = {
  'ml': 1,
  'cl': 10,
  'dl': 100,
  'l': 1000,      // Lowercase for consistency with toLowerCase()
  'L': 1000,      // Keep uppercase for compatibility
  'fl oz': 29.5735, // US fluid ounce
  'oz': 29.5735,   // Assume fluid ounce for beverages
  'cup': 236.588,
  'pint': 473.176, // US pint
  'quart': 946.353, // US quart
  'gal': 3785.41,  // US gallon
}

// Base units for weight (all converted to grams)
export const WEIGHT_TO_GRAMS: Record<string, number> = {
  'g': 1,
  'kg': 1000,
  'oz': 28.3495,   // Weight ounce
  'lb': 453.592,
  'lbs': 453.592,
}

// Container/unit types that represent full inventory depletion
export const FULL_DEPLETION_UNITS = new Set([
  'container',
  'unit',
  'bottle',
  'can',
  'keg',
  'box',
  'bag',
  'carton',
  'count',
])

export interface UnitConversionResult {
  convertedAmount: number
  conversionFactor: number
  isFullDepletion: boolean
  fromUnit: string
  toUnit: string
  originalAmount: number
}

export class UnitConverter {
  /**
   * Convert between units, handling volume, weight, and special cases
   */
  static convert(
    amount: number,
    fromUnit: string,
    toUnit: string,
    productUnitSize?: number
  ): UnitConversionResult {
    const cleanFromUnit = fromUnit.toLowerCase().trim()
    const cleanToUnit = toUnit.toLowerCase().trim()

    // If units are the same, no conversion needed
    if (cleanFromUnit === cleanToUnit) {
      return {
        convertedAmount: amount,
        conversionFactor: 1,
        isFullDepletion: FULL_DEPLETION_UNITS.has(cleanFromUnit),
        fromUnit,
        toUnit,
        originalAmount: amount,
      }
    }

    // Check if either unit indicates full depletion
    const isFullDepletion = FULL_DEPLETION_UNITS.has(cleanFromUnit) || FULL_DEPLETION_UNITS.has(cleanToUnit)
    
    if (isFullDepletion) {
      // For full depletion, use the product's unit size if available
      const depletionAmount = productUnitSize || amount
      return {
        convertedAmount: depletionAmount,
        conversionFactor: productUnitSize ? productUnitSize / amount : 1,
        isFullDepletion: true,
        fromUnit,
        toUnit,
        originalAmount: amount,
      }
    }

    // Try volume conversion
    if (VOLUME_TO_ML[cleanFromUnit] && VOLUME_TO_ML[cleanToUnit]) {
      const amountInMl = amount * VOLUME_TO_ML[cleanFromUnit]
      const convertedAmount = amountInMl / VOLUME_TO_ML[cleanToUnit]
      const conversionFactor = VOLUME_TO_ML[cleanFromUnit] / VOLUME_TO_ML[cleanToUnit]
      
      return {
        convertedAmount,
        conversionFactor,
        isFullDepletion: false,
        fromUnit,
        toUnit,
        originalAmount: amount,
      }
    }

    // Try weight conversion
    if (WEIGHT_TO_GRAMS[cleanFromUnit] && WEIGHT_TO_GRAMS[cleanToUnit]) {
      const amountInGrams = amount * WEIGHT_TO_GRAMS[cleanFromUnit]
      const convertedAmount = amountInGrams / WEIGHT_TO_GRAMS[cleanToUnit]
      const conversionFactor = WEIGHT_TO_GRAMS[cleanFromUnit] / WEIGHT_TO_GRAMS[cleanToUnit]
      
      return {
        convertedAmount,
        conversionFactor,
        isFullDepletion: false,
        fromUnit,
        toUnit,
        originalAmount: amount,
      }
    }

    // If no conversion possible, return original amount with warning
    console.warn(`Cannot convert from ${fromUnit} to ${toUnit}, using original amount`)
    return {
      convertedAmount: amount,
      conversionFactor: 1,
      isFullDepletion: false,
      fromUnit,
      toUnit,
      originalAmount: amount,
    }
  }

  /**
   * Calculate serving depletion amount based on POS serving vs inventory unit
   */
  static calculateServingDepletion(
    posServingSize: number,
    posServingUnit: string,
    inventoryUnit: string,
    inventoryUnitSize: number,
    quantity: number = 1
  ): UnitConversionResult {
    // Convert POS serving to inventory unit
    const conversion = this.convert(
      posServingSize,
      posServingUnit,
      inventoryUnit,
      inventoryUnitSize
    )

    // Multiply by quantity of servings sold
    const totalDepletion = conversion.convertedAmount * quantity

    return {
      ...conversion,
      convertedAmount: totalDepletion,
      originalAmount: posServingSize * quantity,
    }
  }

  /**
   * Check if a unit represents a full container/item
   */
  static isFullDepletionUnit(unit: string): boolean {
    return FULL_DEPLETION_UNITS.has(unit.toLowerCase().trim())
  }

  /**
   * Get supported volume units
   */
  static getSupportedVolumeUnits(): string[] {
    return Object.keys(VOLUME_TO_ML)
  }

  /**
   * Get supported weight units
   */
  static getSupportedWeightUnits(): string[] {
    return Object.keys(WEIGHT_TO_GRAMS)
  }

  /**
   * Get all supported units
   */
  static getSupportedUnits(): string[] {
    return [
      ...this.getSupportedVolumeUnits(),
      ...this.getSupportedWeightUnits(),
      ...Array.from(FULL_DEPLETION_UNITS),
    ]
  }
}

// Export unit arrays for frontend use
export const VOLUME_UNITS = Object.keys(VOLUME_TO_ML)
export const WEIGHT_UNITS = Object.keys(WEIGHT_TO_GRAMS)
export const CONTAINER_UNITS = Array.from(FULL_DEPLETION_UNITS)
export const ALL_UNITS = [...VOLUME_UNITS, ...WEIGHT_UNITS, ...CONTAINER_UNITS]

// Unit categories for UI grouping
export const UNIT_CATEGORIES = {
  Volume: VOLUME_UNITS,
  Weight: WEIGHT_UNITS,
  Container: CONTAINER_UNITS
} as const