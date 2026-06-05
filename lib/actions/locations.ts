'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { LocationSchema } from '@/lib/validation'
import { getTenantId } from '@/lib/auth'

export type Location = {
  id: string
  name: string
  address: string
  phone: string
  isActive: boolean
  createdAt: string
}

export async function getLocations(): Promise<Location[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('locations')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs.map(d => docData(d) as Location).filter(l => l.isActive).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createLocation(data: { name: string; address: string; phone: string }): Promise<Location> {
  const tenantId = await getTenantId()
  const parsed = LocationSchema.parse(data)
  const ref = adminDb.collection('locations').doc()
  const now = new Date().toISOString()
  const doc = { ...parsed, tenantId: tenantId ?? null, isActive: true, createdAt: now }
  await ref.set(doc)
  revalidatePath('/locations')
  return { id: ref.id, ...doc }
}

export async function updateLocation(id: string, data: { name?: string; address?: string; phone?: string }) {
  const parsed = LocationSchema.partial().parse(data)
  await adminDb.collection('locations').doc(id).update(parsed)
  revalidatePath('/locations')
}

export async function deleteLocation(id: string) {
  await adminDb.collection('locations').doc(id).update({ isActive: false })
  revalidatePath('/locations')
}

export type LocationStats = Location & {
  staffCount: number
  monthRevenue: number
  monthBookings: number
  todayBookings: number
}

export async function getLocationStats(): Promise<LocationStats[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const now        = new Date()
  const today      = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const [locations, staffSnap, apptSnap] = await Promise.all([
    getLocations(),
    adminDb.collection('staff')
      .where('tenantId', '==', tenantId)
      .get(),
    adminDb.collection('appointments')
      .where('tenantId', '==', tenantId)
      .get(),
  ])

  const staff     = staffSnap.docs.map(d => d.data()).filter((s: any) => s.isActive)
  const allApts   = apptSnap.docs.map(d => d.data())
  const monthApts = allApts.filter(a => a.date >= monthStart)
  const todayApts = allApts.filter(a => a.date === today)

  return locations.map(loc => ({
    ...loc,
    staffCount:    staff.filter(s => s.locationId === loc.id).length,
    monthRevenue:  monthApts.filter(a => a.locationId === loc.id && a.paymentStatus === 'paid').reduce((s, a) => s + (a.totalPrice ?? 0), 0),
    monthBookings: monthApts.filter(a => a.locationId === loc.id && a.status !== 'cancelled').length,
    todayBookings: todayApts.filter(a => a.locationId === loc.id).length,
  }))
}
