import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET() {
  const sessionCookie = cookies().get('session')?.value
  if (!sessionCookie) return NextResponse.json({ name: null, email: null, role: null }, { status: 401 })

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie)
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const role    = userDoc.data()?.role ?? 'staff'
    const name    = userDoc.data()?.name ?? decoded.name ?? decoded.email?.split('@')[0] ?? 'User'

    return NextResponse.json({ uid: decoded.uid, name, email: decoded.email ?? null, role })
  } catch {
    return NextResponse.json({ name: null, email: null, role: null }, { status: 401 })
  }
}
