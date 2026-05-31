import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification } from '@/lib/actions/notifications'
import { rateLimit } from '@/lib/rate-limit'
import { sendMessage } from '@/lib/services/messaging'
import { z } from 'zod'

const BookSchema = z.object({
  serviceIds: z.array(z.string().min(1).max(128)).min(1).max(10),
  staffId:    z.string().min(1).max(128),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/),
  name:       z.string().min(1).max(100).trim(),
  phone:      z.string().min(7).max(20).regex(/^[\d\s\+\-\(\)]+$/),
  email:      z.string().email().max(200).optional().or(z.literal('')),
  notes:      z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = rateLimit(`book:${ip}`, 5, 60_000) // 5 bookings per minute per IP
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })

  try {
    const body   = await req.json()
    const parsed = BookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { serviceIds, staffId, date, startTime, name, phone, email, notes } = parsed.data

    // Fetch services
    const serviceSnaps = await Promise.all(
      serviceIds.map((id: string) => adminDb.collection('services').doc(id).get())
    )
    const services = serviceSnaps.map(s => ({
      serviceId: s.id, name: s.data()?.name ?? '', price: s.data()?.price ?? 0, duration: s.data()?.duration ?? 0,
    }))

    const totalPrice = services.reduce((s, sv) => s + sv.price, 0)
    const duration   = services.reduce((s, sv) => s + sv.duration, 0)

    // Resolve staff
    let resolvedStaffId = staffId
    let staffName       = 'Any Available'
    if (staffId && staffId !== 'any') {
      const staffDoc = await adminDb.collection('staff').doc(staffId).get()
      staffName      = staffDoc.data()?.name ?? 'Staff'
    } else {
      // Pick first available staff
      const staffSnap    = await adminDb.collection('staff').where('isActive', '==', true).get()
      const available    = staffSnap.docs.filter(d => d.data().isAvailable)
      const picked       = available[0] ?? staffSnap.docs[0]
      resolvedStaffId    = picked?.id ?? ''
      staffName          = picked?.data()?.name ?? 'Staff'
    }

    // Compute end time
    const [h, m]   = startTime.split(':').map(Number)
    const endMin   = h * 60 + m + duration
    const endTime  = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    const now      = new Date().toISOString()

    // Create appointment with status "pending" (booking request)
    const ref = adminDb.collection('appointments').doc()
    await ref.set({
      clientId:    '',
      clientName:  name,
      clientPhone: phone,
      staffId:     resolvedStaffId,
      staffName,
      roomId: null, roomName: null,
      date, startTime, endTime, duration,
      totalPrice, status: 'pending', paymentStatus: 'pending',
      notes: notes || null, services,
      isOnlineBooking: true,
      bookerEmail: email || null,
      createdAt: now, updatedAt: now,
    })

    // Notify staff/owner dashboard
    await createNotification({
      type:  'booking_request',
      title: 'New Booking Request',
      body:  `${name} requested ${services.map(s => s.name).join(', ')} on ${date} at ${startTime}`,
      link:  '/appointments',
    })

    // SMS confirmation to client (fire-and-forget — don't fail the booking if Twilio isn't configured)
    const [hFmt, mFmt] = startTime.split(':').map(Number)
    const ampm = hFmt >= 12 ? 'PM' : 'AM'
    const hour = hFmt % 12 || 12
    const timeStr = `${hour}:${String(mFmt).padStart(2, '0')} ${ampm}`
    const svcNames = services.map(s => s.name).join(', ')
    sendMessage(
      'sms',
      phone,
      `Hi ${name}! Your booking request at Luxe Beauty Studio has been received.\n\n📅 ${date} at ${timeStr}\n💇 ${svcNames}\n\nWe'll confirm shortly. Thank you!`,
    ).catch(() => {})

    return NextResponse.json({ id: ref.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
