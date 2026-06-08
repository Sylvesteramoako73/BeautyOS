import { adminDb } from '@/lib/firebase-admin'
import { sendMessage, renderTemplate } from './messaging'

interface ProcessResult {
  automationId: string
  name: string
  processed: number
  sent: number
  skipped: number
  failed: number
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function aptVars(appt: any) {
  return {
    client_name: appt.clientName,
    time:        formatTime(appt.startTime),
    service:     (appt.services ?? []).map((s: any) => s.name).join(', '),
    staff:       appt.staffName,
    amount:      `₵${(appt.totalPrice ?? 0).toFixed(0)}`,
    date:        new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

// Check if already sent — single where, filter in memory
async function alreadySent(automationId: string, appointmentId?: string | null, clientId?: string | null) {
  const snap = await adminDb.collection('automationLogs').where('automationId', '==', automationId).get()
  return snap.docs.some(d => {
    const data = d.data()
    if (appointmentId) return data.appointmentId === appointmentId
    if (clientId)      return data.clientId === clientId
    return false
  })
}

async function logResult(data: {
  automationId: string; tenantId?: string | null
  appointmentId?: string | null; clientId?: string | null
  recipient: string; message: string; channel: string; status: string; error?: string
}) {
  const now = new Date().toISOString()
  await adminDb.collection('automationLogs').add({
    ...data,
    tenantId:      data.tenantId ?? null,
    appointmentId: data.appointmentId ?? null,
    clientId:      data.clientId ?? null,
    sentAt:        data.status === 'sent' ? now : null,
    createdAt:     now,
  })
}

async function processBeforeAppointment(auto: any): Promise<ProcessResult> {
  const result   = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const windowMs = Math.abs(auto.delayMinutes) * 60 * 1000
  const now      = Date.now()
  const today    = new Date().toISOString().split('T')[0]

  const snap = await adminDb.collection('appointments').where('date', '==', today).get()

  for (const doc of snap.docs) {
    const appt = { id: doc.id, ...doc.data() } as any
    if (appt.tenantId !== auto.tenantId) continue
    if (appt.status !== 'confirmed') continue
    result.processed++
    const [h, m] = appt.startTime.split(':').map(Number)
    const apptMs = new Date().setHours(h, m, 0, 0)
    const diff   = apptMs - now

    if (diff > 0 && diff <= windowMs) {
      if (await alreadySent(auto.id, appt.id)) { result.skipped++; continue }
      const message   = renderTemplate(auto.messageTemplate, aptVars(appt))
      const recipient = auto.channel === 'email' ? appt.clientEmail : appt.clientPhone
      if (!recipient) { result.skipped++; continue }
      const send = await sendMessage(auto.channel, recipient, message, 'Appointment Reminder')
      await logResult({ automationId: auto.id, tenantId: auto.tenantId, appointmentId: appt.id, clientId: appt.clientId, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
      send.success ? result.sent++ : result.failed++
    } else { result.skipped++ }
  }
  return result
}

async function processAfterAppointment(auto: any): Promise<ProcessResult> {
  const result   = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const now      = Date.now()
  const windowMs = auto.delayMinutes * 60 * 1000
  const cutoff   = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const cond     = JSON.parse(auto.conditionJson || '{}')

  const snap = await adminDb.collection('appointments').where('date', '>=', cutoff).get()

  for (const doc of snap.docs) {
    const appt = { id: doc.id, ...doc.data() } as any
    if (appt.tenantId !== auto.tenantId) continue
    if (appt.status !== (cond.status ?? 'completed')) continue
    result.processed++
    const elapsed = now - new Date(appt.updatedAt).getTime()
    if (elapsed >= windowMs && elapsed < windowMs + 30 * 60 * 1000) {
      if (await alreadySent(auto.id, appt.id)) { result.skipped++; continue }
      const message   = renderTemplate(auto.messageTemplate, aptVars(appt))
      const recipient = auto.channel === 'email' ? appt.clientEmail : appt.clientPhone
      if (!recipient) { result.skipped++; continue }
      const send = await sendMessage(auto.channel, recipient, message, 'Thank you for your visit')
      await logResult({ automationId: auto.id, tenantId: auto.tenantId, appointmentId: appt.id, clientId: appt.clientId, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
      send.success ? result.sent++ : result.failed++
    } else { result.skipped++ }
  }
  return result
}

async function processBirthday(auto: any): Promise<ProcessResult> {
  const result = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const today  = new Date()
  const mm     = String(today.getMonth() + 1).padStart(2, '0')
  const dd     = String(today.getDate()).padStart(2, '0')

  // Single where on isActive
  const snap = await adminDb.collection('clients').where('isActive', '==', true).get()
  for (const doc of snap.docs) {
    const client = { id: doc.id, ...doc.data() } as any
    if (client.tenantId !== auto.tenantId) continue
    if (!client.dateOfBirth) { result.skipped++; continue }
    result.processed++
    const dob = new Date(client.dateOfBirth)
    if (String(dob.getMonth() + 1).padStart(2, '0') !== mm || String(dob.getDate()).padStart(2, '0') !== dd) { result.skipped++; continue }
    if (await alreadySent(auto.id, null, client.id)) { result.skipped++; continue }
    const message   = renderTemplate(auto.messageTemplate, { client_name: client.name })
    const recipient = auto.channel === 'email' ? client.email : client.phone
    if (!recipient) { result.skipped++; continue }
    const send = await sendMessage(auto.channel, recipient, message, 'Happy Birthday!')
    await logResult({ automationId: auto.id, tenantId: auto.tenantId, clientId: client.id, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
    send.success ? result.sent++ : result.failed++
  }
  return result
}

async function processNoVisit(auto: any): Promise<ProcessResult> {
  const result = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const cond   = JSON.parse(auto.conditionJson || '{"daysSinceVisit":30}')
  const days   = cond.daysSinceVisit ?? 30
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()

  const snap = await adminDb.collection('clients').where('isActive', '==', true).get()
  for (const doc of snap.docs) {
    const client = { id: doc.id, ...doc.data() } as any
    if (client.tenantId !== auto.tenantId) continue
    if (!client.lastVisitAt || client.lastVisitAt >= cutoff) continue
    result.processed++
    if (await alreadySent(auto.id, null, client.id)) { result.skipped++; continue }
    const message   = renderTemplate(auto.messageTemplate, { client_name: client.name })
    const recipient = auto.channel === 'email' ? client.email : client.phone
    if (!recipient) { result.skipped++; continue }
    const send = await sendMessage(auto.channel, recipient, message, 'We miss you!')
    await logResult({ automationId: auto.id, tenantId: auto.tenantId, clientId: client.id, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
    send.success ? result.sent++ : result.failed++
  }
  return result
}

async function processNoShow(auto: any): Promise<ProcessResult> {
  const result   = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const now      = Date.now()
  const windowMs = auto.delayMinutes * 60 * 1000
  const cutoff   = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const snap = await adminDb.collection('appointments').where('date', '>=', cutoff).get()
  for (const doc of snap.docs) {
    const appt = { id: doc.id, ...doc.data() } as any
    if (appt.tenantId !== auto.tenantId) continue
    if (appt.status !== 'no-show') continue
    result.processed++
    const elapsed = now - new Date(appt.updatedAt).getTime()
    if (elapsed >= windowMs && elapsed < windowMs + 30 * 60 * 1000) {
      if (await alreadySent(auto.id, appt.id)) { result.skipped++; continue }
      const message   = renderTemplate(auto.messageTemplate, { client_name: appt.clientName })
      const recipient = auto.channel === 'email' ? appt.clientEmail : appt.clientPhone
      if (!recipient) { result.skipped++; continue }
      const send = await sendMessage(auto.channel, recipient, message, 'We missed you today')
      await logResult({ automationId: auto.id, tenantId: auto.tenantId, appointmentId: appt.id, clientId: appt.clientId, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
      send.success ? result.sent++ : result.failed++
    } else { result.skipped++ }
  }
  return result
}

export async function runAutomationForEvent(
  trigger: string,
  context: { appointmentId?: string; clientId?: string; newTier?: string },
) {
  // Single where on isActive, filter trigger in memory
  const snap = await adminDb.collection('automations').where('isActive', '==', true).get()

  for (const doc of snap.docs) {
    const auto = { id: doc.id, ...doc.data() } as any
    if (auto.trigger !== trigger) continue

    if (context.appointmentId) {
      const apptDoc = await adminDb.collection('appointments').doc(context.appointmentId).get()
      if (!apptDoc.exists) continue
      const appt = { id: apptDoc.id, ...apptDoc.data() } as any
      if (await alreadySent(auto.id, appt.id)) continue
      const vars    = { ...aptVars(appt), new_tier: context.newTier ?? '' }
      const message = renderTemplate(auto.messageTemplate, vars)
      const send    = await sendMessage(auto.channel, appt.clientPhone, message)
      await logResult({ automationId: auto.id, appointmentId: appt.id, clientId: appt.clientId, recipient: appt.clientPhone, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
    } else if (context.clientId) {
      const clientDoc = await adminDb.collection('clients').doc(context.clientId).get()
      if (!clientDoc.exists) continue
      const client = { id: clientDoc.id, ...clientDoc.data() } as any
      if (await alreadySent(auto.id, null, client.id)) continue
      const message = renderTemplate(auto.messageTemplate, { client_name: client.name, new_tier: context.newTier ?? '' })
      const send    = await sendMessage(auto.channel, client.phone, message)
      await logResult({ automationId: auto.id, clientId: client.id, recipient: client.phone, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
    }
  }
}

async function processNewClient(auto: any): Promise<ProcessResult> {
  const result  = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const cutoff  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const snap = await adminDb.collection('clients').where('isActive', '==', true).get()
  for (const doc of snap.docs) {
    const client = { id: doc.id, ...doc.data() } as any
    if (client.tenantId !== auto.tenantId) continue
    if (!client.createdAt || client.createdAt < cutoff) continue
    result.processed++
    if (await alreadySent(auto.id, null, client.id)) { result.skipped++; continue }
    const message = renderTemplate(auto.messageTemplate, {
      client_name: client.name,
      service:     '',
      staff:       '',
      amount:      '',
      time:        '',
      date:        new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' }),
    })
    const recipient = auto.channel === 'email' ? client.email : client.phone
    if (!recipient) { result.skipped++; continue }
    const send = await sendMessage(auto.channel, recipient, message, `Welcome to ${auto.name}`)
    await logResult({ automationId: auto.id, tenantId: auto.tenantId, clientId: client.id, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
    send.success ? result.sent++ : result.failed++
  }
  return result
}

async function processReviewRequest(auto: any): Promise<ProcessResult> {
  const result   = { automationId: auto.id, name: auto.name, processed: 0, sent: 0, skipped: 0, failed: 0 }
  const now      = Date.now()
  const windowMs = auto.delayMinutes * 60 * 1000
  const cutoff   = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const snap = await adminDb.collection('appointments').where('date', '>=', cutoff).get()
  for (const doc of snap.docs) {
    const appt = { id: doc.id, ...doc.data() } as any
    if (appt.tenantId !== auto.tenantId) continue
    if (appt.status !== 'completed') continue
    result.processed++
    const elapsed = now - new Date(appt.updatedAt).getTime()
    if (elapsed >= windowMs && elapsed < windowMs + 30 * 60 * 1000) {
      if (await alreadySent(auto.id, appt.id)) { result.skipped++; continue }
      const message  = renderTemplate(auto.messageTemplate, aptVars(appt))
      const recipient = auto.channel === 'email' ? appt.clientEmail : appt.clientPhone
      if (!recipient) { result.skipped++; continue }
      const send = await sendMessage(auto.channel, recipient, message, 'How was your visit?')
      await logResult({ automationId: auto.id, tenantId: auto.tenantId, appointmentId: appt.id, clientId: appt.clientId, recipient, message, channel: auto.channel, status: send.success ? 'sent' : 'failed', error: send.error })
      send.success ? result.sent++ : result.failed++
    } else { result.skipped++ }
  }
  return result
}

export async function processAllAutomations(): Promise<ProcessResult[]> {
  const snap    = await adminDb.collection('automations').where('isActive', '==', true).get()
  const results: ProcessResult[] = []

  for (const doc of snap.docs) {
    const auto = { id: doc.id, ...doc.data() } as any
    let result: ProcessResult

    switch (auto.trigger) {
      case 'before_appointment': result = await processBeforeAppointment(auto); break
      case 'after_appointment':  result = await processAfterAppointment(auto);  break
      case 'birthday':           result = await processBirthday(auto);          break
      case 'no_visit':           result = await processNoVisit(auto);           break
      case 'no_show':            result = await processNoShow(auto);            break
      case 'new_client':         result = await processNewClient(auto);         break
      case 'review_request':     result = await processReviewRequest(auto);     break
      default: continue
    }

    results.push(result)
    console.log(`[Automation] ${auto.name}: sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`)
  }
  return results
}
