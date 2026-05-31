import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getDashboardStats, getTodayAppointments } from '@/lib/actions/appointments'
import { getStaffWithStats } from '@/lib/actions/staff'

export async function GET() {
  const [stats, todayAppointments, staffActivity] = await Promise.all([
    getDashboardStats(),
    getTodayAppointments(),
    getStaffWithStats(),
  ])
  return NextResponse.json({ stats, todayAppointments, staffActivity })
}
