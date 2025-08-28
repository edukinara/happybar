import { Resend } from 'resend'
import { env } from '../config/env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export interface InvitationEmailData {
  email: string
  organizationName: string
  inviterName: string
  invitationUrl: string
  role: string
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  if (!resend) {
    console.warn('Resend API key not configured, skipping email send')
    console.log('Would send invitation email:', data)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Use different sender based on environment
    const fromEmail = 'Happy Bar <noreply@updates.happybar.app>' // 'Happy Bar <onboarding@resend.dev>' Default Resend domain for development

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `You're invited to join ${data.organizationName} on Happy Bar`,
      html: generateInvitationEmailHTML(data),
    })

    console.log('Invitation email sent successfully:', result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function generateInvitationEmailHTML(data: InvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to ${data.organizationName}</title>
      <style>
        @media only screen and (max-width: 620px) {
          .email-container { padding: 10px !important; }
          .email-content { padding: 20px !important; }
          .cta-button { padding: 14px 20px !important; font-size: 16px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f8fafc; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            
            <!-- Header -->
            <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto;">
              <tr>
                <td style="text-align: center; padding-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: inline-block; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.02em;">Happy Bar</h1>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Main Content -->
            <table class="email-content" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 25px rgba(0, 0, 0, 0.06); overflow: hidden;">
              <tr>
                <td style="padding: 48px 40px;">
                  
                  <!-- Invitation Header -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: #f1f5f9; width: 64px; height: 64px; border-radius: 32px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                      <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;"></div>
                    </div>
                    <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1e293b; line-height: 1.3;">You're invited to join<br><span style="color: #667eea;">${data.organizationName}</span></h2>
                  </div>

                  <!-- Greeting -->
                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">Hello!</p>
                  
                  <!-- Invitation Details -->
                  <div style="background: #f8fafc; border-left: 4px solid #667eea; padding: 20px 24px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #334155;">
                      <strong style="color: #1e293b;">${data.inviterName}</strong> has invited you to join 
                      <strong style="color: #1e293b;">${data.organizationName}</strong> with 
                      <strong style="color: #667eea;">${data.role}</strong> access.
                    </p>
                  </div>
                  
                  <!-- Product Description -->
                  <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                    Happy Bar is a comprehensive inventory management platform designed for restaurants, bars, and hospitality businesses. 
                    Track stock levels, manage orders, analyze performance, and streamline your operations—all in one place.
                  </p>

                  <!-- Features List -->
                  <div style="margin: 32px 0;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;">What you'll get access to:</p>
                    <ul style="margin: 0; padding: 0; list-style: none;">
                      <li style="margin: 8px 0; font-size: 14px; color: #475569; display: flex; align-items: center;">
                        <span style="width: 6px; height: 6px; background: #667eea; border-radius: 50%; margin-right: 12px; flex-shrink: 0;"></span>
                        Real-time inventory tracking and alerts
                      </li>
                      <li style="margin: 8px 0; font-size: 14px; color: #475569; display: flex; align-items: center;">
                        <span style="width: 6px; height: 6px; background: #667eea; border-radius: 50%; margin-right: 12px; flex-shrink: 0;"></span>
                        POS system integrations and sales analytics
                      </li>
                      <li style="margin: 8px 0; font-size: 14px; color: #475569; display: flex; align-items: center;">
                        <span style="width: 6px; height: 6px; background: #667eea; border-radius: 50%; margin-right: 12px; flex-shrink: 0;"></span>
                        Automated ordering and supplier management
                      </li>
                      <li style="margin: 8px 0; font-size: 14px; color: #475569; display: flex; align-items: center;">
                        <span style="width: 6px; height: 6px; background: #667eea; border-radius: 50%; margin-right: 12px; flex-shrink: 0;"></span>
                        Team collaboration and role-based permissions
                      </li>
                    </ul>
                  </div>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${data.invitationUrl}" 
                       class="cta-button"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; text-align: center; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3); transition: all 0.2s ease;">
                      Accept Invitation →
                    </a>
                  </div>
                  
                  <!-- Alternative Link -->
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 32px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      Alternative link:
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569; word-break: break-all;">
                      <a href="${data.invitationUrl}" style="color: #667eea; text-decoration: underline;">${data.invitationUrl}</a>
                    </p>
                  </div>

                  <!-- Expiration Notice -->
                  <div style="border: 1px solid #fbbf24; background: #fffbeb; padding: 16px; border-radius: 8px; margin: 32px 0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                      <strong>⏰ This invitation expires in 7 days.</strong> Please accept it soon to get started.
                    </p>
                  </div>
                  
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 32px auto 0 auto;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                    This invitation was sent to <strong>${data.email}</strong>
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    If you didn't expect this invitation, you can safely ignore this email.<br>
                    Questions? Contact us at <a href="mailto:support@happybar.app" style="color: #667eea; text-decoration: none;">support@happybar.app</a>
                  </p>
                </td>
              </tr>
            </table>
            
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}
