'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export type Role = 'owner' | 'manager' | 'staff'

export type AppUser = {
  uid:       string
  name:      string
  email:     string
  role:      Role
  createdAt: string
}

const col = () => adminDb.collection('users')

export async function getUsers(): Promise<AppUser[]> {
  const snap = await col().get()
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as AppUser))
    .sort((a, b) => {
      const order = { owner: 0, manager: 1, staff: 2 }
      return (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.name.localeCompare(b.name)
    })
}

export async function createUserDoc(uid: string, name: string, email: string): Promise<Role> {
  // Every new signup is an owner of their own salon account
  const role: Role = 'owner'

  await col().doc(uid).set({
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  })

  return role
}

export async function updateUserRole(uid: string, role: Role) {
  const { getSessionUser } = await import('@/lib/auth')
  const caller = await getSessionUser()
  if (!caller || caller.role !== 'owner') throw new Error('Only owners can change roles')
  await col().doc(uid).update({ role })
  revalidatePath('/settings')
}

export async function getUserRole(uid: string): Promise<Role> {
  const doc = await col().doc(uid).get()
  return (doc.data()?.role as Role) ?? 'staff'
}

export async function deleteUserAccount(uid: string) {
  const { getSessionUser } = await import('@/lib/auth')
  const caller = await getSessionUser()
  if (!caller || caller.role !== 'owner') throw new Error('Only owners can delete accounts')
  await Promise.all([
    adminAuth.deleteUser(uid),
    col().doc(uid).delete(),
  ])
  revalidatePath('/settings')
}
