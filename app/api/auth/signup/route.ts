import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signUpNewTenant } from '@/lib/actions/tenants'

const Schema = z.object({
  salonName: z.string().min(1).max(100).trim(),
  ownerName: z.string().min(1).max(100).trim(),
  email:     z.string().email(),
  password:  z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const result = await signUpNewTenant(parsed.data)
    return NextResponse.json({ ok: true, tenantId: result.tenantId, uid: result.uid })
  } catch (err: any) {
    const msg = err?.errorInfo?.message ?? err?.message ?? 'Signup failed'
    // Firebase auth errors (email already in use, etc.)
    if (msg.includes('EMAIL_EXISTS') || msg.includes('email-already-in-use')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    console.error('[signup]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
