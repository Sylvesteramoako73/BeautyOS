import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Returns the primary tenant — used by the booking app root page to self-configure.
// For multi-tenant setups this could accept a ?domain= param; for now returns the first active tenant.
export async function GET() {
  const snap = await adminDb.collection('tenants').limit(1).get()
  if (snap.empty) {
    return NextResponse.json({ error: 'No salon found' }, { status: 404, headers: CORS })
  }

  const doc  = snap.docs[0]
  const data = doc.data()

  const settingsDoc = await adminDb.collection('settings').doc(doc.id).get()
  const s           = settingsDoc.data() ?? {}

  const { DEFAULT_WORKING_HOURS } = await import('@/lib/actions/settings')

  return NextResponse.json(
    {
      tenantId:     doc.id,
      slug:         data.slug,
      salonName:    s.salonName ?? data.name ?? 'Beauty Salon',
      tagline:      s.tagline   ?? '',
      phone:        s.phone     ?? '',
      address:      s.address   ?? '',
      depositPct:   s.depositPct   ?? 30,
      paystackKey:  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '',
      workingHours: s.workingHours ?? DEFAULT_WORKING_HOURS,
    },
    { headers: CORS },
  )
}
