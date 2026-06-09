import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification } from '@/lib/actions/notifications'
import { rateLimit } from '@/lib/rate-limit'
import { sendMessage } from '@/lib/services/messaging'
import { z } from 'zod'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const BookSchema = z.object({
  tenantId:      z.string().min(1).max(128).optional(),
  serviceIds:    z.array(z.string().min(1).max(128)).min(1).max(10),
  staffId:       z.string().min(1).max(128),
  locationId:    z.string().max(128).optional().nullable(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:     z.string().regex(/^\d{2}:\d{2}$/),
  name:          z.string().min(1).max(100).trim(),
  phone:         z.string().min(7).max(20).regex(/^[\d\s\+\-\(\)]+$/),
  email:         z.string().email().max(200).optional().or(z.literal('')),
  notes:         z.string().max(500).optional(),
  depositPaid:   z.boolean().optional(),
  depositAmount: z.number().min(0).optional(),
  paystackRef:   z.string().max(200).optional(),
  bookingRef:    z.string().max(100).optional(),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = rateLimit(`book:${ip}`, 5, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })

  try {
    const body   = await req.json()
    const parsed = BookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400, headers: CORS })
    }
    const { tenantId, serviceIds, staffId, locationId, date, startTime, name, phone, email, notes,
            depositPaid, depositAmount, paystackRef, bookingRef } = parsed.data

    // Idempotency — if Paystack succeeded but the network dropped, return the existing booking
    if (bookingRef) {
      const existing = await adminDb.collection('appointments')
        .where('bookingRef', '==', bookingRef).limit(1).get()
      if (!existing.empty) {
        return NextResponse.json({ id: existing.docs[0].id }, { headers: CORS })
      }
    }

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
      const staffSnap = await adminDb.collection('staff').where('isActive', '==', true).get()
      const available = staffSnap.docs.filter(d => d.data().isAvailable)
      const picked    = available[0] ?? staffSnap.docs[0]
      resolvedStaffId = picked?.id ?? ''
      staffName       = picked?.data()?.name ?? 'Staff'
    }

    // Double-booking check — query same staff + date, check overlap in memory
    if (resolvedStaffId) {
      const snap = await adminDb.collection('appointments')
        .where('staffId', '==', resolvedStaffId)
        .where('date',    '==', date)
        .where('status',  'in', ['pending', 'confirmed'])
        .get()

      const [sh, sm] = startTime.split(':').map(Number)
      const newStart = sh * 60 + sm
      const newEnd   = newStart + duration

      const conflict = snap.docs.some(doc => {
        const a = doc.data()
        const [ah, am] = (a.startTime as string).split(':').map(Number)
        const aStart   = ah * 60 + am
        const aEnd     = aStart + (a.duration as number ?? 0)
        return newStart < aEnd && newEnd > aStart
      })

      if (conflict) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please choose a different time.' },
          { status: 409, headers: CORS },
        )
      }
    }

    // Compute end time
    const [h, m]  = startTime.split(':').map(Number)
    const endMin  = h * 60 + m + duration
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    const now     = new Date().toISOString()

    const ref = adminDb.collection('appointments').doc()
    await ref.set({
      tenantId:      tenantId ?? null,
      clientId:      '',
      clientName:    name,
      clientPhone:   phone,
      staffId:       resolvedStaffId,
      staffName,
      locationId:    locationId ?? null,
      roomId: null,  roomName: null,
      date, startTime, endTime, duration,
      totalPrice,
      status:        'pending',
      paymentStatus: depositPaid ? 'partial' : 'pending',
      notes:         notes || null,
      services,
      isOnlineBooking: true,
      bookerEmail:   email  || null,
      depositPaid:   depositPaid   ?? false,
      depositAmount: depositAmount ?? 0,
      paystackRef:   paystackRef   ?? null,
      bookingRef:    bookingRef    ?? null,
      createdAt: now, updatedAt: now,
    })

    await createNotification({
      type:  'booking_request',
      title: 'New Booking Request',
      body:  `${name} requested ${services.map(s => s.name).join(', ')} on ${date} at ${startTime}`,
      link:  '/appointments',
    })

    const [hFmt, mFmt] = startTime.split(':').map(Number)
    const ampm   = hFmt >= 12 ? 'PM' : 'AM'
    const hour   = hFmt % 12 || 12
    const timeStr = `${hour}:${String(mFmt).padStart(2, '0')} ${ampm}`
    const svcNames = services.map(s => s.name).join(', ')
    sendMessage(
      'sms',
      phone,
      `Hi ${name}! Your booking request has been received.\n\n📅 ${date} at ${timeStr}\n💇 ${svcNames}\n\nWe'll confirm shortly. Thank you!`,
    ).then(result => {
      if (!result.success && !result.mock) {
        console.error(`[book] SMS to ${phone} failed:`, result.error)
      }
    })

    return NextResponse.json({ id: ref.id }, { headers: CORS })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS })
  }
}
