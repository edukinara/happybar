import { Resend } from 'resend'
import { env } from '../config/env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export interface SupplierOrderEmailData {
  email: string
  supplierName: string
  organizationName: string
  organizationAddress?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  orderNumber: string
  orderDate: Date
  items: Array<{
    productName: string
    size: string
    quantity: number
    orderingUnit: string
    unitsPerCase?: number | null
  }>
  notes?: string
}

export async function sendSupplierOrderEmail(data: SupplierOrderEmailData) {
  if (!resend) {
    console.warn('Resend API key not configured, skipping supplier order email')
    console.log('Would send supplier order email:', data)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const fromEmail = 'Happy Bar <orders@updates.happybar.app>'

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `Purchase Order ${data.orderNumber} from ${data.organizationName}`,
      html: generateSupplierOrderEmailHTML(data),
    })

    console.log('Supplier order email sent successfully:', result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('Failed to send supplier order email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function generateSupplierOrderEmailHTML(data: SupplierOrderEmailData): string {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatAddress = (addr: typeof data.organizationAddress) => {
    if (!addr) return 'Address not provided'
    const parts = []
    if (addr.street) parts.push(addr.street)
    if (addr.city && addr.state && addr.zip) {
      parts.push(`${addr.city}, ${addr.state} ${addr.zip}`)
    } else {
      if (addr.city) parts.push(addr.city)
      if (addr.state) parts.push(addr.state)
      if (addr.zip) parts.push(addr.zip)
    }
    if (addr.country) parts.push(addr.country)
    return parts.join('<br>') || 'Address not provided'
  }

  const formatQuantity = (item: (typeof data.items)[0]) => {
    if (item.orderingUnit === 'CASE' && item.unitsPerCase) {
      return `${item.quantity} ${item.quantity === 1 ? 'case' : 'cases'}`
    }
    return `${item.quantity} ${item.quantity === 1 ? 'bottle' : 'bottles'}`
  }

  const formatUnitsPerCase = (item: (typeof data.items)[0]) => {
    if (item.orderingUnit === 'CASE' && item.unitsPerCase) {
      return `${item.unitsPerCase} per case`
    }
    return '-'
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order ${data.orderNumber}</title>
      <style>
        @media only screen and (max-width: 620px) {
          .email-container { padding: 10px !important; }
          .email-content { padding: 20px !important; }
          table.order-table { font-size: 12px !important; }
        }
        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
        }
        .order-table th {
          background: #f8fafc;
          padding: 12px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        .order-table td {
          padding: 12px;
          font-size: 14px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }
        .order-table tr:last-child td {
          border-bottom: none;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f8fafc; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            
            <!-- Header -->
            <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; margin: 0 auto;">
              <tr>
                <td style="text-align: center; padding-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: inline-block; padding: 20px 32px; border-radius: 16px; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                      <!-- Happy Bar Logo SVG -->
                      <svg width="40" height="40" viewBox="0 0 32 32" style="display: block;">
                        <defs>
                          <clipPath id="glass-clip-32">
                            <path d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z"/>
                          </clipPath>
                          <linearGradient id="waveGradient32" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color: rgb(245, 158, 11); stop-opacity: 0.8"/>
                            <stop offset="100%" style="stop-color: rgb(147, 51, 234); stop-opacity: 0.9"/>
                          </linearGradient>
                        </defs>
                        <!-- Liquid inside glass -->
                        <g clip-path="url(#glass-clip-32)">
                          <rect x="8" y="14" width="16" height="5" fill="url(#waveGradient32)"/>
                          <path d="M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z" fill="url(#waveGradient32)" opacity="0.9"/>
                        </g>
                        <!-- Glass outline -->
                        <path d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z" 
                              stroke="#ffffff" 
                              stroke-width="2.5" 
                              stroke-linecap="round" 
                              fill="none"/>
                        <!-- Stem -->
                        <path d="M16 19V26" 
                              stroke="#ffffff" 
                              stroke-width="2.5" 
                              stroke-linecap="round"/>
                        <!-- Base -->
                        <path d="M12 26H20" 
                              stroke="#ffffff" 
                              stroke-width="2.5" 
                              stroke-linecap="round"/>
                        <!-- Smile -->
                        <path d="M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13" 
                              stroke="#ffffff" 
                              stroke-width="2" 
                              stroke-linecap="round" 
                              fill="none"/>
                        <!-- Bubbles -->
                        <circle cx="14" cy="6" r="1.2" fill="#ffffff" opacity="0.9"/>
                        <circle cx="18" cy="5" r="1.8" fill="#ffffff" opacity="0.7"/>
                        <circle cx="11" cy="4" r="1.2" fill="#ffffff" opacity="0.8"/>
                      </svg>
                        </td>
                        <td style="vertical-align: middle;">
                          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white; letter-spacing: -0.02em;">Happy Bar</h1>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Main Content -->
            <table class="email-content" role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 25px rgba(0, 0, 0, 0.06); overflow: hidden;">
              <tr>
                <td style="padding: 48px 40px;">
                  
                  <!-- Order Header -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1e293b;">Purchase Order</h2>
                    <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: 600;">#${data.orderNumber}</p>
                  </div>

                  <!-- Order Details Grid -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
                    <div>
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">From:</p>
                      <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${data.organizationName}</p>
                      <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
                        ${formatAddress(data.organizationAddress)}
                      </p>
                    </div>
                    <div>
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Order Information:</p>
                      <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">
                        <strong>Vendor:</strong> ${data.supplierName}
                      </p>
                      <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">
                        <strong>Date:</strong> ${formatDate(data.orderDate)}
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #475569;">
                        <strong>Order #:</strong> ${data.orderNumber}
                      </p>
                    </div>
                  </div>

                  <!-- Order Items Table -->
                  <table class="order-table">
                    <thead>
                      <tr>
                        <th style="text-align: left;">Item Name</th>
                        <th style="text-align: left;">Size</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: center;">Units Per Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.items
                        .map(
                          (item) => `
                        <tr>
                          <td>${item.productName}</td>
                          <td>${item.size}</td>
                          <td style="text-align: center;">${formatQuantity(item)}</td>
                          <td style="text-align: center;">${formatUnitsPerCase(item)}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>

                  ${
                    data.notes
                      ? `
                    <!-- Notes Section -->
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 32px 0; border-left: 4px solid #667eea;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Notes:</p>
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">${data.notes}</p>
                    </div>
                  `
                      : ''
                  }
                  
                  <!-- Important Notice -->
                  <div style="border: 1px solid #10b981; background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 32px 0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #166534;">
                      <strong>📦 Delivery Instructions:</strong> Please confirm receipt of this order. Contact us if you have any questions about this order.
                    </p>
                  </div>
                  
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; margin: 32px auto 0 auto;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 12px auto;">
                    <tr>
                      <td style="vertical-align: middle; padding-right: 8px;">
                    <svg width="20" height="20" viewBox="0 0 32 32" style="display: block;">
                      <defs>
                        <clipPath id="glass-clip-footer">
                          <path d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z"/>
                        </clipPath>
                        <linearGradient id="waveGradient-footer" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style="stop-color: rgb(245, 158, 11); stop-opacity: 0.7"/>
                          <stop offset="100%" style="stop-color: rgb(147, 51, 234); stop-opacity: 0.8"/>
                        </linearGradient>
                      </defs>
                      <!-- Liquid inside glass -->
                      <g clip-path="url(#glass-clip-footer)">
                        <rect x="8" y="14" width="16" height="5" fill="url(#waveGradient-footer)"/>
                        <path d="M8 14 Q12 13, 16 14 T24 14 L24 18 Q20 18.5, 16 18 Q12 18.5, 8 18 Z" fill="url(#waveGradient-footer)" opacity="0.8"/>
                      </g>
                      <!-- Glass outline -->
                      <path d="M8 10C8 9.44772 8.44772 9 9 9H23C23.5523 9 24 9.44772 24 10V11C24 15.4183 20.4183 19 16 19C11.5817 19 8 15.4183 8 11V10Z" 
                            stroke="#64748b" 
                            stroke-width="1.5" 
                            stroke-linecap="round" 
                            fill="none"/>
                      <!-- Stem -->
                      <path d="M16 19V26" 
                            stroke="#64748b" 
                            stroke-width="1.5" 
                            stroke-linecap="round"/>
                      <!-- Base -->
                      <path d="M12 26H20" 
                            stroke="#64748b" 
                            stroke-width="1.5" 
                            stroke-linecap="round"/>
                      <!-- Smile -->
                      <path d="M12 13C12 13 13.5 15 16 15C18.5 15 20 13 20 13" 
                            stroke="#64748b" 
                            stroke-width="1.2" 
                            stroke-linecap="round" 
                            fill="none"/>
                      <!-- Bubbles -->
                      <circle cx="14" cy="6" r="0.8" fill="#64748b" opacity="0.6"/>
                      <circle cx="18" cy="5" r="1.2" fill="#64748b" opacity="0.4"/>
                      <circle cx="11" cy="4" r="0.8" fill="#64748b" opacity="0.5"/>
                    </svg>
                      </td>
                      <td style="vertical-align: middle;">
                        <span style="font-size: 14px; font-weight: 600; color: #64748b;">Happy Bar</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                    This purchase order was sent from Happy Bar Inventory Management System
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    This is an automated email. For questions about this order, please contact ${data.organizationName} directly.
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
