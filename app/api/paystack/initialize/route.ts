import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { initializePayment } from '@/lib/services/paystack'
import { z } from 'zod'

const Schema = z.object({
  email:       z.string().email(),
  amountGHS:   z.number().min(0.01),
  reference:   z.string().min(1),
  callbackUrl: z.string().url(),
  metadata:    z.record(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await adminAuth.verifySessionCookie(session)
    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const result = await initializePayment(parsed.data)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
