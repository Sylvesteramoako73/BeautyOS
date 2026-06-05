'use server'
import { adminDb } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'
import { getStaff } from './staff'

export type PayrollEntry = {
  id: string
  name: string
  role: string
  phone: string | null
  commissionRate: number
  appointmentsCount: number
  revenue: number
  commission: number
}

export async function getPayrollData(startDate: string, endDate: string): Promise<PayrollEntry[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const staff = await getStaff()

  // Fetch by tenant then filter date range in memory — avoids composite index
  const snap = await adminDb.collection('appointments')
    .where('tenantId', '==', tenantId)
    .get()

  const appointments = snap.docs.map(d => d.data()).filter(a => a.date >= startDate && a.date <= endDate)

  return staff.map(member => {
    const myApts    = appointments.filter(a => a.staffId === member.id && a.paymentStatus === 'paid')
    const revenue   = myApts.reduce((s, a) => s + (a.totalPrice ?? 0), 0)
    const commission = Math.round(revenue * (member.commissionRate / 100))
    return {
      id:                member.id,
      name:              member.name,
      role:              member.role,
      phone:             member.phone,
      commissionRate:    member.commissionRate,
      appointmentsCount: myApts.length,
      revenue,
      commission,
    }
  }).sort((a, b) => b.commission - a.commission)
}
