import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await adminAuth.verifySessionCookie(session) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const base    = process.env.RAILWAY_WHATSAPP_URL
  const session_id = process.env.RAILWAY_WHATSAPP_SESSION ?? 'default'
  if (!base) return NextResponse.json({ status: 'unconfigured' })

  try {
    const res  = await fetch(`${base}/api/whatsapp/status?sessionId=${session_id}`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: 'disconnected', qr: null, phone: null })
  }
}
