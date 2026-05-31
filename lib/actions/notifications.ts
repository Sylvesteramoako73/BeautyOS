'use server'
import { adminDb } from '@/lib/firebase-admin'

export type Notification = {
  id: string
  type: 'new_appointment' | 'status_change' | 'new_client' | 'payment' | 'booking_request'
  title: string
  body: string
  read: boolean
  link?: string
  createdAt: string
}

const col = () => adminDb.collection('notifications')

export async function createNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
  await col().add({ ...data, read: false, createdAt: new Date().toISOString() })
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const snap = await col().orderBy('createdAt', 'desc').limit(limit).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))
}

export async function markAllRead() {
  const snap  = await col().where('read', '==', false).get()
  const batch = adminDb.batch()
  snap.docs.forEach(d => batch.update(d.ref, { read: true }))
  if (snap.size > 0) await batch.commit()
}

export async function getUnreadCount(): Promise<number> {
  const snap = await col().where('read', '==', false).count().get()
  return snap.data().count
}
