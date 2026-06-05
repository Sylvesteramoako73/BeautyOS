'use server'
import { adminDb } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'

export type Notification = {
  id: string
  type: 'new_appointment' | 'status_change' | 'new_client' | 'payment' | 'booking_request'
  title: string
  body: string
  read: boolean
  link?: string
  createdAt: string
}

export async function createNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
  const tenantId = await getTenantId()
  await adminDb.collection('notifications').add({
    ...data,
    tenantId: tenantId ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  })
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('notifications')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Notification))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export async function markAllRead() {
  const tenantId = await getTenantId()
  if (!tenantId) return
  const snap  = await adminDb.collection('notifications')
    .where('tenantId', '==', tenantId)
    .get()
  const unread = snap.docs.filter(d => !d.data().read)
  const batch  = adminDb.batch()
  unread.forEach(d => batch.update(d.ref, { read: true }))
  if (unread.length > 0) await batch.commit()
}

export async function getUnreadCount(): Promise<number> {
  const tenantId = await getTenantId()
  if (!tenantId) return 0
  const snap = await adminDb.collection('notifications')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs.filter(d => !d.data().read).length
}
