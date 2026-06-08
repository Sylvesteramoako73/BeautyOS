'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { AppointmentSchema, POSSaleSchema } from '@/lib/validation'
import { getTenantId } from '@/lib/auth'
import type { Appointment } from '@/lib/types'

const apts = () => adminDb.collection('appointments')

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
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const snap = await apts().where('tenantId', '==', tenantId).get()
  let results = snap.docs.map(mapAppt)

  if (filters?.date)       results = results.filter(a => a.date       === filters.date)
  if (filters?.staffId)    results = results.filter(a => a.staffId    === filters.staffId)
  if (filters?.locationId) results = results.filter(a => a.locationId === filters.locationId)
  if (filters?.status && filters.status !== 'all') {
    results = results.filter(a => a.status === filters.status)
  }

  // Today + past: descending (today first, then yesterday, day before…)
  // Future dates: ascending at the bottom (nearest upcoming first)
  const STATUS_RANK: Record<string, number> = {
    'in-progress': 0, confirmed: 1, pending: 2,
    'no-show': 3, completed: 4, cancelled: 5,
  }
  const today = new Date().toISOString().split('T')[0]
  return results.sort((a, b) => {
    const aFuture = a.date > today
    const bFuture = b.date > today
    if (aFuture && bFuture) return a.date.localeCompare(b.date)   // both future → nearest first
    if (aFuture)  return 1                                          // a future → goes below b
    if (bFuture)  return -1                                         // b future → goes below a
    if (a.date !== b.date)           return b.date.localeCompare(a.date)      // past → newest first
    if (a.startTime !== b.startTime) return b.startTime.localeCompare(a.startTime)
    return (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3)
  })
}

export async function getTodayAppointments(locationId?: string | null): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0]
  const all   = await getAppointments({ date: today })
  return locationId ? all.filter(a => a.locationId === locationId) : all
}

export async function createAppointment(data: {
  clientId: string; staffId: string; apprenticeId?: string | null
  roomId?: string; locationId?: string | null
  date: string; startTime: string; endTime: string
  duration: number; totalPrice: number; serviceIds: string[]; notes?: string
}): Promise<Appointment> {
  const tenantId = await getTenantId()
  const parsed   = AppointmentSchema.parse(data)

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
  let apprenticeName: string | null = null
  if (parsed.apprenticeId) {
    const apprDoc = await adminDb.collection('apprentices').doc(parsed.apprenticeId).get()
    apprenticeName = apprDoc.data()?.name ?? null
  }

  const now = new Date().toISOString()
  const ref = apts().doc()

  const services = serviceSnaps.map(s => ({
    serviceId: s.id,
    name:      s.data()?.name ?? '',
    price:     s.data()?.price ?? 0,
    duration:  s.data()?.duration ?? 0,
  }))

  const doc = {
    tenantId:       tenantId ?? null,
    clientId:       parsed.clientId,
    clientName:     clientData.name,
    clientPhone:    clientData.phone,
    staffId:        parsed.staffId,
    staffName:      staffData.name,
    apprenticeId:   parsed.apprenticeId ?? null,
    apprenticeName,
    roomId:         parsed.roomId ?? null,
    roomName,
    locationId:     parsed.locationId ?? null,
    locationName,
    date:           parsed.date,
    startTime:      parsed.startTime,
    endTime:        parsed.endTime,
    duration:       parsed.duration,
    totalPrice:     parsed.totalPrice,
    status:         'confirmed',
    paymentStatus:  'pending',
    notes:          parsed.notes ?? null,
    services,
    createdAt:      now,
    updatedAt:      now,
  }

  await ref.set(doc)
  revalidatePath('/appointments')
  revalidatePath('/')
  return mapAppt(await ref.get())
}

