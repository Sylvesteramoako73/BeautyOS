'use client'
import { useState, useTransition } from 'react'
import { Download, Loader2, Search } from 'lucide-react'
import { getPayrollData } from '@/lib/actions/payroll'
import { formatCurrency } from '@/lib/utils'
import type { PayrollEntry } from '@/lib/actions/payroll'

function getDefaultRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end   = now.toISOString().split('T')[0]
  return { start, end }
}

function exportCSV(entries: PayrollEntry[], start: string, end: string) {
  const rows = [
    ['Name', 'Role', 'Phone', 'Appointments', 'Revenue Generated', 'Commission Rate', 'Commission Earned'],
    ...entries.map(e => [e.name, e.role, e.phone ?? '', e.appointmentsCount, formatCurrency(e.revenue), `${e.commissionRate}%`, formatCurrency(e.commission)]),
  ]
  const csv  = rows.map(r => r.map(String).map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `payroll-${start}-${end}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export function PayrollView() {
  const defaults = getDefaultRange()
  const [startDate, setStartDate]   = useState(defaults.start)
  const [endDate, setEndDate]       = useState(defaults.end)
  const [entries, setEntries]       = useState<PayrollEntry[]>([])
  const [loaded, setLoaded]         = useState(false)
  const [search, setSearch]         = useState('')
  const [, startTransition]         = useTransition()
  const [loading, setLoading]       = useState(false)

  function handleGenerate() {
    setLoading(true)
    startTransition(async () => {
      const data = await getPayrollData(startDate, endDate)
      setEntries(data)
      setLoaded(true)
      setLoading(false)
    })
  }

  const filtered = entries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue    = filtered.reduce((s, e) => s + e.revenue, 0)
  const totalCommission = filtered.reduce((s, e) => s + e.commission, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Commission report by date range</p>
        </div>
        {loaded && (
          <button onClick={() => exportCSV(filtered, startDate, endDate)} className="btn-secondary">
            <Download className="h-5 w-5" /> Export CSV
          </button>
        )}
      </div>

      {/* Date range picker */}
      <div className="card p-5">
        <div className="flex items-end gap-4">
          <div>
            <label className="form-label">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
          </div>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Generate Report
          </button>
        </div>
      </div>

      {loaded && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Staff Members',       value: String(filtered.length) },
              { label: 'Total Revenue',        value: formatCurrency(totalRevenue) },
              { label: 'Total Commissions',    value: formatCurrency(totalCommission) },
            ].map(s => (
              <div key={s.label} className="stat-box">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Filter staff…" value={search}
              onChange={e => setSearch(e.target.value)} className="form-input pl-9" />
          </div>

          <div className="card overflow-hidden overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th><th>Role</th><th>Appointments</th>
                  <th className="text-right">Revenue</th><th className="text-right">Rate</th>
                  <th className="text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center">
                          {e.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium">{e.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">{e.role}</td>
                    <td className="text-gray-700">{e.appointmentsCount}</td>
                    <td className="text-right text-gray-700">{formatCurrency(e.revenue)}</td>
                    <td className="text-right text-gray-500">{e.commissionRate}%</td>
                    <td className="text-right font-semibold text-gray-900">{formatCurrency(e.commission)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-500">No data for this period.</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Total</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{filtered.reduce((s, e) => s + e.appointmentsCount, 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{formatCurrency(totalRevenue)}</td>
                    <td></td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalCommission)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {!loaded && !loading && (
        <div className="card p-12 text-center text-sm text-gray-400">
          Select a date range and click Generate Report.
        </div>
      )}
    </div>
  )
}
