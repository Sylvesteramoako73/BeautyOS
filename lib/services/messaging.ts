type Channel = 'sms' | 'whatsapp' | 'email'

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  mock?: boolean
}

// ── Template variable substitution ───────────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// ── SMS via Twilio ────────────────────────────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<SendResult> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_FROM_SMS

  if (!sid || !token || !from) {
    console.log(`[SMS MOCK → ${to}]\n${body}\n`)
    return { success: true, mock: true }
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const msg = await client.messages.create({ to, from, body })
    return { success: true, messageId: msg.sid }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── WhatsApp via Railway (Baileys) ────────────────────────────────────────────

async function sendWhatsAppViaRailway(to: string, body: string): Promise<SendResult> {
  const baseUrl   = process.env.RAILWAY_WHATSAPP_URL
  const sessionId = process.env.RAILWAY_WHATSAPP_SESSION ?? 'default'
  if (!baseUrl) return { success: false, error: 'RAILWAY_WHATSAPP_URL not set' }

  try {
    const res = await fetch(`${baseUrl}/api/whatsapp/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, number: to, message: body }),
    })
    const data = await res.json() as any
    if (!res.ok || !data.ok) return { success: false, error: data.error ?? 'Railway WA error' }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── WhatsApp via Meta Cloud API ───────────────────────────────────────────────

async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  // Prefer Railway (Baileys) if configured
  if (process.env.RAILWAY_WHATSAPP_URL) {
    return sendWhatsAppViaRailway(to, body)
  }

  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.META_WHATSAPP_ACCESS_TOKEN

  // Fallback to Twilio if Meta not configured
  if (!phoneNumberId || !accessToken) {
    const sid   = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from  = process.env.TWILIO_FROM_WHATSAPP ?? 'whatsapp:+14155238886'
    if (!sid || !token) {
      console.log(`[WHATSAPP MOCK → ${to}]\n${body}\n`)
      return { success: true, mock: true }
    }
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const toWa   = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    const msg    = await client.messages.create({ to: toWa, from, body })
    return { success: true, messageId: msg.sid }
  }

  // Strip leading + and spaces — Meta requires plain E.164 digits
  const toNumber = to.replace(/^\+/, '').replace(/\D/g, '')

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:   toNumber,
        type: 'text',
        text: { body },
      }),
    })
    const data = await res.json() as any
    if (!res.ok) return { success: false, error: data.error?.message ?? 'Meta API error' }
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Email via Nodemailer ──────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM ?? 'BeautyOS <no-reply@salon.com>'

  if (!host || !user || !pass) {
    console.log(`[EMAIL MOCK → ${to}]\nSubject: ${subject}\n${body}\n`)
    return { success: true, mock: true }
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false,
      auth: { user, pass },
    })
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    })
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Unified send function ─────────────────────────────────────────────────────

export async function sendMessage(
  channel: Channel,
  recipient: string,
  message: string,
  subject?: string,
): Promise<SendResult> {
  switch (channel) {
    case 'sms':       return sendSMS(recipient, message)
    case 'whatsapp':  return sendWhatsApp(recipient, message)
    case 'email':     return sendEmail(recipient, subject ?? 'Luxe Beauty Studio', message)
    default:          return { success: false, error: `Unknown channel: ${channel}` }
  }
}
