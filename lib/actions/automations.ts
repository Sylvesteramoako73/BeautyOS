'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'
import type { Automation, AutomationWithStats } from '@/lib/types'

export async function getAutomations(): Promise<Automation[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('automations')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs.map(d => docData(d) as Automation).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getAutomationStats(): Promise<AutomationWithStats[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const automations = await getAutomations()
  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Fetch all logs for tenant then filter in memory — avoids compound where clauses
  const logsSnap = await adminDb.collection('automationLogs')
    .where('tenantId', '==', tenantId)
    .get()
  const allLogs = logsSnap.docs.map(d => d.data()).filter(l => l.createdAt >= monthStart)

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
  const doc = await adminDb.collection('automations').doc(id).get()
  const current = doc.data()!.isActive
  await adminDb.collection('automations').doc(id).update({ isActive: !current, updatedAt: new Date().toISOString() })
  revalidatePath('/automations')
  return docData(await adminDb.collection('automations').doc(id).get()) as Automation
}

export async function createAutomation(data: {
  name: string; description?: string; trigger: string; channel: string
  delayMinutes: number; messageTemplate: string; conditionJson?: string
}): Promise<Automation> {
  const tenantId = await getTenantId()
  const ref = adminDb.collection('automations').doc()
  const now = new Date().toISOString()
  const doc = {
    ...data,
    tenantId: tenantId ?? null,
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
  await adminDb.collection('automations').doc(id).update({ ...data, updatedAt: new Date().toISOString() })
  revalidatePath('/automations')
  return docData(await adminDb.collection('automations').doc(id).get()) as Automation
}

export async function deleteAutomation(id: string) {
  await adminDb.collection('automations').doc(id).delete()
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
