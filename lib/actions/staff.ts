'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { StaffSchema } from '@/lib/validation'
import type { Staff, StaffWithStats } from '@/lib/types'

const col = () => adminDb.collection('staff')

export async function getStaff(): Promise<Staff[]> {
  const snap = await col().where('isActive', '==', true).get()
  return snap.docs.map(d => docData(d) as Staff).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getStaffWithStats(): Promise<StaffWithStats[]> {
  const today      = new Date().toISOString().split('T')[0]
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const staff = await getStaff()

  // Fetch appointments in bulk by date — avoids compound where clauses
  const [todaySnap, monthSnap] = await Promise.all([
    adminDb.collection('appointments').where('date', '==', today).get(),
    adminDb.collection('appointments').where('date', '>=', monthStart).get(),
  ])

  const todayApts = todaySnap.docs.map(d => d.data())
  const monthApts = monthSnap.docs.map(d => d.data())

  return staff.map(member => {
    const myToday = todayApts.filter(a => a.staffId === member.id)
    const myMonth = monthApts.filter(a => a.staffId === member.id && a.paymentStatus === 'paid')
    const monthRevenue  = myMonth.reduce((s, a) => s + (a.totalPrice ?? 0), 0)
    const monthEarnings = Math.round(monthRevenue * (member.commissionRate / 100))
    return {
      ...member,
      todayBookings:  myToday.length,
      completedToday: myToday.filter(a => a.status === 'completed').length,
      monthlyEarnings: monthEarnings,
    }
  })
}

export async function updateStaffAvailability(id: string, isAvailable: boolean) {
  await col().doc(id).update({ isAvailable, updatedAt: new Date().toISOString() })
  revalidatePath('/staff')
  revalidatePath('/')
}

export async function createStaff(data: {
  name: string; role: string; phone?: string; email?: string
  specialties?: string; commissionRate?: number; systemRole?: string
  locationId?: string | null
}): Promise<Staff> {
  const parsed = StaffSchema.parse({ ...data, commissionRate: data.commissionRate ?? 30 })
  let locationName: string | null = null
  if (parsed.locationId) {
    const locDoc = await adminDb.collection('locations').doc(parsed.locationId).get()
    locationName = locDoc.data()?.name ?? null
  }
  const ref = col().doc()
  const now = new Date().toISOString()
  const doc = {
    ...parsed,
    phone: data.phone ?? null,
    email: data.email ?? null,
    specialties: data.specialties ?? '',
    commissionRate: data.commissionRate ?? 30,
    systemRole: data.systemRole ?? 'staff',
    locationId: parsed.locationId ?? null,
    locationName,
    rating: 5.0,
    isActive: true,
    isAvailable: true,
    color: '#E5E7EB',
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(doc)
  revalidatePath('/staff')
  return { id: ref.id, ...doc } as Staff
}

export async function updateStaff(id: string, data: {
  name?: string; role?: string; phone?: string
  specialties?: string; commissionRate?: number; isActive?: boolean; systemRole?: string
  workingHours?: Record<string, unknown>; locationId?: string | null
}): Promise<Staff> {
  const { isActive, workingHours, locationId, ...rest } = data
  const parsed = StaffSchema.partial().parse(rest)
  let locationName: string | null | undefined = undefined
  if (locationId !== undefined) {
    locationName = null
    if (locationId) {
      const locDoc = await adminDb.collection('locations').doc(locationId).get()
      locationName = locDoc.data()?.name ?? null
    }
  }
  await col().doc(id).update({
    ...parsed,
    ...(isActive !== undefined && { isActive }),
    ...(workingHours !== undefined && { workingHours }),
    ...(locationId !== undefined && { locationId, locationName }),
    updatedAt: new Date().toISOString(),
  })
  revalidatePath('/staff')
  const doc = await col().doc(id).get()
  return docData(doc) as Staff
}

export async function getStaffAppointmentsForReport(staffId: string, startDate: string, endDate: string) {
  const snap = await adminDb.collection('appointments')
    .where('staffId', '==', staffId)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get()

  return snap.docs
    .map(d => {
      const data = d.data()
      return {
        date:       data.date as string,
        clientName: data.clientName as string,
        services:   (data.services ?? []).map((s: any) => s.name).join(', ') as string,
        totalPrice: data.totalPrice as number,
        status:     data.status as string,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
