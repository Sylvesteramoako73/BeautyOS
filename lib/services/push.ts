import { adminDb } from '@/lib/firebase-admin'

export type PushSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function saveSubscription(uid: string, sub: PushSubscription) {
  await adminDb.collection('pushSubscriptions').doc(uid).set({
    ...sub,
    uid,
    updatedAt: new Date().toISOString(),
  })
}

export async function removeSubscription(uid: string) {
  await adminDb.collection('pushSubscriptions').doc(uid).delete()
}

export async function sendPushToUser(uid: string, payload: { title: string; body: string; url?: string }) {
  const doc = await adminDb.collection('pushSubscriptions').doc(uid).get()
  if (!doc.exists) return

  const sub  = doc.data() as PushSubscription
  const webpush = await import('web-push')

  webpush.setVapidDetails(
    'mailto:sylvesteramoako73@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it
      await adminDb.collection('pushSubscriptions').doc(uid).delete()
    }
  }
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  const snap = await adminDb.collection('pushSubscriptions').get()
  await Promise.allSettled(
    snap.docs.map(d => sendPushToUser(d.id, payload))
  )
}
