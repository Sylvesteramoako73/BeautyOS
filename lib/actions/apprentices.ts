'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData, FieldValue } from '@/lib/firebase-admin'
import { ApprenticeSchema } from '@/lib/validation'
import type { Apprentice, ProgressNote } from '@/lib/types'

const col = () => adminDb.collection('apprentices')

export async function getApprentices(): Promise<Apprentice[]> {
  const snap = await col().get()
  return snap.docs.map(d => docData(d) as Apprentice).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createApprentice(data: {
  name: string; phone?: string; email?: string
  mentorId?: string | null; stage: string; startDate: string
  expectedGraduationDate?: string | null; specialtiesLearning?: string
  stipend?: number | null; notes?: string
}): Promise<Apprentice> {
  const parsed = ApprenticeSchema.parse({
    ...data,
    stage: data.stage as 'beginner' | 'intermediate' | 'advanced',
  })
  let mentorName: string | null = null
  if (parsed.mentorId) {
    const staffDoc = await adminDb.collection('staff').doc(parsed.mentorId).get()
    mentorName = staffDoc.data()?.name ?? null
  }
  const ref = col().doc()
  const now = new Date().toISOString()
  const doc = {
    name: parsed.name,
    phone: data.phone || null,
    email: data.email || null,
    mentorId: parsed.mentorId ?? null,
    mentorName,
    stage: parsed.stage,
    startDate: parsed.startDate,
    expectedGraduationDate: parsed.expectedGraduationDate || null,
    specialtiesLearning: data.specialtiesLearning ?? '',
    stipend: data.stipend ?? null,
    notes: data.notes ?? null,
    status: 'active' as const,
    progressNotes: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(doc)
  revalidatePath('/apprentices')
  return { id: ref.id, ...doc }
}

export async function updateApprentice(id: string, data: {
  name?: string; phone?: string; email?: string
  mentorId?: string | null; stage?: string; startDate?: string
  expectedGraduationDate?: string | null; specialtiesLearning?: string
  stipend?: number | null; notes?: string; status?: string
}): Promise<Apprentice> {
  const { status, mentorId, ...rest } = data
  const parsed = ApprenticeSchema.partial().parse(rest)
  let mentorName: string | null | undefined = undefined
  if (mentorId !== undefined) {
    mentorName = null
    if (mentorId) {
      const staffDoc = await adminDb.collection('staff').doc(mentorId).get()
      mentorName = staffDoc.data()?.name ?? null
    }
  }
  const updates: Record<string, unknown> = {
    ...parsed,
    updatedAt: new Date().toISOString(),
  }
  if (status !== undefined) updates.status = status
  if (mentorId !== undefined) {
    updates.mentorId = mentorId
    updates.mentorName = mentorName
  }
  await col().doc(id).update(updates)
  revalidatePath('/apprentices')
  const doc = await col().doc(id).get()
  return docData(doc) as Apprentice
}

export async function addProgressNote(
  apprenticeId: string,
  note: { note: string; rating: number; addedBy: string }
): Promise<void> {
  const newNote: ProgressNote = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    note: note.note,
    rating: note.rating,
    addedBy: note.addedBy,
  }
  await col().doc(apprenticeId).update({
    progressNotes: FieldValue.arrayUnion(newNote),
    updatedAt: new Date().toISOString(),
  })
  revalidatePath('/apprentices')
}
