import { NextResponse } from 'next/server'
import { getAutomationStats, createAutomation } from '@/lib/actions/automations'

export async function GET() {
  const automations = await getAutomationStats()
  return NextResponse.json(automations)
}

export async function POST(request: Request) {
  const body = await request.json()
  const automation = await createAutomation(body)
  return NextResponse.json(automation, { status: 201 })
}
