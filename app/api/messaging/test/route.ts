import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { sendMessage } from '@/lib/services/messaging'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = rateLimit(`sms-test:${ip}`, 5, 60_000) // 5 test messages per minute
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    await adminAuth.verifySessionCookie(session)
    const { phone, channel } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const result = await sendMessage(
      channel ?? 'sms',
      phone,
      'BeautyOS test message — your messaging is configured correctly! ✓'
    )

    return NextResponse.json({
      success: result.success,
      mock:    result.mock ?? false,
      error:   result.error ?? null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
