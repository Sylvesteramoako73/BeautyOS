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
    const role       = (doc.data()?.role as Role) ?? 'staff'
    const email      = decoded.email ?? null
    const locationId = role === 'owner'
      ? null
      : (doc.data()?.locationId as string | null) ?? null

    return {
      uid:      decoded.uid,
      name:     doc.data()?.name ?? decoded.name ?? email?.split('@')[0] ?? 'User',
      email,
      role,
      locationId,
      tenantId: (doc.data()?.tenantId as string | null) ?? null,
    }
  } catch {
    return null
  }
})

// Returns tenantId for the current session — used inside server actions to scope all queries.
export const getTenantId = cache(async (): Promise<string | null> => {
  const user = await getSessionUser()
  return user?.tenantId ?? null
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
