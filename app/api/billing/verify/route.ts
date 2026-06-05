import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { updateTenantPlan } from '@/lib/actions/tenants'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference, plan } = await req.json()
  if (!reference || !plan) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const secretKey = process.env.PAYSTACK_PLATFORM_SECRET_KEY
  if (!secretKey) {
    // Mock mode — just upgrade the plan
    await updateTenantPlan(user.tenantId, { plan, subscriptionStatus: 'active' })
    return NextResponse.json({ ok: true, mock: true })
  }

  // Verify with Paystack
  const res  = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const data = await res.json()

  if (!data.status || data.data?.status !== 'success') {
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
  }

  await updateTenantPlan(user.tenantId, {
    plan,
    subscriptionStatus:   'active',
    paystackCustomerCode: data.data?.customer?.customer_code ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
