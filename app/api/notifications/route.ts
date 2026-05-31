import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { getNotifications, markAllRead } from '@/lib/actions/notifications'

export const dynamic = 'force-dynamic'

async function verifySession() {
  const cookie = cookies().get('session')?.value
  if (!cookie) return false
  try { await adminAuth.verifySessionCookie(cookie); return true } catch { return false }
}

export async function GET() {
  if (!await verifySession()) return NextResponse.json([], { status: 401 })
  const notifications = await getNotifications(20)
  return NextResponse.json(notifications)
}

export async function POST() {
  if (!await verifySession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await markAllRead()
  return NextResponse.json({ ok: true })
}
