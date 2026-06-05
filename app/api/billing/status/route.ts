import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getTenant } from '@/lib/actions/tenants'

export async function GET() {
  const user = await getSessionUser()
  if (!user?.tenantId) return NextResponse.json({ plan: null, subscriptionStatus: null, trialEndsAt: null })

  const tenant = await getTenant(user.tenantId)
  if (!tenant) return NextResponse.json({ plan: null, subscriptionStatus: null, trialEndsAt: null })

  return NextResponse.json({
    tenantId:           tenant.id,
    plan:               tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus,
    trialEndsAt:        tenant.trialEndsAt,
    salonName:          tenant.name,
    slug:               tenant.slug,
  })
}
