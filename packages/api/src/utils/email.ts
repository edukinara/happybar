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
    const fromEmail = env.NODE_ENV === 'production' 
      ? 'Happy Bar <noreply@happybar.app>'
      : 'Happy Bar <onboarding@resend.dev>' // Default Resend domain for development
    
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
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
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Happy Bar</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0;">You're invited to join ${data.organizationName}</h2>
        
        <p>Hi there!</p>
        
        <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on Happy Bar as a <strong>${data.role}</strong>.</p>
        
        <p>Happy Bar is an inventory management platform that helps restaurants and bars track their stock, manage orders, and optimize operations.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${data.invitationUrl}" 
             style="background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: 500;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If the button doesn't work, you can copy and paste this link into your browser:<br>
          <a href="${data.invitationUrl}" style="color: #2563eb; word-break: break-all;">${data.invitationUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This invitation was sent to ${data.email}. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `
}