import { NextRequest, NextResponse } from 'next/server'
import { adminDb, docData } from '@/lib/firebase-admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const tenantSnap = await adminDb.collection('tenants').where('slug', '==', params.slug).limit(1).get()
  if (tenantSnap.empty) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404, headers: CORS })
  }

  const tenantId = tenantSnap.docs[0].id
  const snap = await adminDb.collection('locations').where('tenantId', '==', tenantId).get()
  const locations = snap.docs
    .map(d => docData(d))
    .filter((l: any) => l.isActive)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((l: any) => ({
      id:      l.id,
      name:    l.name,
      address: l.address,
      phone:   l.phone ?? '',
    }))

  return NextResponse.json({ locations }, { headers: CORS })
}
