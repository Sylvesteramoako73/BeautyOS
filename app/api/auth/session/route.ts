import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'
import { createUserDoc } from '@/lib/actions/users'
import { rateLimit } from '@/lib/rate-limit'

const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000 // 5 days

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = rateLimit(`login:${ip}`, 10, 60_000) // 10 attempts per minute per IP
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const { idToken, isNewUser } = await req.json()
    if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

    const decoded = await adminAuth.verifyIdToken(idToken)

    // Create Firestore user doc on first sign-up
    if (isNewUser) {
      const existing = await adminDb.collection('users').doc(decoded.uid).get()
      if (!existing.exists) {
        await createUserDoc(
          decoded.uid,
          decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
          decoded.email ?? ''
        )
      }
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION })

    const response = NextResponse.json({ status: 'ok' })
    response.cookies.set('session', sessionCookie, {
      maxAge:   SESSION_DURATION / 1000,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
      sameSite: 'lax',
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  // Called by the dashboard layout when the session cookie exists but is invalid/expired.
  // Clears the stale cookie so middleware won't redirect-loop back to the dashboard.
  const res = NextResponse.redirect(new URL('/login', req.url))
  res.cookies.set('session', '', { maxAge: 0, path: '/' })
  return res
}

export async function DELETE() {
  cookies().set('session', '', { maxAge: 0, path: '/' })
  return NextResponse.json({ status: 'ok' })
}
