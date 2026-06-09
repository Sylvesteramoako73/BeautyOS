import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  const user = await getSessionUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await adminDb.collection('tenants').doc(user.tenantId).get()
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = doc.data()!
  return NextResponse.json({ tenantId: doc.id, slug: data.slug, name: data.name })
}
