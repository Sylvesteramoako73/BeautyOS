'use client'
import { useState, useTransition } from 'react'
import { Plus, ChevronLeft, ChevronRight, Search, Loader2, X, Check, Download, FileDown } from 'lucide-react'
import { updateAppointmentStatus, createAppointment } from '@/lib/actions/appointments'
import { formatCurrency, cn } from '@/lib/utils'
import type { Client, Staff, Service } from '@/lib/types'
import type { Location } from '@/lib/actions/locations'
import type { SalonSettings } from '@/lib/actions/settings'

type Apt = any

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

function getWeekDates(offset = 0) {
  const today = new Date()
  const day  = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(diff + i)
    return d
  })
}

const STATUS_BADGE: Record<string, string> = {
  confirmed:     'badge-blue',
  'in-progress': 'badge-green',
  completed:     'badge-gray',
  cancelled:     'badge-red',
  pending:       'badge-yellow',
  'no-show':     'badge-red',
}

const EMPTY_FORM = {
  clientId:   '',
  staffId:    '',
  locationId: '',
  date:       new Date().toISOString().split('T')[0],
  startTime:  '09:00',
  notes:      '',
  serviceIds: [] as string[],
  recurring:  false,
  recurFrequency: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
  recurCount: 4,
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function recurringDates(startDate: string, frequency: 'weekly' | 'biweekly' | 'monthly', count: number): string[] {
  const dates: string[] = [startDate]
  for (let i = 1; i < count; i++) {
    if (frequency === 'weekly')   dates.push(addWeeks(startDate, i))
    else if (frequency === 'biweekly') dates.push(addWeeks(startDate, i * 2))
    else dates.push(addMonths(startDate, i))
  }
  return dates
}

export function AppointmentsView({
  appointments: initial,
  clients,
  staff,
  services,
  locations,
  salonSettings,
}: {
  appointments: Apt[]
  clients: Client[]
  staff: Staff[]
  services: Service[]
  locations: Location[]
  salonSettings?: SalonSettings
}) {
  const [appointments, setAppointments] = useState(initial)
  const [view, setView]           = useState<'list' | 'calendar'>('list')
  const [weekOffset, setWeekOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]       = useState('')
  const [updating, setUpdating]   = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  const todayStr = new Date().toISOString().split('T')[0]

  function exportCSV() {
    const rows = [
      ['Date', 'Time', 'Client', 'Phone', 'Services', 'Staff', 'Status', 'Payment', 'Amount'],
      ...filtered.map(a => [
        a.date, a.startTime, a.clientName, a.clientPhone,
        (a.services ?? []).map((s: any) => s.name).join('; '),
        a.staffName, a.status, a.paymentStatus, a.totalPrice,
      ]),
    ]
    const csv  = rows.map(r => r.map(String).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'appointments.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = appointments.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchSearch =
      a.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.services?.some((s: any) => s.service?.name?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      setUpdating(id)
      await updateAppointmentStatus(id, status)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      setUpdating(null)
    })
  }

  async function handleDownloadReceipt(apt: Apt) {
    const { downloadServiceReceipt } = await import('@/lib/pdf')
    await downloadServiceReceipt({
      id:            apt.id,
      clientName:    apt.clientName ?? apt.client?.name ?? '',
      clientPhone:   apt.clientPhone ?? apt.client?.phone ?? '',
      staffName:     apt.staffName ?? apt.staff?.name ?? '',
      date:          apt.date,
      startTime:     apt.startTime,
      endTime:       apt.endTime,
      totalPrice:    apt.totalPrice,
      paymentStatus: apt.paymentStatus,
      locationName:  apt.locationName ?? null,
      notes:         apt.notes ?? null,
      services:      (apt.services ?? []).map((s: any) => ({
        name:     s.name ?? s.service?.name ?? '',
        price:    s.price ?? 0,
        duration: s.duration ?? 0,
      })),
      salonName:    salonSettings?.salonName,
      salonTagline: salonSettings?.tagline,
    })
  }

  function toggleService(id: string) {
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter(s => s !== id)
        : [...f.serviceIds, id],
    }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.staffId || form.serviceIds.length === 0) return
    setSubmitting(true)
    startTransition(async () => {
      const selectedServices = services.filter(s => form.serviceIds.includes(s.id))
      const duration   = selectedServices.reduce((s, sv) => s + sv.duration, 0)
      const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0)
      const [h, m]     = form.startTime.split(':').map(Number)
      const endMin     = h * 60 + m + duration
      const endTime    = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

      const dates = form.recurring
        ? recurringDates(form.date, form.recurFrequency, form.recurCount)
        : [form.date]

      const created = await Promise.all(dates.map(date =>
        createAppointment({
          clientId:   form.clientId,
          staffId:    form.staffId,
          locationId: form.locationId || null,
          date,
          startTime:  form.startTime,
          endTime,
          duration,
          totalPrice,
          serviceIds: form.serviceIds,
          notes:      form.notes || undefined,
        })
      ))

      setAppointments(prev => [...(created as any[]), ...prev])
      setForm(EMPTY_FORM)
      setShowNew(false)
      setSubmitting(false)
    })
  }

  const selectedServices = services.filter(s => form.serviceIds.includes(s.id))
  const estimatedTotal   = selectedServices.reduce((s, sv) => s + sv.price, 0)
  const estimatedDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0)

  const weekDates = getWeekDates(weekOffset)

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">
            {appointments.length} total · {appointments.filter(a => a.status === 'confirmed').length} upcoming
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
          <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="h-4 w-4" /> New Appointment</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search client or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 w-56"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input w-36">
          {['all','confirmed','in-progress','completed','pending','cancelled','no-show'].map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </option>
          ))}
        </select>
        <div className="flex border border-gray-200 rounded-md overflow-hidden ml-auto">
          {(['list', 'calendar'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors cursor-pointer capitalize',
                view === v ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th><th>Client</th><th>Service</th><th>Staff</th>
                <th>Branch</th><th>Status</th><th>Payment</th><th className="text-right">Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(apt => (
                <tr key={apt.id}>
                  <td>
                    <div className="font-medium text-xs">{apt.date === todayStr ? 'Today' : apt.date}</div>
                    <div className="text-gray-500 text-xs font-mono">{apt.startTime}</div>
                  </td>
                  <td className="font-medium">{apt.client?.name}</td>
                  <td className="text-gray-600">{apt.services?.map((s: any) => s.service?.name).join(', ') || '—'}</td>
                  <td className="text-gray-600">{apt.staff?.name}</td>
                  <td className="text-gray-500 text-xs">{apt.locationName || apt.room?.name || '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[apt.status] ?? 'badge-gray'}`}>
                      {apt.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${apt.paymentStatus === 'paid' ? 'badge-green' : apt.paymentStatus === 'partial' ? 'badge-yellow' : 'badge-gray'}`}>
                      {apt.paymentStatus}
                    </span>
                  </td>
                  <td className="text-right font-medium">{formatCurrency(apt.totalPrice)}</td>
                  <td>
                    {updating === apt.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      : apt.status === 'confirmed' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatusChange(apt.id, 'in-progress')} className="btn-ghost text-xs h-7 px-2">Start</button>
                          <button onClick={() => handleStatusChange(apt.id, 'no-show')} className="btn-ghost text-xs h-7 px-2 text-red-500">No-show</button>
                        </div>
                      )}
                    {apt.status === 'in-progress' && !updating && (
                      <button onClick={() => handleStatusChange(apt.id, 'completed')} className="btn-ghost text-xs h-7 px-2 text-green-600">Complete</button>
                    )}
                    {apt.status === 'completed' && !updating && (
                      <button onClick={() => handleDownloadReceipt(apt)} className="btn-ghost h-7 w-7 p-0 justify-center" title="Download receipt">
                        <FileDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-500">No appointments match your filters.</div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
            <button onClick={() => setWeekOffset(w => w - 1)} className="btn-ghost h-7 w-7 p-0 justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {weekDates[0].toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })} –{' '}
              {weekDates[6].toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost h-7 w-7 p-0 justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer">
                Today
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-8 border-b border-gray-200">
                <div className="py-2 px-3 text-xs text-gray-400" />
                {weekDates.map((date, i) => {
                  const isToday = date.toISOString().split('T')[0] === todayStr
                  return (
                    <div key={i} className={cn('py-2 px-3 text-center border-l border-gray-100', isToday && 'bg-gray-50')}>
                      <p className={cn('text-xs font-medium', isToday ? 'text-gray-900' : 'text-gray-500')}>{DAYS[i]}</p>
                      <p className={cn('text-sm font-semibold mt-0.5', isToday ? 'text-gray-900' : 'text-gray-700')}>{date.getDate()}</p>
                    </div>
                  )
                })}
              </div>
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                  <div className="py-2 px-3 text-xs text-gray-400 font-mono">
                    {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                  </div>
                  {weekDates.map((date, di) => {
                    const dateStr = date.toISOString().split('T')[0]
                    const slotApts = appointments.filter(a => {
                      const [h] = a.startTime.split(':').map(Number)
                      return a.date === dateStr && h === hour
                    })
                    return (
                      <div key={di} className={cn('min-h-[40px] px-1 py-1 border-l border-gray-100', dateStr === todayStr && 'bg-gray-50/50')}>
                        {slotApts.map(apt => (
                          <div key={apt.id} className="text-xs px-2 py-1 rounded mb-1 border-l-2 bg-gray-100 dark:bg-gray-700 border-gray-700 dark:border-gray-400 truncate">
                            <span className="font-medium">{apt.client?.name?.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Appointment</h2>
              <button onClick={() => { setShowNew(false); setForm(EMPTY_FORM) }} className="btn-ghost h-7 w-7 p-0 justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {/* Location selector — filters staff list */}
              {locations.length > 0 && (
                <div>
                  <label className="form-label">Branch / Location</label>
                  <select
                    value={form.locationId}
                    onChange={e => setForm(f => ({ ...f, locationId: e.target.value, staffId: '' }))}
                    className="form-input w-full"
                  >
                    <option value="">Any location</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Client *</label>
                  <select
                    required
                    value={form.clientId}
                    onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                    className="form-input w-full"
                  >
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Staff *</label>
                  <select
                    required
                    value={form.staffId}
                    onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                    className="form-input w-full"
                  >
                    <option value="">Select staff…</option>
                    {(form.locationId
                      ? staff.filter(s => !(s as any).locationId || (s as any).locationId === form.locationId)
                      : staff
                    ).map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Services * <span className="text-gray-400 font-normal">(select one or more)</span></label>
                <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {services.map(svc => {
                    const selected = form.serviceIds.includes(svc.id)
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        className={cn(
                          'flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors',
                          selected && 'bg-gray-900 hover:bg-gray-900'
                        )}
                      >
                        <div>
                          <p className={cn('text-sm font-medium', selected ? 'text-white' : 'text-gray-900')}>{svc.name}</p>
                          <p className={cn('text-xs', selected ? 'text-gray-300' : 'text-gray-500')}>
                            {svc.category} · {svc.duration}m
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('text-sm font-medium', selected ? 'text-white' : 'text-gray-700')}>
                            {formatCurrency(svc.price)}
                          </span>
                          {selected && <Check className="h-4 w-4 text-white shrink-0" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions…"
                  className="form-input w-full"
                />
              </div>

              {/* Recurring */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.recurring}
                    onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-900">Recurring appointment</span>
                </label>
                {form.recurring && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="form-label">Frequency</label>
                      <select
                        value={form.recurFrequency}
                        onChange={e => setForm(f => ({ ...f, recurFrequency: e.target.value as any }))}
                        className="form-input w-full"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Occurrences</label>
                      <select
                        value={form.recurCount}
                        onChange={e => setForm(f => ({ ...f, recurCount: Number(e.target.value) }))}
                        className="form-input w-full"
                      >
                        {[2, 3, 4, 6, 8, 12].map(n => (
                          <option key={n} value={n}>{n} appointments</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                      Will create {form.recurCount} appointments starting {form.date},
                      {' '}{form.recurFrequency === 'weekly' ? 'every week' : form.recurFrequency === 'biweekly' ? 'every 2 weeks' : 'every month'}.
                    </div>
                  </div>
                )}
              </div>

              {form.serviceIds.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md px-4 py-3 text-sm flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{estimatedDuration}m · {selectedServices.map(s => s.name).join(', ')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(estimatedTotal)}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setShowNew(false); setForm(EMPTY_FORM) }} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.serviceIds.length === 0}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {form.recurring ? `Book ${form.recurCount} Appointments` : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
