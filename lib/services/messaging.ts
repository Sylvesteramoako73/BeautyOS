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

// ── WhatsApp via Twilio ───────────────────────────────────────────────────────

async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_FROM_WHATSAPP ?? 'whatsapp:+14155238886'

  if (!sid || !token) {
    console.log(`[WHATSAPP MOCK → ${to}]\n${body}\n`)
    return { success: true, mock: true }
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    // Normalise to WhatsApp format
    const toWa   = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    const msg    = await client.messages.create({ to: toWa, from, body })
    return { success: true, messageId: msg.sid }
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
