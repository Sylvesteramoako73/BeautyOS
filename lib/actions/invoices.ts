'use server'
import { adminDb, docData } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'

export type Invoice = {
  id: string
  clientId: string
  clientName?: string
  appointmentId: string | null
  invoiceNumber: string
  subtotal: number
  discountPct: number
  discountAmt: number
  total: number
  status: string
  paymentMethod: string | null
  paidAt: string | null
  createdAt: string
  items: { serviceId: string; description: string; quantity: number; unitPrice: number; total: number }[]
}

export async function getInvoices(filters?: { clientId?: string; status?: string }): Promise<Invoice[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('invoices').where('tenantId', '==', tenantId).get()
  let invoices = snap.docs.map(d => docData(d) as Invoice)

  if (filters?.clientId) invoices = invoices.filter(i => i.clientId === filters.clientId)
  if (filters?.status)   invoices = invoices.filter(i => i.status   === filters.status)

  return invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getInvoiceStats() {
  const tenantId = await getTenantId()
  if (!tenantId) return { total: 0, totalRevenue: 0, thisMonth: 0, monthRevenue: 0 }
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const snap  = await adminDb.collection('invoices')
    .where('tenantId', '==', tenantId)
    .get()

  const all       = snap.docs.map(d => d.data()).filter(i => i.status === 'paid')
  const thisMonth = all.filter(i => i.createdAt >= monthStart)

  return {
    total:        all.length,
    totalRevenue: all.reduce((s, i) => s + i.total, 0),
    thisMonth:    thisMonth.length,
    monthRevenue: thisMonth.reduce((s, i) => s + i.total, 0),
  }
}
