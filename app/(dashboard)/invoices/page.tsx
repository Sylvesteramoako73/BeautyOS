import { requireRole } from '@/lib/auth'
import { getInvoices, getInvoiceStats } from '@/lib/actions/invoices'
import { InvoicesView } from './view'

export default async function InvoicesPage() {
  await requireRole('owner', 'manager')
  const [invoices, stats] = await Promise.all([getInvoices(), getInvoiceStats()])
  return <InvoicesView invoices={invoices} stats={stats} />
}

export const revalidate = 60
