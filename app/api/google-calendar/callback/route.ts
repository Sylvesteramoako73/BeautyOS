import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { exchangeCode } from '@/lib/services/google-calendar'

export async function GET(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  try {
    const decoded = await adminAuth.verifySessionCookie(session)
    const code    = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.redirect(new URL('/settings?gcal=error', req.url))

    const tokens = await exchangeCode(code)

    // Store tokens in Firestore (encrypted in production — for now plain)
    await adminDb.collection('googleCalendarTokens').doc(decoded.uid).set({
      ...tokens,
      uid:       decoded.uid,
      updatedAt: new Date().toISOString(),
      // Default to primary calendar — user can change in settings
      calendarId: 'primary',
    })

    return NextResponse.redirect(new URL('/settings?gcal=connected', req.url))
  } catch (err) {
    return NextResponse.redirect(new URL('/settings?gcal=error', req.url))
  }
}
