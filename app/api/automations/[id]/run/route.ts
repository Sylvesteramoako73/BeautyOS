import { NextResponse } from 'next/server'
import { runAutomationManually } from '@/lib/actions/automations'

export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const results = await runAutomationManually(params.id)
  const mine    = results.find(r => r.automationId === params.id)
  return NextResponse.json({ ok: true, result: mine ?? { sent: 0, skipped: 0, failed: 0 } })
}
