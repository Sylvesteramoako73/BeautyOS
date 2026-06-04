'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { AppointmentSchema, POSSaleSchema } from '@/lib/validation'
import type { Appointment } from '@/lib/types'

const col = () => adminDb.collection('appointments')

// Map flat Firestore doc to the shape views expect
function mapAppt(doc: FirebaseFirestore.DocumentSnapshot): Appointment {
  const d = docData(doc) as any
  return {
    ...d,
    client:   { name: d.clientName, phone: d.clientPhone },
    staff:    { name: d.staffName },
    room:     d.roomName ? { name: d.roomName } : null,
    location: d.locationName ? { name: d.locationName } : null,
    services: (d.services ?? []).map((s: any) => ({ service: { name: s.name, id: s.serviceId }, ...s })),
  }
}

export async function getAppointments(filters?: {
  date?: string; staffId?: string; status?: string; locationId?: string
}): Promise<Appointment[]> {
  // Use single-field where to avoid composite index requirements; filter rest in memory
  let q: FirebaseFirestore.Query = col()
  if (filters?.date)       q = q.where('date', '==', filters.date)
  else if (filters?.staffId)    q = q.where('staffId', '==', filters.staffId)
  else if (filters?.locationId) q = q.where('locationId', '==', filters.locationId)

  const snap = await q.get()
  let results = snap.docs.map(mapAppt)

  if (filters?.staffId)    results = results.filter(a => a.staffId   === filters.staffId)
  if (filters?.locationId) results = results.filter(a => a.locationId === filters.locationId)
  if (filters?.status && filters.status !== 'all') {
    results = results.filter(a => a.status === filters.status)
  }

  return results.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)
  )
}

export async function getTodayAppointments(locationId?: string | null): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0]
  const apts = await getAppointments({ date: today })
  return locationId ? apts.filter(a => a.locationId === locationId) : apts
}

export async function createAppointment(data: {
  clientId: string; staffId: string; roomId?: string; locationId?: string | null
  date: string; startTime: string; endTime: string
  duration: number; totalPrice: number; serviceIds: string[]; notes?: string
}): Promise<Appointment> {
  const parsed = AppointmentSchema.parse(data)
  // Fetch denormalized names
  const [clientDoc, staffDoc] = await Promise.all([
    adminDb.collection('clients').doc(parsed.clientId).get(),
    adminDb.collection('staff').doc(parsed.staffId).get(),
  ])

  const serviceSnaps = await Promise.all(
    parsed.serviceIds.map(id => adminDb.collection('services').doc(id).get())
  )

  const clientData = clientDoc.data()!
  const staffData  = staffDoc.data()!
  let roomName: string | null = null
  if (parsed.roomId) {
    const roomDoc = await adminDb.collection('rooms').doc(parsed.roomId).get()
    roomName = roomDoc.data()?.name ?? null
  }
  let locationName: string | null = null
  if (parsed.locationId) {
    const locDoc = await adminDb.collection('locations').doc(parsed.locationId).get()
    locationName = locDoc.data()?.name ?? null
  }

  const now = new Date().toISOString()
  const ref = col().doc()

  const services = serviceSnaps.map(s => ({
    serviceId: s.id,
    name: s.data()?.name ?? '',
    price: s.data()?.price ?? 0,
    duration: s.data()?.duration ?? 0,
  }))

  const doc = {
    clientId:     parsed.clientId,
    clientName:   clientData.name,
    clientPhone:  clientData.phone,
    staffId:      parsed.staffId,
    staffName:    staffData.name,
    roomId:       parsed.roomId ?? null,
    roomName,
    locationId:   parsed.locationId ?? null,
    locationName,
    date:         parsed.date,
    startTime:    parsed.startTime,
    endTime:      parsed.endTime,
    duration:     parsed.duration,
    totalPrice:   parsed.totalPrice,
    status:       'confirmed',
    paymentStatus: 'pending',
    notes:        parsed.notes ?? null,
    services,
    createdAt:    now,
    updatedAt:    now,
  }

  await ref.set(doc)
  revalidatePath('/appointments')
  revalidatePath('/')
  return mapAppt(await ref.get())
}

