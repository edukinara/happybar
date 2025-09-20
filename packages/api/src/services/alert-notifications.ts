import { PrismaClient } from '@happy-bar/database'
import { AlertType } from '@happy-bar/types'

export interface AlertNotification {
  id: string
  title: string
  message: string
  type: AlertType
  severity: string
  productName?: string
  costImpact?: number
  createdAt: Date
}

export class AlertNotificationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Send email notification for critical alerts
   */
  async sendEmailNotification(
    organizationId: string,
    alert: AlertNotification
  ): Promise<void> {
    try {
      // Get organization settings to check if email notifications are enabled
      const alertRule = await this.prisma.alertRule.findFirst({
        where: {
          organizationId,
          type: alert.type,
        },
      })

      if (!alertRule?.notifyEmail) {
        return // Email notifications disabled for this alert type
      }

      // Get organization members who should receive notifications
      const _members = await this.prisma.member.findMany({
        where: {
          organizationId,
          // Only notify admin and manager roles for critical alerts
          role: { in: ['ADMIN', 'MANAGER'] },
        },
        include: {
          user: true,
        },
      })

      // For now, just log the notification (in production, integrate with email service)
      // console.warn(`📧 EMAIL ALERT: ${alert.title}`)
      // console.warn(
      //   `   Recipients: ${members.map((m) => m.user.email).join(', ')}`
      // )
      // console.warn(`   Message: ${alert.message}`)
      // console.warn(`   Severity: ${alert.severity}`)
      // if (alert.costImpact) {
      //   console.warn(`   Cost Impact: $${Math.abs(alert.costImpact).toFixed(2)}`)
      // }

      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      // await emailService.send({
      //   to: members.map(m => m.user.email),
      //   subject: `🚨 ${alert.title}`,
      //   template: 'variance-alert',
      //   data: alert,
      // })
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  /**
   * Send dashboard notification (real-time via WebSocket)
   */
  async sendDashboardNotification(
    organizationId: string,
    alert: AlertNotification
  ): Promise<void> {
    try {
      // Check if dashboard notifications are enabled
      const alertRule = await this.prisma.alertRule.findFirst({
        where: {
          organizationId,
          type: alert.type,
        },
      })

      if (!alertRule?.notifyDashboard) {
        return // Dashboard notifications disabled
      }

      // TODO: Send via WebSocket to connected dashboard clients
      // await websocketService.sendToOrganization(organizationId, {
      //   type: 'variance_alert',
      //   data: alert,
      // })
    } catch (error) {
      console.error('Failed to send dashboard notification:', error)
    }
  }

  /**
   * Send Slack notification (if configured)
   */
  async sendSlackNotification(
    organizationId: string,
    alert: AlertNotification
  ): Promise<void> {
    try {
      // Get Slack webhook URL from organization settings
      const settings = await this.prisma.inventorySettings.findUnique({
        where: { organizationId },
      })

      const slackWebhookUrl = (settings?.webhookPolicy as any)?.slackWebhookUrl
      if (!slackWebhookUrl) {
        return // Slack not configured
      }

      const severity =
        alert.severity === 'CRITICAL'
          ? '🚨'
          : alert.severity === 'HIGH'
            ? '⚠️'
            : alert.severity === 'MEDIUM'
              ? '🟡'
              : '🔵'

      const slackMessage = {
        text: `${severity} *${alert.title}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${severity} *${alert.title}*\n${alert.message}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Type:* ${alert.type} | *Severity:* ${alert.severity}`,
              },
            ],
          },
        ],
      }

      if (alert.costImpact) {
        slackMessage.blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Cost Impact:* $${Math.abs(alert.costImpact).toFixed(2)}`,
            },
          ],
        })
      }

      // For now, just log (in production, send to Slack)
      // console.warn(`💬 SLACK ALERT: ${alert.title}`)
      // console.warn(`   Webhook: ${slackWebhookUrl}`)

      // TODO: Send to Slack
      // await fetch(slackWebhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(slackMessage),
      // })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  /**
   * Send all configured notifications for an alert
   */
  async sendNotifications(
    organizationId: string,
    alertId: string
  ): Promise<void> {
    try {
      // Get the alert details
      const alert = await this.prisma.alert.findUnique({
        where: { id: alertId },
        include: {
          rule: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!alert) {
        throw new Error('Alert not found')
      }

      const notification: AlertNotification = {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        severity: alert.severity,
        productName: alert.rule.product?.name,
        costImpact: alert.triggerValue || undefined,
        createdAt: alert.createdAt,
      }

      // Send notifications based on severity and configuration
      const promises: Promise<void>[] = []

      // Always send dashboard notifications
      promises.push(
        this.sendDashboardNotification(organizationId, notification)
      )

      // Send email for HIGH and CRITICAL alerts
      if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        promises.push(this.sendEmailNotification(organizationId, notification))
      }

      // Send Slack for CRITICAL alerts
      if (alert.severity === 'CRITICAL') {
        promises.push(this.sendSlackNotification(organizationId, notification))
      }

      await Promise.all(promises)
    } catch (error) {
      console.error('Failed to send notifications:', error)
    }
  }

  /**
   * Get recent alert notifications for dashboard
   */
  async getRecentAlerts(
    organizationId: string,
    limit: number = 10
  ): Promise<AlertNotification[]> {
    const alerts = await this.prisma.alert.findMany({
      where: {
        organizationId,
        type: {
          in: ['USAGE_VARIANCE', 'EFFICIENCY_LOW', 'OVERUSE_DETECTED'],
        },
        status: 'ACTIVE',
      },
      include: {
        rule: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      type: alert.type,
      severity: alert.severity,
      productName: alert.rule.product?.name,
      costImpact: alert.triggerValue || undefined,
      createdAt: alert.createdAt,
    }))
  }
}
