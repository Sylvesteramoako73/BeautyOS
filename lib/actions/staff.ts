'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { StaffSchema } from '@/lib/validation'
import { getTenantId } from '@/lib/auth'
import type { Staff, StaffWithStats } from '@/lib/types'

export async function getStaff(locationId?: string | null): Promise<Staff[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('staff')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs
    .map(d => docData(d) as Staff)
    .filter(s => s.isActive)
    .filter(s => !locationId || !s.locationId || s.locationId === locationId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getStaffWithStats(locationId?: string | null): Promise<StaffWithStats[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const today      = new Date().toISOString().split('T')[0]
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const staff = await getStaff(locationId)

  // Fetch all appointments for tenant then filter in memory — avoids compound where clauses
  const apptSnap = await adminDb.collection('appointments')
    .where('tenantId', '==', tenantId)
    .get()

  const allApts   = apptSnap.docs.map(d => d.data())
  const todayApts = allApts.filter(a => a.date === today)
  const monthApts = allApts.filter(a => a.date >= monthStart)

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
  await adminDb.collection('staff').doc(id).update({ isAvailable, updatedAt: new Date().toISOString() })
  revalidatePath('/staff')
  revalidatePath('/')
}

export async function createStaff(data: {
  name: string; role: string; phone?: string; email?: string
  specialties?: string; commissionRate?: number; systemRole?: string
  locationId?: string | null
}): Promise<Staff> {
  const tenantId = await getTenantId()
  const parsed = StaffSchema.parse({ ...data, commissionRate: data.commissionRate ?? 30 })
  let locationName: string | null = null
  if (parsed.locationId) {
    const locDoc = await adminDb.collection('locations').doc(parsed.locationId).get()
    locationName = locDoc.data()?.name ?? null
  }
  const ref = adminDb.collection('staff').doc()
  const now = new Date().toISOString()
  const doc = {
    ...parsed,
    tenantId: tenantId ?? null,
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
  await adminDb.collection('staff').doc(id).update({
    ...parsed,
    ...(isActive !== undefined && { isActive }),
    ...(workingHours !== undefined && { workingHours }),
    ...(locationId !== undefined && { locationId, locationName }),
    updatedAt: new Date().toISOString(),
  })

  // Sync locationId to the user account that has the same email, so branch-lock
  // takes effect immediately when a manager/staff logs in next time.
  if (locationId !== undefined) {
    const staffDoc = await adminDb.collection('staff').doc(id).get()
    const staffEmail = staffDoc.data()?.email
    if (staffEmail) {
      const userSnap = await adminDb.collection('users')
        .where('email', '==', staffEmail)
        .limit(1)
        .get()
      if (!userSnap.empty) {
        await userSnap.docs[0].ref.update({ locationId: locationId ?? null })
      }
    }
  }

  revalidatePath('/staff')
  const doc = await adminDb.collection('staff').doc(id).get()
  return docData(doc) as Staff
}

export async function getStaffAppointmentsForReport(staffId: string, startDate: string, endDate: string) {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('appointments')
    .where('tenantId', '==', tenantId)
    .get()

  return snap.docs
    .map(d => d.data())
    .filter(data => data.staffId === staffId && data.date >= startDate && data.date <= endDate)
    .map(data => ({
      date:       data.date as string,
      clientName: data.clientName as string,
      services:   (data.services ?? []).map((s: any) => s.name).join(', ') as string,
      totalPrice: data.totalPrice as number,
      status:     data.status as string,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}
