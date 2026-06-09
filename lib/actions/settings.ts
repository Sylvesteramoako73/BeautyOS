'use server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'

export type DayHours = { open: string; close: string; closed: boolean }
export type WorkingHours = {
  monday: DayHours; tuesday: DayHours; wednesday: DayHours;
  thursday: DayHours; friday: DayHours; saturday: DayHours; sunday: DayHours;
}

export type SalonSettings = {
  salonName:    string
  tagline:      string
  phone:        string
  address:      string
  email:        string
  depositPct:   number
  workingHours: WorkingHours
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday:    { open: '08:00', close: '18:00', closed: false },
  tuesday:   { open: '08:00', close: '18:00', closed: false },
  wednesday: { open: '08:00', close: '18:00', closed: false },
  thursday:  { open: '08:00', close: '18:00', closed: false },
  friday:    { open: '08:00', close: '18:00', closed: false },
  saturday:  { open: '08:00', close: '16:00', closed: false },
  sunday:    { open: '08:00', close: '16:00', closed: true  },
}

const DEFAULTS: SalonSettings = {
  salonName:    'Luxe Beauty Studio',
  tagline:      'Where Beauty Meets Excellence',
  phone:        '',
  address:      '',
  email:        '',
  depositPct:   30,
  workingHours: DEFAULT_WORKING_HOURS,
}

export async function getSalonSettings(): Promise<SalonSettings> {
  const tenantId = await getTenantId()
  if (!tenantId) return DEFAULTS
  const doc = await adminDb.collection('settings').doc(tenantId).get()
  return { ...DEFAULTS, ...(doc.data() ?? {}) }
}

export async function updateSalonSettings(data: Partial<SalonSettings>): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return
  await adminDb.collection('settings').doc(tenantId).set(data, { merge: true })
  revalidatePath('/settings')
}
