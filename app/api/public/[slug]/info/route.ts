import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params

  const tenantSnap = await adminDb.collection('tenants').where('slug', '==', slug).limit(1).get()
  if (tenantSnap.empty) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404, headers: CORS })
  }

  const tenantId = tenantSnap.docs[0].id
  const settingsDoc = await adminDb.collection('settings').doc(`${tenantId}_salon`).get()
  const data = settingsDoc.data() ?? {}

  return NextResponse.json(
    {
      tenantId,
      slug,
      salonName: data.salonName ?? tenantSnap.docs[0].data().name ?? 'Beauty Salon',
      tagline:   data.tagline   ?? '',
      phone:     data.phone     ?? '',
      address:   data.address   ?? '',
      email:       data.email       ?? '',
      depositPct:  data.depositPct  ?? 30,
      paystackKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '',
    },
    { headers: CORS },
  )
}
