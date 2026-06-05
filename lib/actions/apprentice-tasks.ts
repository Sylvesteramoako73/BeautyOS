'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'
import type { ApprenticeTask } from '@/lib/types'

const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, completed: 2 }

export async function getTasksForApprentice(apprenticeId: string): Promise<ApprenticeTask[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('apprenticeTasks')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs
    .map(d => docData(d) as ApprenticeTask)
    .filter(t => t.apprenticeId === apprenticeId)
    .sort((a, b) =>
      (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0) ||
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    )
}

export async function createTask(data: {
  apprenticeId: string
  title: string
  description?: string
  dueDate?: string | null
  priority: 'low' | 'medium' | 'high'
  assignedBy: string
}): Promise<ApprenticeTask> {
  const tenantId = await getTenantId()
  const ref = adminDb.collection('apprenticeTasks').doc()
  const now = new Date().toISOString()
  const doc = {
    tenantId:     tenantId ?? null,
    apprenticeId: data.apprenticeId,
    title:        data.title.trim(),
    description:  data.description?.trim() || null,
    dueDate:      data.dueDate || null,
    priority:     data.priority,
    status:       'pending' as const,
    assignedBy:   data.assignedBy,
    completedAt:  null,
    createdAt:    now,
    updatedAt:    now,
  }
  await ref.set(doc)
  revalidatePath('/apprentices')
  return { id: ref.id, ...doc }
}

export async function updateTaskStatus(id: string, status: ApprenticeTask['status']): Promise<void> {
  await adminDb.collection('apprenticeTasks').doc(id).update({
    status,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    updatedAt:   new Date().toISOString(),
  })
  revalidatePath('/apprentices')
}

export async function deleteTask(id: string): Promise<void> {
  await adminDb.collection('apprenticeTasks').doc(id).delete()
  revalidatePath('/apprentices')
}
