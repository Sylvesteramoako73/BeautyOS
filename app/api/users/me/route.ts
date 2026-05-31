import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function PATCH(req: NextRequest) {
  const sessionCookie = cookies().get('session')?.value
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie)
    const { name } = await req.json()
    if (name) {
      await adminDb.collection('users').doc(decoded.uid).update({ name })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
