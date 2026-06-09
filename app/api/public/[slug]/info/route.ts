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

  const tenantId    = tenantSnap.docs[0].id
  const settingsDoc = await adminDb.collection('settings').doc(tenantId).get()
  const s           = settingsDoc.data() ?? {}

  const { DEFAULT_WORKING_HOURS } = await import('@/lib/actions/settings')

  return NextResponse.json(
    {
      tenantId,
      slug,
      salonName:    s.salonName ?? tenantSnap.docs[0].data().name ?? 'Beauty Salon',
      tagline:      s.tagline   ?? '',
      phone:        s.phone     ?? '',
      address:      s.address   ?? '',
      email:        s.email     ?? '',
      depositPct:   s.depositPct   ?? 30,
      paystackKey:  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '',
      workingHours: s.workingHours ?? DEFAULT_WORKING_HOURS,
    },
    { headers: CORS },
  )
}