export async function updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
  const now = new Date().toISOString()
  await apts().doc(id).update({ status, updatedAt: now })

  const doc  = await apts().doc(id).get()
  const data = doc.data()!

  if (status === 'completed') {
    await adminDb.collection('clients').doc(data.clientId).update({
      totalVisits: (await adminDb.collection('clients').doc(data.clientId).get()).data()!.totalVisits + 1,
      totalSpent:  (await adminDb.collection('clients').doc(data.clientId).get()).data()!.totalSpent + data.totalPrice,
      lastVisitAt: now,
      updatedAt:   now,
    })
    const client  = (await adminDb.collection('clients').doc(data.clientId).get()).data()!
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
  const tenantId = await getTenantId()
  const now      = new Date()
  const nowStr   = now.toISOString()

  const doc      = await apts().doc(id).get()
  const apt      = doc.data()!
  const services: { serviceId: string; name: string; price: number; duration: number }[] = apt.services ?? []

  const subtotal    = services.reduce((s, sv) => s + sv.price, 0)
  const pct         = Math.max(0, Math.min(100, data.discountPct ?? 0))
  const discountAmt = Math.round(subtotal * pct / 100)
  const total       = Math.max(0, subtotal - discountAmt)

  const invoiceNumber = `INV-${Date.now()}`
  const invoiceRef    = adminDb.collection('invoices').doc()

  await Promise.all([
    apts().doc(id).update({
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
      tenantId:      tenantId ?? null,
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

  const clientSnap = await adminDb.collection('clients').doc(apt.clientId).get()
  const clientData = clientSnap.data()!
  await adminDb.collection('clients').doc(apt.clientId).update({
    totalVisits: (clientData.totalVisits ?? 0) + 1,
    totalSpent:  (clientData.totalSpent  ?? 0) + total,
    lastVisitAt: nowStr,
    updatedAt:   nowStr,
  })

  const trigger = (clientData.totalVisits ?? 0) === 0 ? 'new_client' : 'after_appointment'
  const { runAutomationForEvent } = await import('@/lib/services/automation-engine')
  await runAutomationForEvent(trigger, { appointmentId: id })

  revalidatePath('/appointments')
  revalidatePath('/')
  return mapAppt(await apts().doc(id).get())
}

export async function deleteAppointment(id: string) {
  await apts().doc(id).update({ status: 'cancelled', updatedAt: new Date().toISOString() })
  revalidatePath('/appointments')
}

export async function getDashboardStats(locationId?: string | null) {
  const tenantId       = await getTenantId()
  if (!tenantId) return {
    todayRevenue: 0, todayBookings: 0, completedToday: 0, upcomingToday: 0,
    monthlyRevenue: 0, revenueGrowth: 0, totalClients: 0, avgTransaction: 0,
    staffCount: 0, availableStaff: 0,
  }

  const today          = new Date().toISOString().split('T')[0]
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd   = monthStart

  const base = apts().where('tenantId', '==', tenantId)

  const [apptSnap, clientsSnap, staffSnap] = await Promise.all([
    base.get(),
    adminDb.collection('clients').where('tenantId', '==', tenantId).get(),
    adminDb.collection('staff').where('tenantId', '==', tenantId).get(),
  ])

  const loc = (a: any) => !locationId || a.locationId === locationId

  const allApts   = apptSnap.docs.map(d => d.data())
  const todayApts = allApts.filter(a => a.date === today).filter(loc)
  const monthApts = allApts.filter(a => a.date >= monthStart).filter(loc)
  const lastApts  = allApts.filter(a => a.date >= lastMonthStart && a.date < lastMonthEnd).filter(loc)
  const staff     = staffSnap.docs.map(d => d.data()).filter((s: any) => s.isActive && (!locationId || s.locationId === locationId))

  const todayRevenue   = todayApts.filter((a: any) => a.paymentStatus === 'paid').reduce((s: number, a: any) => s + a.totalPrice, 0)
  const monthRevenue   = monthApts.filter((a: any) => a.paymentStatus === 'paid').reduce((s: number, a: any) => s + a.totalPrice, 0)
  const lastRevenue    = lastApts.filter((a: any)  => a.paymentStatus === 'paid').reduce((s: number, a: any) => s + a.totalPrice, 0)
  const revenueGrowth  = lastRevenue > 0 ? parseFloat(((monthRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)) : 0
  const avgTransaction = monthApts.length > 0 ? Math.round(monthApts.reduce((s: number, a: any) => s + a.totalPrice, 0) / monthApts.length) : 0

  return {
    todayRevenue,
    todayBookings:  todayApts.length,
    completedToday: todayApts.filter((a: any) => a.status === 'completed').length,
    upcomingToday:  todayApts.filter((a: any) => a.status === 'confirmed').length,
    monthlyRevenue: monthRevenue,
    revenueGrowth,
    totalClients:   clientsSnap.docs.filter(d => d.data().isActive).length,
    avgTransaction,
    staffCount:     staff.length,
    availableStaff: staff.filter((s: any) => s.isAvailable).length,
  }
}

export async function createPOSSale(data: {
  clientId: string; staffId: string; serviceIds: string[]
  paymentMethod: string; discountPct: number; redeemPoints?: number
}) {
  const tenantId = await getTenantId()
  const parsed   = POSSaleSchema.parse(data)
  const { clientId, staffId, serviceIds, paymentMethod, discountPct, redeemPoints = 0 } = parsed

  const [clientDoc, staffDoc] = await Promise.all([
    adminDb.collection('clients').doc(clientId).get(),
    adminDb.collection('staff').doc(staffId).get(),
  ])

  const serviceSnaps = await Promise.all(serviceIds.map(id => adminDb.collection('services').doc(id).get()))
  const services = serviceSnaps.map(s => ({
    serviceId: s.id,
    name:      s.data()?.name ?? '',
    price:     s.data()?.price ?? 0,
    duration:  s.data()?.duration ?? 0,
  }))

  const subtotal       = services.reduce((s, sv) => s + sv.price, 0)
  const discountAmt    = Math.round(subtotal * discountPct / 100)
  const pointsDiscount = Math.floor(redeemPoints / 10)
  const total          = Math.max(0, subtotal - discountAmt - pointsDiscount)
  const duration       = services.reduce((s, sv) => s + sv.duration, 0)

  const now       = new Date()
  const nowStr    = now.toISOString()
  const today     = nowStr.split('T')[0]
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const endMin    = now.getHours() * 60 + now.getMinutes() + duration
  const endTime   = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

  const invoiceNumber = `INV-${Date.now()}`
  const apptRef       = apts().doc()
  const invoiceRef    = adminDb.collection('invoices').doc()

  const apptDoc = {
    tenantId:      tenantId ?? null,
    clientId,
    clientName:    clientDoc.data()!.name,
    clientPhone:   clientDoc.data()!.phone,
    staffId,
    staffName:     staffDoc.data()!.name,
    roomId: null,  roomName: null,
    date: today, startTime, endTime, duration,
    totalPrice:    total,
    status:        'completed',
    paymentStatus: 'paid',
    notes: null,
    services,
    createdAt: nowStr,
    updatedAt: nowStr,
  }

  const invoiceDoc = {
    tenantId:      tenantId ?? null,
    clientId,
    appointmentId: apptRef.id,
    invoiceNumber,
    subtotal, discountPct, discountAmt, total,
    status:        'paid',
    paymentMethod,
    paidAt:        nowStr,
    createdAt:     nowStr,
    items: services.map(s => ({
      serviceId: s.serviceId, description: s.name,
      quantity: 1, unitPrice: s.price, total: s.price,
    })),
  }

  await Promise.all([apptRef.set(apptDoc), invoiceRef.set(invoiceDoc)])

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
