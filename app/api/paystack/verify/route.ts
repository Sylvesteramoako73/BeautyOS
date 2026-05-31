import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { verifyPayment } from '@/lib/services/paystack'

export async function GET(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await adminAuth.verifySessionCookie(session)
    const ref    = req.nextUrl.searchParams.get('reference')
    if (!ref) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

    const result = await verifyPayment(ref)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
