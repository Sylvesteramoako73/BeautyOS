import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAnalyticsData } from '@/lib/actions/analytics'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period           = (searchParams.get('period') ?? 'week') as 'week' | 'month'
  const activeLocationId = cookies().get('activeLocation')?.value ?? null
  const data             = await getAnalyticsData(period, activeLocationId)
  return NextResponse.json(data)
}