export async function updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
  const now = new Date().toISOString()
  await col().doc(id).update({ status, updatedAt: now })

  const doc    = await col().doc(id).get()
  const data   = doc.data()!

  if (status === 'completed') {
    await adminDb.collection('clients').doc(data.clientId).update({
      totalVisits: (await adminDb.collection('clients').doc(data.clientId).get()).data()!.totalVisits + 1,
      totalSpent:  (await adminDb.collection('clients').doc(data.clientId).get()).data()!.totalSpent + data.totalPrice,
      lastVisitAt: now,
      updatedAt:   now,
    })

    const client = (await adminDb.collection('clients').doc(data.clientId).get()).data()!
    const trigger = client.totalVisits === 1 ? 'new_client' : 'after_appointment'
    const { runAutomationForEvent } = await import('@/lib/services/automation-engine')
    await runAutomationForEvent(trigger, { appointmentId: id })
  }

  if (status === 'no-show') {
    const { runAutomationForEvent } = await import('@/lib/services/automation-engine')
    await runAutomationForEvent('no_show', { appointmentId: id })
  }

  revalidatePath('/appointments')
  revalidatePath('/')
  return mapAppt(doc)
}

export async function recordAppointmentPayment(
  id: string,
  data: { paymentMethod: 'cash' | 'card' | 'momo' | 'bank_transfer'; discountPct?: number; paystackRef?: string }
): Promise<Appointment> {
  const now    = new Date()
  const nowStr = now.toISOString()

  const doc     = await col().doc(id).get()
  const apt     = doc.data()!
  const services: { serviceId: string; name: string; price: number; duration: number }[] = apt.services ?? []

  const subtotal    = services.reduce((s, sv) => s + sv.price, 0)
  const pct         = Math.max(0, Math.min(100, data.discountPct ?? 0))
  const discountAmt = Math.round(subtotal * pct / 100)
  const total       = Math.max(0, subtotal - discountAmt)

  const invoiceNumber = `INV-${Date.now()}`
  const invoiceRef    = adminDb.collection('invoices').doc()

  await Promise.all([
    col().doc(id).update({
      status:        'completed',
      paymentStatus: 'paid',
      paymentMethod: data.paymentMethod,
      paidAt:        nowStr,
      discountPct:   pct,
      discountAmt,
      totalPrice:    total,
      updatedAt:     nowStr,
      ...(data.paystackRef ? { paystackRef: data.paystackRef } : {}),
    }),
    invoiceRef.set({
      clientId:      apt.clientId,
      appointmentId: id,
      invoiceNumber,
      subtotal,
      discountPct:   pct,
      discountAmt,
      total,
      status:        'paid',
      paymentMethod: data.paymentMethod,
      paidAt:        nowStr,
      createdAt:     nowStr,
      items: services.map(s => ({
        serviceId: s.serviceId, description: s.name,
        quantity: 1, unitPrice: s.price, total: s.price,
      })),
    }),
  ])

  // Update client stats
  const clientSnap = await adminDb.collection('clients').doc(apt.clientId).get()
  const clientData = clientSnap.data()!
  await adminDb.collection('clients').doc(apt.clientId).update({
    totalVisits: (clientData.totalVisits ?? 0) + 1,
    totalSpent:  (clientData.totalSpent  ?? 0) + total,
    lastVisitAt: nowStr,
    updatedAt:   nowStr,
  })

  // Trigger automations
  const trigger = (clientData.totalVisits ?? 0) === 0 ? 'new_client' : 'after_appointment'
  const { runAutomationForEvent } = await import('@/lib/services/automation-engine')
  await runAutomationForEvent(trigger, { appointmentId: id })

  revalidatePath('/appointments')
  revalidatePath('/')
  return mapAppt(await col().doc(id).get())
}

export async function deleteAppointment(id: string) {
  await col().doc(id).update({ status: 'cancelled', updatedAt: new Date().toISOString() })
  revalidatePath('/appointments')
}

