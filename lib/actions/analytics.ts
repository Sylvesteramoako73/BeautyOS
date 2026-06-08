'use server'
import { adminDb } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'

export async function getAnalyticsData(period: 'week' | 'month' = 'week', locationId?: string | null) {
  const tenantId = await getTenantId()
  const now  = new Date()
  const days = period === 'week' ? 7 : 30

  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const startDate = (() => {
    const d = new Date(now); d.setDate(d.getDate() - (days - 1)); return d.toISOString().split('T')[0]
  })()

  if (!tenantId) return {
    revenueTrend: [], serviceBreakdown: [], paymentMethods: [], locationBreakdown: [],
    kpis: { monthlyRevenue: 0, monthlyGrowth: 0, totalBookings: 0, newClients: 0, newClientsGrowth: 0, completionRate: 0 },
  }

  // Single-field where queries only — no composite indexes needed
  const [aptsSnap, clientsSnap, servicesSnap, invoicesSnap] = await Promise.all([
    adminDb.collection('appointments').where('tenantId', '==', tenantId).get(),
    adminDb.collection('clients').where('tenantId', '==', tenantId).get(),
    adminDb.collection('services').where('tenantId', '==', tenantId).get(),
    adminDb.collection('invoices').where('tenantId', '==', tenantId).get(),
  ])

  const loc = (a: any) => !locationId || a.locationId === locationId

  // In-memory date filtering
  const allApts       = aptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
  const periodApts    = allApts.filter(a => a.date >= startDate).filter(loc)
  const monthApts     = allApts.filter(a => a.date >= monthStart).filter(loc)
  const lastMonthApts = allApts.filter(a => a.date >= lastMonthStart && a.date < lastMonthEnd).filter(loc)

  // Clients — in-memory date filtering
  const allClients     = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
  const newClients     = allClients.filter(c => c.createdAt >= new Date(monthStart).toISOString()).length
  const lastNewClients = allClients.filter(c =>
    c.createdAt >= new Date(lastMonthStart).toISOString() && c.createdAt < new Date(lastMonthEnd).toISOString()
  ).length

  // Revenue by day
  const revenueTrend = Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().split('T')[0]
    const label   = period === 'week'
      ? d.toLocaleDateString('en-GH', { weekday: 'short' })
      : String(d.getDate())
    const dayApts = periodApts.filter((a: any) => a.date === dateStr && a.status !== 'cancelled')
    return {
      date:     label,
      revenue:  dayApts.filter((a: any) => a.paymentStatus === 'paid').reduce((s: number, a: any) => s + a.totalPrice, 0),
      bookings: dayApts.length,
    }
  })

  // Service breakdown by category
  const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter((s: any) => s.isActive)
  const categories  = ['Hair', 'Nails', 'Skin & Spa', 'Brows & Lashes', 'Packages']
  const activeApts  = monthApts.filter((a: any) => a.status !== 'cancelled')

  const serviceBreakdown = categories.map(cat => {
    const catSvcIds = new Set(allServices.filter((s: any) => s.category === cat).map((s: any) => s.id))
    let bookings = 0; let revenue = 0
    for (const apt of activeApts) {
      for (const s of (apt.services ?? [])) {
        if (catSvcIds.has(s.serviceId)) {
          bookings++
          if (apt.paymentStatus === 'paid') revenue += s.price
        }
      }
    }
    return { name: cat, bookings, revenue }
  })

  const totalCatRevenue = serviceBreakdown.reduce((s, sb) => s + sb.revenue, 0)
  const breakdown = serviceBreakdown
    .map(sb => ({ ...sb, percentage: totalCatRevenue > 0 ? Math.round(sb.revenue / totalCatRevenue * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  // Payment methods — in-memory filter
  const allInvoices   = invoicesSnap.docs.map(d => d.data())
  const monthInvoices = allInvoices.filter(inv => inv.status === 'paid' && inv.createdAt >= new Date(monthStart).toISOString())
  const pmCounts: Record<string, number> = {}
  for (const inv of monthInvoices) {
    const m = inv.paymentMethod ?? 'cash'
    pmCounts[m] = (pmCounts[m] ?? 0) + 1
  }
  const pmTotal = Object.values(pmCounts).reduce((s, v) => s + v, 0)
  const PM_LABELS: Record<string, string> = { momo: 'Mobile Money', card: 'Card', transfer: 'Bank Transfer', cash: 'Cash' }
  const paymentMethods = pmTotal > 0
    ? Object.entries(pmCounts).map(([id, cnt]) => ({ name: PM_LABELS[id] ?? id, value: Math.round(cnt / pmTotal * 100) }))
    : [{ name: 'Cash', value: 100 }]

  // KPIs
  const monthPaid    = monthApts.filter((a: any) => a.paymentStatus === 'paid')
  const lastPaid     = lastMonthApts.filter((a: any) => a.paymentStatus === 'paid')
  const monthRevenue = monthPaid.reduce((s: number, a: any) => s + a.totalPrice, 0)
  const lastRevenue  = lastPaid.reduce((s: number, a: any) => s + a.totalPrice, 0)
  const monthlyGrowth    = lastRevenue > 0 ? parseFloat(((monthRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)) : 0
  const nonCancelled     = monthApts.filter((a: any) => a.status !== 'cancelled')
  const completed        = nonCancelled.filter((a: any) => a.status === 'completed')
  const completionRate   = nonCancelled.length > 0 ? Math.round(completed.length / nonCancelled.length * 100) : 0
  const newClientsGrowth = lastNewClients > 0 ? parseFloat(((newClients - lastNewClients) / lastNewClients * 100).toFixed(1)) : 0

  // Per-location revenue
  const locationMap = new Map<string, { name: string; revenue: number; bookings: number }>()
  for (const apt of allApts.filter(a => a.date >= monthStart)) {
    if (!apt.locationId || !apt.locationName) continue
    const entry = locationMap.get(apt.locationId) ?? { name: apt.locationName, revenue: 0, bookings: 0 }
    if (apt.status !== 'cancelled') entry.bookings++
    if (apt.paymentStatus === 'paid') entry.revenue += apt.totalPrice
    locationMap.set(apt.locationId, entry)
  }
  const locationBreakdown = Array.from(locationMap.values()).sort((a, b) => b.revenue - a.revenue)

  return {
    revenueTrend,
    serviceBreakdown: breakdown,
    paymentMethods,
    locationBreakdown,
    kpis: { monthlyRevenue: monthRevenue, monthlyGrowth, totalBookings: nonCancelled.length, newClients, newClientsGrowth, completionRate },
  }
}
