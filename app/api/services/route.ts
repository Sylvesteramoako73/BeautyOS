import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServices } from '@/lib/actions/services'

export async function GET() {
  const services = await getServices()
  return NextResponse.json({ services, total: services.length })
}
