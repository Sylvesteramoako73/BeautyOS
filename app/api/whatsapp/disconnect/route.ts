import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await adminAuth.verifySessionCookie(session) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const base       = process.env.RAILWAY_WHATSAPP_URL
  const session_id = process.env.RAILWAY_WHATSAPP_SESSION ?? 'default'
  if (!base) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const res  = await fetch(`${base}/api/whatsapp/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session_id }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
