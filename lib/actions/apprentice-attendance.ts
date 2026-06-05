'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'
import type { AttendanceRecord } from '@/lib/types'

export async function getAttendanceForApprentice(apprenticeId: string): Promise<AttendanceRecord[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('apprenticeAttendance')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs
    .map(d => docData(d) as AttendanceRecord)
    .filter(r => r.apprenticeId === apprenticeId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function logAttendance(data: {
  apprenticeId: string
  date: string
  status: 'present' | 'absent' | 'late'
  notes?: string
  recordedBy: string
}): Promise<AttendanceRecord> {
  const tenantId = await getTenantId()
  const allSnap = await adminDb.collection('apprenticeAttendance')
    .where('tenantId', '==', tenantId ?? '')
    .get()
  const existing = { docs: allSnap.docs.filter(d => d.data().apprenticeId === data.apprenticeId && d.data().date === data.date), empty: false as boolean }
  existing.empty = existing.docs.length === 0

  const now = new Date().toISOString()
  const payload = {
    tenantId:     tenantId ?? null,
    apprenticeId: data.apprenticeId,
    date:         data.date,
    status:       data.status,
    notes:        data.notes?.trim() || null,
    recordedBy:   data.recordedBy,
  }

  if (!existing.empty) {
    await existing.docs[0].ref.update({ ...payload, updatedAt: now })
    const updated = await existing.docs[0].ref.get()
    revalidatePath('/apprentices')
    return docData(updated) as AttendanceRecord
  }

  const ref = adminDb.collection('apprenticeAttendance').doc()
  await ref.set({ ...payload, createdAt: now })
  revalidatePath('/apprentices')
  return { id: ref.id, ...payload, createdAt: now }
}
