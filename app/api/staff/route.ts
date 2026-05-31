import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getStaff } from '@/lib/actions/staff'

export async function GET() {
  const staff = await getStaff()
  return NextResponse.json({ staff, total: staff.length })
}
