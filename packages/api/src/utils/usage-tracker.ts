import { SubscriptionService } from '../services/subscription'

/**
 * Helper functions to track feature usage after backend operations
 */

export class UsageTracker {
  /**
   * Set absolute usage count for a feature
   */
  static async setFeatureUsage(
    customerId: string,
    featureId: string,
    absoluteValue: number
  ): Promise<void> {
    try {
      await SubscriptionService.trackUsage({
        customerId,
        featureId,
        value: absoluteValue,
        track: false, // false means set absolute value
      })
    } catch (error) {
      console.error(`⚠️ Failed to update ${featureId} usage:`, error)
      // Don't throw - usage tracking failures shouldn't break the main operation
    }
  }

  /**
   * Increment usage count for a feature
   */
  static async incrementFeatureUsage(
    customerId: string,
    featureId: string,
    value: number = 1
  ): Promise<void> {
    try {
      await SubscriptionService.trackUsage({
        customerId,
        featureId,
        value,
        track: true, // true means increment/decrement
      })
    } catch (error) {
      console.error(`⚠️ Failed to increment ${featureId} usage:`, error)
    }
  }

  /**
   * Update team member usage by counting current organization members
   */
  static async updateTeamMemberUsage(
    customerId: string,
    organizationId: string,
    prisma: any
  ): Promise<void> {
    try {
      const memberCount = await prisma.member.count({
        where: { organizationId },
      })

      await this.setFeatureUsage(customerId, 'team_members', memberCount)
    } catch (error) {
      console.error('⚠️ Failed to update team member usage:', error)
    }
  }

  /**
   * Update location usage by counting current organization locations
   */
  static async updateLocationUsage(
    customerId: string,
    organizationId: string,
    prisma: any
  ): Promise<void> {
    try {
      const locationCount = await prisma.location.count({
        where: { organizationId },
      })

      await this.setFeatureUsage(customerId, 'locations', locationCount)
    } catch (error) {
      console.error('⚠️ Failed to update location usage:', error)
    }
  }
}
