'use client'
import { useState } from 'react'
import { Search, Download, ChevronDown, ChevronUp, Printer, FileDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { downloadInvoicePDF } from '@/lib/pdf'
import type { Invoice } from '@/lib/actions/invoices'

type Stats = { total: number; totalRevenue: number; thisMonth: number; monthRevenue: number }

const PM_LABELS: Record<string, string> = {
  momo: 'Mobile Money', card: 'Card', transfer: 'Bank Transfer', cash: 'Cash',
}

function exportCSV(invoices: Invoice[]) {
  const rows = [
    ['Invoice #', 'Date', 'Client', 'Items', 'Subtotal', 'Discount', 'Total', 'Method', 'Status'],
    ...invoices.map(i => [
      i.invoiceNumber,
      i.createdAt.split('T')[0],
      i.clientId,
      (i.items ?? []).map(it => it.description).join('; '),
      i.subtotal,
      i.discountAmt,
      i.total,
      PM_LABELS[i.paymentMethod ?? ''] ?? i.paymentMethod ?? '',
      i.status,
    ]),
  ]
  const csv  = rows.map(r => r.map(String).map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click()
  URL.revokeObjectURL(url)
}

function printReceipt(invoice: Invoice) {
  const html = `
    <html><head><title>Receipt ${invoice.invoiceNumber}</title>
    <style>body{font-family:sans-serif;max-width:320px;margin:0 auto;padding:20px;font-size:13px}
    h2{text-align:center;margin-bottom:4px}p{text-align:center;color:#666;margin:0 0 12px}
    table{width:100%;border-collapse:collapse}td{padding:4px 0}
    .right{text-align:right}.total{font-weight:bold;border-top:1px solid #ccc;padding-top:4px}
    </style></head><body>
    <h2>Luxe Beauty Studio</h2><p>Receipt · ${invoice.invoiceNumber}</p>
    <p>${invoice.createdAt.split('T')[0]}</p>
    <table>
      ${(invoice.items ?? []).map(it => `<tr><td>${it.description}</td><td class="right">GHS ${it.total}</td></tr>`).join('')}
      ${invoice.discountAmt > 0 ? `<tr><td>Discount ${invoice.discountPct}%</td><td class="right">-GHS ${invoice.discountAmt}</td></tr>` : ''}
      <tr class="total"><td>Total</td><td class="right">GHS ${invoice.total}</td></tr>
    </table>
    <p style="margin-top:16px">Payment: ${PM_LABELS[invoice.paymentMethod ?? ''] ?? invoice.paymentMethod ?? '—'}</p>
    <p>Thank you for visiting!</p>
    </body></html>
  `
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')!
  w.onload   = () => { w.print(); URL.revokeObjectURL(url) }
}

export function InvoicesView({ invoices: initial, stats }: { invoices: Invoice[]; stats: Stats }) {
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = initial.filter(i => {
    const matchStatus = filter === 'all' || i.status === filter
    const matchSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.paymentMethod?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{stats.total} total · {formatCurrency(stats.totalRevenue)} lifetime revenue</p>
        </div>
        <button onClick={() => exportCSV(filtered)} className="btn-secondary">
          <Download className="h-5 w-5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices',    value: String(stats.total) },
          { label: 'Total Revenue',     value: formatCurrency(stats.totalRevenue) },
          { label: 'This Month',        value: String(stats.thisMonth) },
          { label: 'Month Revenue',     value: formatCurrency(stats.monthRevenue) },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search invoice number…" value={search}
            onChange={e => setSearch(e.target.value)} className="form-input pl-9 w-56" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="form-input w-36">
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="card overflow-hidden divide-y divide-gray-100">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-500">No invoices found.</div>
        )}
        {filtered.map(inv => (
          <div key={inv.id}>
            <div
              onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-gray'}`}>{inv.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {inv.createdAt.split('T')[0]} · {PM_LABELS[inv.paymentMethod ?? ''] ?? inv.paymentMethod ?? '—'}
                </p>
              </div>
              <span className="font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
              {expanded === inv.id ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </div>

            {expanded === inv.id && (
              <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                <div className="space-y-1 mt-3 text-sm">
                  {(inv.items ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-gray-700">
                      <span>{item.description} × {item.quantity}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  {inv.discountAmt > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {inv.discountPct}%</span>
                      <span>−{formatCurrency(inv.discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                    <span>Total</span><span>{formatCurrency(inv.total)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => printReceipt(inv)} className="btn-secondary text-xs">
                    <Printer className="h-5 w-5" /> Print Receipt
                  </button>
                  <button onClick={() => downloadInvoicePDF(inv)} className="btn-secondary text-xs">
                    <FileDown className="h-5 w-5" /> Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
