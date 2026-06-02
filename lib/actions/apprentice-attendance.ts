'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import type { AttendanceRecord } from '@/lib/types'

const col = () => adminDb.collection('apprenticeAttendance')

export async function getAttendanceForApprentice(apprenticeId: string): Promise<AttendanceRecord[]> {
  const snap = await col().where('apprenticeId', '==', apprenticeId).get()
  return snap.docs
    .map(d => docData(d) as AttendanceRecord)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function logAttendance(data: {
  apprenticeId: string
  date: string
  status: 'present' | 'absent' | 'late'
  notes?: string
  recordedBy: string
}): Promise<AttendanceRecord> {
  const existing = await col()
    .where('apprenticeId', '==', data.apprenticeId)
    .where('date', '==', data.date)
    .get()

  const now = new Date().toISOString()
  const payload = {
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

  const ref = col().doc()
  await ref.set({ ...payload, createdAt: now })
  revalidatePath('/apprentices')
  return { id: ref.id, ...payload, createdAt: now }
}