export async function getDashboardStats(locationId?: string | null) {
  const today          = new Date().toISOString().split('T')[0]
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const [todaySnap, monthSnap, lastMonthSnap, clientsSnap, staffSnap] = await Promise.all([
    col().where('date', '==', today).get(),
    col().where('date', '>=', monthStart).get(),
    col().where('date', '>=', lastMonthStart).where('date', '<', lastMonthEnd).get(),
    adminDb.collection('clients').where('isActive', '==', true).count().get(),
    adminDb.collection('staff').where('isActive', '==', true).get(),
  ])

  const loc = (a: any) => !locationId || a.locationId === locationId

  const todayApts = todaySnap.docs.map(d => d.data()).filter(loc)
  const monthApts = monthSnap.docs.map(d => d.data()).filter(loc)
  const lastApts  = lastMonthSnap.docs.map(d => d.data()).filter(loc)
  const staff     = staffSnap.docs.map(d => d.data())
    .filter(s => !locationId || s.locationId === locationId)

  const todayRevenue  = todayApts.filter(a => a.paymentStatus === 'paid').reduce((s, a) => s + a.totalPrice, 0)
  const monthRevenue  = monthApts.filter(a => a.paymentStatus === 'paid').reduce((s, a) => s + a.totalPrice, 0)
  const lastRevenue   = lastApts.filter(a => a.paymentStatus === 'paid').reduce((s, a) => s + a.totalPrice, 0)
  const revenueGrowth = lastRevenue > 0 ? parseFloat(((monthRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)) : 0
  const avgTransaction = monthApts.length > 0 ? Math.round(monthApts.reduce((s, a) => s + a.totalPrice, 0) / monthApts.length) : 0

  return {
    todayRevenue,
    todayBookings:   todayApts.length,
    completedToday:  todayApts.filter(a => a.status === 'completed').length,
    upcomingToday:   todayApts.filter(a => a.status === 'confirmed').length,
    monthlyRevenue:  monthRevenue,
    revenueGrowth,
    totalClients:    clientsSnap.data().count,
    avgTransaction,
    staffCount:      staff.length,
    availableStaff:  staff.filter(s => s.isAvailable).length,
  }
}

export async function createPOSSale(data: {
  clientId: string; staffId: string; serviceIds: string[]
  paymentMethod: string; discountPct: number; redeemPoints?: number
}) {
  const parsed = POSSaleSchema.parse(data)
  const { clientId, staffId, serviceIds, paymentMethod, discountPct, redeemPoints = 0 } = parsed

  const [clientDoc, staffDoc] = await Promise.all([
    adminDb.collection('clients').doc(clientId).get(),
    adminDb.collection('staff').doc(staffId).get(),
  ])

  const serviceSnaps = await Promise.all(serviceIds.map(id => adminDb.collection('services').doc(id).get()))
  const services = serviceSnaps.map(s => ({
    serviceId: s.id,
    name: s.data()?.name ?? '',
    price: s.data()?.price ?? 0,
    duration: s.data()?.duration ?? 0,
  }))

  const subtotal      = services.reduce((s, sv) => s + sv.price, 0)
  const discountAmt   = Math.round(subtotal * discountPct / 100)
  const pointsDiscount = Math.floor(redeemPoints / 10) // 10 pts = ₵1
  const total         = Math.max(0, subtotal - discountAmt - pointsDiscount)
  const duration    = services.reduce((s, sv) => s + sv.duration, 0)

  const now       = new Date()
  const nowStr    = now.toISOString()
  const today     = now.toISOString().split('T')[0]
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const endMin    = now.getHours() * 60 + now.getMinutes() + duration
  const endTime   = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

  const invoiceNumber = `INV-${Date.now()}`
  const apptRef       = col().doc()
  const invoiceRef    = adminDb.collection('invoices').doc()

  const apptDoc = {
    clientId,
    clientName:  clientDoc.data()!.name,
    clientPhone: clientDoc.data()!.phone,
    staffId,
    staffName:   staffDoc.data()!.name,
    roomId: null, roomName: null,
    date: today, startTime, endTime, duration,
    totalPrice: total,
    status: 'completed',
    paymentStatus: 'paid',
    notes: null,
    services,
    createdAt: nowStr,
    updatedAt: nowStr,
  }

  const invoiceDoc = {
    clientId,
    appointmentId: apptRef.id,
    invoiceNumber,
    subtotal, discountPct, discountAmt, total,
    status: 'paid',
    paymentMethod,
    paidAt: nowStr,
    createdAt: nowStr,
    items: services.map(s => ({
      serviceId: s.serviceId, description: s.name,
      quantity: 1, unitPrice: s.price, total: s.price,
    })),
  }

  await Promise.all([
    apptRef.set(apptDoc),
    invoiceRef.set(invoiceDoc),
  ])

  // Update client stats
  const clientData = clientDoc.data()!
  await adminDb.collection('clients').doc(clientId).update({
    totalVisits:   (clientData.totalVisits ?? 0) + 1,
    totalSpent:    (clientData.totalSpent ?? 0) + total,
    lastVisitAt:   nowStr,
    loyaltyPoints: Math.max(0, (clientData.loyaltyPoints ?? 0) - redeemPoints) + Math.round(total / 10),
    updatedAt:     nowStr,
  })

  revalidatePath('/')
  revalidatePath('/appointments')
  return { appointmentId: apptRef.id, invoiceNumber, total }
}
