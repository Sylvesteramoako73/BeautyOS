'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import type { Automation, AutomationWithStats } from '@/lib/types'

const col = () => adminDb.collection('automations')

export async function getAutomations(): Promise<Automation[]> {
  const snap = await col().orderBy('createdAt').get()
  return snap.docs.map(d => docData(d) as Automation)
}

export async function getAutomationStats(): Promise<AutomationWithStats[]> {
  const automations = await getAutomations()
  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Fetch all logs for this month in one query (single where field)
  const logsSnap = await adminDb.collection('automationLogs')
    .where('createdAt', '>=', monthStart)
    .get()
  const allLogs = logsSnap.docs.map(d => d.data())

  return automations.map(a => {
    const logs   = allLogs.filter(l => l.automationId === a.id)
    const sent   = logs.filter(l => l.status === 'sent').length
    const failed = logs.filter(l => l.status === 'failed').length
    const sorted = logs.sort((x, y) => y.createdAt?.localeCompare(x.createdAt ?? '') ?? 0)
    const last   = sorted[0]?.createdAt ? new Date(sorted[0].createdAt) : null
    return { ...a, runsThisMonth: sent, failedThisMonth: failed, lastTriggered: last }
  })
}

export async function toggleAutomation(id: string): Promise<Automation> {
  const doc = await col().doc(id).get()
  const current = doc.data()!.isActive
  await col().doc(id).update({ isActive: !current, updatedAt: new Date().toISOString() })
  revalidatePath('/automations')
  return docData(await col().doc(id).get()) as Automation
}

export async function createAutomation(data: {
  name: string; description?: string; trigger: string; channel: string
  delayMinutes: number; messageTemplate: string; conditionJson?: string
}): Promise<Automation> {
  const ref = col().doc()
  const now = new Date().toISOString()
  const doc = {
    ...data,
    description: data.description ?? null,
    conditionJson: data.conditionJson ?? '{}',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(doc)
  revalidatePath('/automations')
  return { id: ref.id, ...doc } as Automation
}

export async function updateAutomation(id: string, data: {
  name?: string; description?: string; messageTemplate?: string
  isActive?: boolean; channel?: string; delayMinutes?: number
}): Promise<Automation> {
  await col().doc(id).update({ ...data, updatedAt: new Date().toISOString() })
  revalidatePath('/automations')
  return docData(await col().doc(id).get()) as Automation
}

export async function deleteAutomation(id: string) {
  await col().doc(id).delete()
  revalidatePath('/automations')
}

export async function runAutomationManually(id?: string) {
  const { processAllAutomations } = await import('@/lib/services/automation-engine')
  try {
    const all = await processAllAutomations()
    revalidatePath('/automations')
    return id ? all.filter(r => r.automationId === id) : all
  } catch (err: any) {
    console.error('[runAutomationManually] error:', err?.message ?? err)
    throw new Error(err?.message ?? 'Automation engine failed')
  }
}
