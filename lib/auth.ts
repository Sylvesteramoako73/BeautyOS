import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { Role } from '@/lib/actions/users'

// cache() deduplicates this across a single request — layout + requireRole share one Firestore read
export const getSessionUser = cache(async () => {
  const sessionCookie = cookies().get('session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const doc     = await adminDb.collection('users').doc(decoded.uid).get()
    return {
      uid:   decoded.uid,
      name:  doc.data()?.name ?? decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
      email: decoded.email ?? null,
      role:  (doc.data()?.role as Role) ?? 'staff',
    }
  } catch {
    return null
  }
})

export async function requireRole(...allowed: Role[]) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!allowed.includes(user.role)) redirect('/')
  return user
}
