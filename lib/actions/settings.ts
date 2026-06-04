'use server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'

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

const ref = () => adminDb.collection('settings').doc('salon')

export async function getSalonSettings(): Promise<SalonSettings> {
  const doc = await ref().get()
  return { ...DEFAULTS, ...(doc.data() ?? {}) }
}

export async function updateSalonSettings(data: Partial<SalonSettings>): Promise<void> {
  await ref().set(data, { merge: true })
  revalidatePath('/settings')
}
