'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData, FieldValue } from '@/lib/firebase-admin'
import { ApprenticeSchema } from '@/lib/validation'
import { getTenantId } from '@/lib/auth'
import type { Apprentice, ProgressNote, SkillSignOff } from '@/lib/types'

export async function getApprentices(locationId?: string | null): Promise<Apprentice[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('apprentices').where('tenantId', '==', tenantId).get()
  return snap.docs
    .map(d => docData(d) as Apprentice)
    .filter(a => !locationId || a.locationId === locationId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createApprentice(data: {
  name: string; phone?: string; email?: string
  mentorId?: string | null; locationId?: string | null
  stage: string; startDate: string
  expectedGraduationDate?: string | null; programDurationMonths?: number | null
  specialtiesLearning?: string; stipend?: number | null; notes?: string
}): Promise<Apprentice> {
  const tenantId = await getTenantId()
  const parsed = ApprenticeSchema.parse({
    ...data,
    stage: data.stage as 'beginner' | 'intermediate' | 'advanced',
  })
  let mentorName: string | null = null
  if (parsed.mentorId) {
    const staffDoc = await adminDb.collection('staff').doc(parsed.mentorId).get()
    mentorName = staffDoc.data()?.name ?? null
  }
  let locationName: string | null = null
  if (parsed.locationId) {
    const locDoc = await adminDb.collection('locations').doc(parsed.locationId).get()
    locationName = locDoc.data()?.name ?? null
  }
  const skills = (data.specialtiesLearning ?? '').split(',').filter(s => s.trim())
  const skillSignOffs: SkillSignOff[] = skills.map(s => ({
    skill: s.trim(),
    status: 'not_started',
    signedOffBy: null,
    signedOffAt: null,
  }))
  const ref = adminDb.collection('apprentices').doc()
  const now = new Date().toISOString()
  const doc = {
    name: parsed.name,
    phone: data.phone || null,
    email: data.email || null,
    tenantId: tenantId ?? null,
    mentorId: parsed.mentorId ?? null,
    mentorName,
    locationId: parsed.locationId ?? null,
    locationName,
    stage: parsed.stage,
    startDate: parsed.startDate,
    expectedGraduationDate: parsed.expectedGraduationDate || null,
    programDurationMonths: data.programDurationMonths ?? null,
    specialtiesLearning: data.specialtiesLearning ?? '',
    skillSignOffs,
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
  mentorId?: string | null; locationId?: string | null; stage?: string; startDate?: string
  expectedGraduationDate?: string | null; programDurationMonths?: number | null
  specialtiesLearning?: string; stipend?: number | null; notes?: string; status?: string
}): Promise<Apprentice> {
  const { status, mentorId, locationId, programDurationMonths, specialtiesLearning, ...rest } = data
  const parsed = ApprenticeSchema.partial().parse(rest)
  let mentorName: string | null | undefined = undefined
  if (mentorId !== undefined) {
    mentorName = null
    if (mentorId) {
      const staffDoc = await adminDb.collection('staff').doc(mentorId).get()
      mentorName = staffDoc.data()?.name ?? null
    }
  }
  let locationName: string | null | undefined = undefined
  if (locationId !== undefined) {
    locationName = null
    if (locationId) {
      const locDoc = await adminDb.collection('locations').doc(locationId).get()
      locationName = locDoc.data()?.name ?? null
    }
  }

  const updates: Record<string, unknown> = {
    ...parsed,
    updatedAt: new Date().toISOString(),
  }
  if (status !== undefined)               updates.status = status
  if (mentorId !== undefined)             { updates.mentorId = mentorId; updates.mentorName = mentorName }
  if (locationId !== undefined)           { updates.locationId = locationId; updates.locationName = locationName }
  if (programDurationMonths !== undefined) updates.programDurationMonths = programDurationMonths
  if (specialtiesLearning !== undefined) {
    updates.specialtiesLearning = specialtiesLearning
    // Sync skillSignOffs: add new skills, keep existing sign-off data
    const existing = (await adminDb.collection('apprentices').doc(id).get()).data()?.skillSignOffs as SkillSignOff[] ?? []
    const newSkills = specialtiesLearning.split(',').filter(s => s.trim())
    updates.skillSignOffs = newSkills.map(s => {
      const found = existing.find(e => e.skill === s.trim())
      return found ?? { skill: s.trim(), status: 'not_started', signedOffBy: null, signedOffAt: null }
    })
  }

  await adminDb.collection('apprentices').doc(id).update(updates)
  revalidatePath('/apprentices')
  const doc = await adminDb.collection('apprentices').doc(id).get()
  return docData(doc) as Apprentice
}

export async function addProgressNote(
  apprenticeId: string,
  note: { note: string; rating: number; addedBy: string }
): Promise<void> {
  const newNote: ProgressNote = {
    id:      Date.now().toString(),
    date:    new Date().toISOString().split('T')[0],
    note:    note.note,
    rating:  note.rating,
    addedBy: note.addedBy,
  }
  await adminDb.collection('apprentices').doc(apprenticeId).update({
    progressNotes: FieldValue.arrayUnion(newNote),
    updatedAt: new Date().toISOString(),
  })
  revalidatePath('/apprentices')
}

export async function updateSkillSignOff(
  apprenticeId: string,
  skill: string,
  status: SkillSignOff['status'],
  signedOffBy: string
): Promise<void> {
  const doc = await adminDb.collection('apprentices').doc(apprenticeId).get()
  const existing: SkillSignOff[] = doc.data()?.skillSignOffs ?? []
  const idx = existing.findIndex(s => s.skill === skill)
  const updated: SkillSignOff = {
    skill,
    status,
    signedOffBy: status === 'signed_off' ? signedOffBy : null,
    signedOffAt: status === 'signed_off' ? new Date().toISOString().split('T')[0] : null,
  }
  if (idx >= 0) existing[idx] = updated
  else existing.push(updated)

  await adminDb.collection('apprentices').doc(apprenticeId).update({
    skillSignOffs: existing,
    updatedAt: new Date().toISOString(),
  })
  revalidatePath('/apprentices')
}
