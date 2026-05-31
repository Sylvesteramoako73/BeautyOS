import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { getUsers, getUserRole } from '@/lib/actions/users'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessionCookie = cookies().get('session')?.value
  if (!sessionCookie) return NextResponse.json([], { status: 401 })

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie)
    const role    = await getUserRole(decoded.uid)
    if (role !== 'owner') return NextResponse.json([], { status: 403 })

    const users = await getUsers()
    return NextResponse.json(users)
  } catch {
    return NextResponse.json([], { status: 401 })
  }
}
