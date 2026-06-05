'use server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'

export type SalonSettings = {
  salonName: string
  tagline: string
  phone: string
  address: string
  email: string
}

const DEFAULTS: SalonSettings = {
  salonName: 'Luxe Beauty Studio',
  tagline:   'Where Beauty Meets Excellence',
  phone:     '',
  address:   '',
  email:     '',
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
