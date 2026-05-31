'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { ClientSchema } from '@/lib/validation'
import type { Client } from '@/lib/types'

const col = () => adminDb.collection('clients')

export async function getClients(): Promise<Client[]> {
  const snap = await col().where('isActive', '==', true).get()
  return snap.docs.map(d => docData(d) as Client).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getClient(id: string): Promise<Client | null> {
  const doc = await col().doc(id).get()
  if (!doc.exists) return null
  return docData(doc) as Client
}

export async function getClientWithHistory(id: string) {
  const [clientDoc, apptSnap] = await Promise.all([
    col().doc(id).get(),
    adminDb.collection('appointments').where('clientId', '==', id).get(),
  ])
  if (!clientDoc.exists) return null
  const client       = docData(clientDoc) as Client
  const appointments = apptSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
  return { ...client, appointments }
}

export async function createClient(data: {
  name: string; phone: string; email?: string; notes?: string; tags?: string; dateOfBirth?: string
}): Promise<Client> {
  const parsed = ClientSchema.parse(data)
  const ref = col().doc()
  const now = new Date().toISOString()
  const { dateOfBirth, ...rest } = parsed
  const doc = {
    ...rest,
    email: data.email ?? null,
    notes: data.notes ?? null,
    tags: data.tags ?? '',
    dateOfBirth: dateOfBirth || null,
    loyaltyPoints: 0,
    loyaltyTier: 'Bronze',
    totalVisits: 0,
    totalSpent: 0,
    isActive: true,
    lastVisitAt: null,
    address: null,
    preferredStaff: null,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(doc)
  revalidatePath('/clients')
  return { id: ref.id, ...doc } as Client
}

export async function updateClient(id: string, data: {
  name?: string; phone?: string; email?: string; notes?: string; tags?: string; loyaltyTier?: string
}): Promise<Client> {
  const parsed = ClientSchema.partial().parse(data)
  await col().doc(id).update({ ...parsed, updatedAt: new Date().toISOString() })
  revalidatePath('/clients')
  const doc = await col().doc(id).get()
  return docData(doc) as Client
}

export async function deleteClient(id: string) {
  await col().doc(id).update({ isActive: false, updatedAt: new Date().toISOString() })
  revalidatePath('/clients')
}

export async function addLoyaltyPoints(clientId: string, points: number) {
  const doc  = await col().doc(clientId).get()
  const data = doc.data()
  if (!data) return

  const newPoints = (data.loyaltyPoints ?? 0) + points
  const newTier   = calculateTier(newPoints, data.totalSpent ?? 0)
  const tierChanged = newTier !== data.loyaltyTier

  await col().doc(clientId).update({
    loyaltyPoints: newPoints,
    loyaltyTier:   newTier,
    updatedAt:     new Date().toISOString(),
  })

  if (tierChanged) {
    const { runAutomationForEvent } = await import('@/lib/services/automation-engine')
    await runAutomationForEvent('loyalty_upgrade', { clientId, newTier })
  }
}

function calculateTier(points: number, spent: number): string {
  if (points >= 500 || spent >= 5000) return 'Platinum'
  if (points >= 250 || spent >= 2500) return 'Gold'
  if (points >= 100 || spent >= 1000) return 'Silver'
  return 'Bronze'
}
