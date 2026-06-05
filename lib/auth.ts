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
    const role    = (doc.data()?.role as Role) ?? 'staff'
    const email   = decoded.email ?? null

    // For non-owners, look up their staff record to find which branch they're assigned to.
    // This locks managers/staff to their branch — they cannot see other branches' data.
    let locationId: string | null = null
    if (role !== 'owner' && email) {
      const staffSnap = await adminDb.collection('staff')
        .where('email', '==', email)
        .limit(1)
        .get()
      if (!staffSnap.empty) {
        locationId = staffSnap.docs[0].data().locationId ?? null
      }
    }

    return {
      uid:        decoded.uid,
      name:       doc.data()?.name ?? decoded.name ?? email?.split('@')[0] ?? 'User',
      email,
      role,
      locationId, // null = not branch-locked (sees all / uses cookie)
    }
  } catch {
    return null
  }
})

// Returns the effective location to filter by:
// - Branch-locked users (manager/staff with locationId) → their assigned branch
// - Owners → whatever is in the activeLocation cookie (switcher-selected)
export async function getEffectiveLocationId(): Promise<string | null> {
  const user = await getSessionUser()
  if (!user) return null
  if (user.locationId) return user.locationId
  return cookies().get('activeLocation')?.value ?? null
}

export async function requireRole(...allowed: Role[]) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!allowed.includes(user.role)) redirect('/')
  return user
}
