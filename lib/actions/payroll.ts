'use server'
import { adminDb } from '@/lib/firebase-admin'
import { getStaff } from './staff'
import { formatCurrency } from '@/lib/utils'

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
  const staff = await getStaff()

  // Range on same field — no composite index needed
  const snap = await adminDb.collection('appointments')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get()

  const appointments = snap.docs.map(d => d.data())

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
