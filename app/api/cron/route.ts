import { NextResponse } from 'next/server'
import { processAllAutomations } from '@/lib/services/automation-engine'

// Called by an external cron service (e.g. Vercel Cron, EasyCron) every 15 min.
// Protect with a secret header:  Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const auth   = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? 'dev-cron-secret'

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start   = Date.now()
  const results = await processAllAutomations()
  const elapsed = Date.now() - start

  const summary = {
    ran:     results.length,
    sent:    results.reduce((s, r) => s + r.sent, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
    failed:  results.reduce((s, r) => s + r.failed, 0),
    elapsedMs: elapsed,
    results,
  }

  console.log('[CRON] Automation run:', summary)
  return NextResponse.json(summary)
}

// Also expose as POST for manual triggers from the dashboard
export async function POST(request: Request) {
  return GET(request)
}
