import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    // During build without env vars — initialize with a placeholder so imports don't crash.
    // All actual DB calls will fail gracefully at runtime until env vars are set in Vercel.
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'placeholder' })
  } else {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
}

export const adminDb   = getFirestore()
export const adminAuth = getAuth()
export { FieldValue, Timestamp }

// Convert Firestore Timestamp → JS Date
export function toDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Timestamp) return val.toDate()
  if (val.toDate) return val.toDate()
  return new Date(val)
}

// Strip Firestore Timestamps from a doc so it can be serialized as JSON
export function docData(doc: FirebaseFirestore.DocumentSnapshot) {
  const raw = doc.data()
  if (!raw) return null
  return convertTimestamps({ id: doc.id, ...raw })
}

function convertTimestamps(obj: any): any {
  if (obj instanceof Timestamp) return obj.toDate().toISOString()
  if (Array.isArray(obj))       return obj.map(convertTimestamps)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, convertTimestamps(v)]))
  }
  return obj
}
