import type { PrismaClient } from '@happy-bar/database'

export interface InventoryDepletionPolicyConfig {
  allowOverDepletion: boolean
  warningThresholds: {
    low: number
    critical: number
  }
}

export interface InventorySettingsConfig {
  webhookPolicy: InventoryDepletionPolicyConfig
  cronSyncPolicy: InventoryDepletionPolicyConfig
  manualPolicy: InventoryDepletionPolicyConfig
  enableAutoConversion: boolean
  conversionFallback: 'error' | 'warn' | 'ignore'
  enableOverDepletionLogging: boolean
  enableUnitConversionLogging: boolean
  auditLogRetentionDays: number
}

export class InventorySettingsService {
  private prisma: PrismaClient
  private cache = new Map<
    string,
    { settings: InventorySettingsConfig; cachedAt: number }
  >()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): InventorySettingsConfig {
    return {
      webhookPolicy: {
        allowOverDepletion: true,
        warningThresholds: { low: 20, critical: 10 },
      },
      cronSyncPolicy: {
        allowOverDepletion: false,
        warningThresholds: { low: 20, critical: 10 },
      },
      manualPolicy: {
        allowOverDepletion: false,
        warningThresholds: { low: 20, critical: 10 },
      },
      enableAutoConversion: true,
      conversionFallback: 'warn',
      enableOverDepletionLogging: true,
      enableUnitConversionLogging: false,
      auditLogRetentionDays: 90,
    }
  }

  /**
   * Get settings for an organization (with caching)
   */
  async getSettings(organizationId: string): Promise<InventorySettingsConfig> {
    // Check cache first
    const cached = this.cache.get(organizationId)
    if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
      return cached.settings
    }

    // Load from database
    const settings = await this.prisma.inventorySettings.findUnique({
      where: { organizationId },
    })

    let config: InventorySettingsConfig

    if (!settings) {
      // Use defaults if no settings exist
      config = this.getDefaultSettings()
    } else {
      // Parse JSON fields
      config = {
        webhookPolicy:
          settings.webhookPolicy as unknown as InventoryDepletionPolicyConfig,
        cronSyncPolicy:
          settings.cronSyncPolicy as unknown as InventoryDepletionPolicyConfig,
        manualPolicy:
          settings.manualPolicy as unknown as InventoryDepletionPolicyConfig,
        enableAutoConversion: settings.enableAutoConversion,
        conversionFallback: settings.conversionFallback as
          | 'error'
          | 'warn'
          | 'ignore',
        enableOverDepletionLogging: settings.enableOverDepletionLogging,
        enableUnitConversionLogging: settings.enableUnitConversionLogging,
        auditLogRetentionDays: settings.auditLogRetentionDays,
      }
    }

    // Cache the result
    this.cache.set(organizationId, {
      settings: config,
      cachedAt: Date.now(),
    })

    return config
  }

  /**
   * Get policy for a specific source
   */
  async getPolicyForSource(
    organizationId: string,
    source: 'webhook' | 'cronSync' | 'manual'
  ): Promise<InventoryDepletionPolicyConfig> {
    const settings = await this.getSettings(organizationId)

    switch (source) {
      case 'webhook':
        return settings.webhookPolicy
      case 'cronSync':
        return settings.cronSyncPolicy
      case 'manual':
        return settings.manualPolicy
      default:
        throw new Error(`Unknown source: ${source}`)
    }
  }

  /**
   * Clear cache for an organization (call after settings updates)
   */
  clearCache(organizationId: string): void {
    this.cache.delete(organizationId)
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Determine source type from string identifier
   */
  static parseSourceType(source: string): 'webhook' | 'cronSync' | 'manual' {
    if (source.includes('webhook') || source.includes('pos_webhook')) {
      return 'webhook'
    }
    if (
      source.includes('cron') ||
      source.includes('sync') ||
      source.includes('pos_cron_sync')
    ) {
      return 'cronSync'
    }
    return 'manual'
  }
}
