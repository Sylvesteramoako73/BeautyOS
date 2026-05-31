'use server'
import { adminDb, docData } from '@/lib/firebase-admin'

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

const col = () => adminDb.collection('invoices')

export async function getInvoices(filters?: { clientId?: string; status?: string }): Promise<Invoice[]> {
  let q: FirebaseFirestore.Query = col()
  if (filters?.clientId) q = q.where('clientId', '==', filters.clientId)
  else if (filters?.status) q = q.where('status', '==', filters.status)

  const snap = await q.get()
  let invoices = snap.docs.map(d => docData(d) as Invoice)

  if (filters?.status && filters.clientId) {
    invoices = invoices.filter(i => i.status === filters.status)
  }

  return invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getInvoiceStats() {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const snap       = await col().where('status', '==', 'paid').get()

  const all       = snap.docs.map(d => d.data())
  const thisMonth = all.filter(i => i.createdAt >= monthStart)

  return {
    total:        all.length,
    totalRevenue: all.reduce((s, i) => s + i.total, 0),
    thisMonth:    thisMonth.length,
    monthRevenue: thisMonth.reduce((s, i) => s + i.total, 0),
  }
}
