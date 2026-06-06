import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { rateLimit } from '@/lib/rate-limit'

// Called during login to bake role/tenantId/locationId into Firebase custom claims.
// After this, session cookies carry all user data — no Firestore read per page load.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = rateLimit(`claims:${ip}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const { idToken } = await req.json()
    if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const doc = await adminDb.collection('users').doc(decoded.uid).get()

    if (!doc.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const data = doc.data()!
    const role = data.role ?? 'staff'
    const tenantId = data.tenantId ?? null
    const locationId = role === 'owner' ? null : (data.locationId ?? null)

    await adminAuth.setCustomUserClaims(decoded.uid, { role, tenantId, locationId })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[claims] failed to set claims:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
