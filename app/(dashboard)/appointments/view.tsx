'use client'
import { useState, useTransition } from 'react'
import { Plus, ChevronLeft, ChevronRight, Search, Loader2, X, Check, Download, FileDown } from 'lucide-react'
import { updateAppointmentStatus, createAppointment, recordAppointmentPayment } from '@/lib/actions/appointments'
import { formatCurrency, cn } from '@/lib/utils'
import type { Client, Staff, Service, Apprentice } from '@/lib/types'
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
  clientId:     '',
  staffId:      '',
  apprenticeId: '',
  locationId:   '',
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
  apprentices = [],
}: {
  appointments: Apt[]
  clients: Client[]
  staff: Staff[]
  services: Service[]
  locations: Location[]
  salonSettings?: SalonSettings
  apprentices?: Apprentice[]
}) {
  const todayStr     = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().split('T')[0]

  const STATUS_RANK: Record<string, number> = {
    'in-progress': 0, confirmed: 1, pending: 2,
    'no-show': 3, completed: 4, cancelled: 5,
  }

  function sortApts(list: Apt[]): Apt[] {
    return [...list].sort((a, b) => {
      const aFuture = a.date > todayStr
      const bFuture = b.date > todayStr
      if (aFuture && bFuture) return a.date.localeCompare(b.date)
      if (aFuture)  return 1
      if (bFuture)  return -1
      if (a.date !== b.date)           return b.date.localeCompare(a.date)
      if (a.startTime !== b.startTime) return b.startTime.localeCompare(a.startTime)
      return (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3)
    })
  }

  function dateLabel(dateStr: string) {
    if (dateStr === todayStr)     return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const [appointments, setAppointments] = useState(sortApts(initial))
  const [view, setView]           = useState<'list' | 'calendar'>('list')
  const [weekOffset, setWeekOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]       = useState('')
  const [updating, setUpdating]   = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<Apt | null>(null)
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'momo' | 'bank_transfer'>('cash')
  const [discountPct, setDiscountPct] = useState(0)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [showNew, setShowNew]     = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

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

  function openPaymentModal(apt: Apt) {
    setPaymentModal(apt)
    setPayMethod('cash')
    setDiscountPct(0)
  }

  async function handlePayWithPaystack() {
    if (!paymentModal) return
    const sub   = (paymentModal.services ?? []).reduce((s: number, sv: any) => s + (sv.price ?? 0), 0)
    const disc  = Math.round(sub * discountPct / 100)
    const total = sub - disc
    const clientEmail = clients.find(c => c.id === paymentModal.clientId)?.email || 'pay@luxebeauty.com'

    await new Promise<void>((resolve, reject) => {
      if ((window as any).PaystackPop) { resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Paystack failed to load'))
      document.head.appendChild(script)
    })

    const handler = (window as any).PaystackPop.setup({
      key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email:    clientEmail,
      amount:   Math.round(total * 100),
      currency: 'GHS',
      ref:      `APT-${paymentModal.id}-${Date.now()}`,
      channels: ['card', 'mobile_money', 'bank'],
      metadata: {
        custom_fields: [
          { display_name: 'Client',    variable_name: 'client',    value: paymentModal.client?.name ?? paymentModal.clientName },
          { display_name: 'Staff',     variable_name: 'staff',     value: paymentModal.staff?.name ?? paymentModal.staffName },
          { display_name: 'Appt ID',   variable_name: 'appt_id',   value: paymentModal.id },
        ],
      },
      onSuccess: (transaction: { reference: string }) => {
        setRecordingPayment(true)
        const apt = paymentModal
        startTransition(async () => {
          const updated = await recordAppointmentPayment(apt.id, {
            paymentMethod: 'card',
            discountPct,
            paystackRef: transaction.reference,
          })
          setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, ...updated } : a))
          const { downloadServiceReceipt } = await import('@/lib/pdf')
          await downloadServiceReceipt({
            id: updated.id, clientName: updated.clientName, clientPhone: updated.clientPhone,
            staffName: updated.staffName, date: updated.date, startTime: updated.startTime,
            endTime: updated.endTime, totalPrice: updated.totalPrice, paymentStatus: updated.paymentStatus,
            locationName: updated.locationName ?? null, notes: updated.notes ?? null,
            services: (updated.services ?? []).map((s: any) => ({ name: s.name ?? s.service?.name ?? '', price: s.price ?? 0, duration: s.duration ?? 0 })),
            salonName: salonSettings?.salonName, salonTagline: salonSettings?.tagline,
          })
          setPaymentModal(null)
          setRecordingPayment(false)
        })
      },
      onCancel: () => {},
    })
    handler.openIframe()
  }

  async function handleRecordPayment() {
    if (!paymentModal) return
    setRecordingPayment(true)
    startTransition(async () => {
      const updated = await recordAppointmentPayment(paymentModal.id, {
        paymentMethod: payMethod,
        discountPct,
      })
      setAppointments(prev => prev.map(a => a.id === paymentModal.id ? { ...a, ...updated } : a))
      const { downloadServiceReceipt } = await import('@/lib/pdf')
      await downloadServiceReceipt({
        id:            updated.id,
        clientName:    updated.clientName,
        clientPhone:   updated.clientPhone,
        staffName:     updated.staffName,
        date:          updated.date,
        startTime:     updated.startTime,
        endTime:       updated.endTime,
        totalPrice:    updated.totalPrice,
        paymentStatus: updated.paymentStatus,
        locationName:  updated.locationName ?? null,
        notes:         updated.notes ?? null,
        services:      (updated.services ?? []).map((s: any) => ({
          name: s.name ?? s.service?.name ?? '', price: s.price ?? 0, duration: s.duration ?? 0,
        })),
        salonName:    salonSettings?.salonName,
        salonTagline: salonSettings?.tagline,
      })
      setPaymentModal(null)
      setRecordingPayment(false)
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
          clientId:     form.clientId,
          staffId:      form.staffId,
          apprenticeId: form.apprenticeId || null,
          locationId:   form.locationId || null,
          date,
          startTime:    form.startTime,
          endTime,
          duration,
          totalPrice,
          serviceIds:   form.serviceIds,
          notes:        form.notes || undefined,
        })
      ))

      setAppointments(prev => sortApts([...(created as any[]), ...prev]))
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
          <button onClick={exportCSV} className="btn-secondary"><Download className="h-5 w-5" /> Export</button>
          <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="h-5 w-5" /> New Appointment</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
        <div className="card overflow-hidden overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th><th>Client</th><th>Service</th><th>Staff</th>
                <th>Branch</th><th>Status</th><th>Payment</th><th className="text-right">Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastDate = ''
                return filtered.flatMap(apt => {
                  const dateChanged = apt.date !== lastDate
                  if (dateChanged) lastDate = apt.date
                  const label = dateLabel(apt.date)
                  const done  = apt.status === 'completed' || apt.status === 'cancelled'
                  const rows = []
                  if (dateChanged) {
                    rows.push(
                      <tr key={`hdr-${apt.date}`} className="pointer-events-none">
                        <td colSpan={9} className="py-1.5 px-4 bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-t border-gray-200 dark:border-gray-700">
                          {label}
                        </td>
                      </tr>
                    )
                  }
                  rows.push(
                    <tr key={apt.id} className={done ? 'opacity-40' : ''}>
                      <td>
                        <div className="font-medium text-xs">{label}</div>
                        <div className="text-gray-500 text-xs font-mono">{apt.startTime}</div>
                      </td>
                      <td className="font-medium">{apt.client?.name}</td>
                      <td className="text-gray-600">{apt.services?.map((s: any) => s.service?.name).join(', ') || '—'}</td>
                      <td className="text-gray-600">
                        <div>{apt.staff?.name}</div>
                        {apt.apprenticeName && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">{apt.apprenticeName} (apprentice)</div>
                        )}
                      </td>
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
                          ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          : apt.status === 'confirmed' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleStatusChange(apt.id, 'in-progress')} className="btn-ghost text-xs h-7 px-2">Start</button>
                              <button onClick={() => handleStatusChange(apt.id, 'no-show')} className="btn-ghost text-xs h-7 px-2 text-red-500">No-show</button>
                            </div>
                          )}
                        {apt.status === 'in-progress' && !updating && (
                          <button onClick={() => openPaymentModal(apt)} className="btn-ghost text-xs h-7 px-2 text-green-600">Complete</button>
                        )}
                        {apt.status === 'completed' && !updating && (
                          <button onClick={() => handleDownloadReceipt(apt)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Download receipt">
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                  return rows
                })
              })()}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-500">No appointments match your filters.</div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200">
            <button onClick={() => setWeekOffset(w => w - 1)} className="btn-ghost h-8 w-8 p-0 justify-center">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium">
              {weekDates[0].toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })} –{' '}
              {weekDates[6].toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost h-8 w-8 p-0 justify-center">
              <ChevronRight className="h-5 w-5" />
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
              <button onClick={() => { setShowNew(false); setForm(EMPTY_FORM) }} className="btn-ghost h-8 w-8 p-0 justify-center">
                <X className="h-5 w-5" />
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
                {apprentices.length > 0 && (
                  <div>
                    <label className="form-label">Apprentice <span className="text-gray-400 font-normal">(optional)</span></label>
                    <select
                      value={form.apprenticeId}
                      onChange={e => setForm(f => ({ ...f, apprenticeId: e.target.value }))}
                      className="form-input w-full"
                    >
                      <option value="">No apprentice</option>
                      {(form.locationId
                        ? apprentices.filter(a => !a.locationId || a.locationId === form.locationId)
                        : apprentices
                      ).filter(a => a.status === 'active').map(a => (
                        <option key={a.id} value={a.id}>{a.name} — {a.stage}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                          {selected && <Check className="h-5 w-5 text-white shrink-0" />}
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
                    className="h-5 w-5 rounded border-gray-300 text-gray-900 cursor-pointer"
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
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  {form.recurring ? `Book ${form.recurCount} Appointments` : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Record Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">{paymentModal.client?.name ?? paymentModal.clientName}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="btn-ghost h-8 w-8 p-0 justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Services breakdown */}
              <div className="space-y-1.5">
                {(paymentModal.services ?? []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{s.name ?? s.service?.name}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(s.price ?? 0)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5 flex justify-between text-sm font-medium">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span>{formatCurrency((paymentModal.services ?? []).reduce((s: number, sv: any) => s + (sv.price ?? 0), 0))}</span>
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="form-label">Discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPct}
                  onChange={e => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="form-input w-full"
                />
              </div>

              {/* Total */}
              {(() => {
                const sub = (paymentModal.services ?? []).reduce((s: number, sv: any) => s + (sv.price ?? 0), 0)
                const disc = Math.round(sub * discountPct / 100)
                const total = sub - disc
                return (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {disc > 0 && <p className="text-green-600 dark:text-green-400">−{formatCurrency(disc)} discount</p>}
                      <p className="font-semibold text-base text-gray-900 dark:text-gray-100">Total: {formatCurrency(total)}</p>
                    </div>
                    <span className={`badge ${paymentModal.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                      {paymentModal.paymentStatus}
                    </span>
                  </div>
                )
              })()}

              {/* Paystack online payment */}
              <button
                type="button"
                onClick={handlePayWithPaystack}
                disabled={recordingPayment}
                className="w-full h-11 rounded-md font-semibold text-sm text-white transition-colors cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0ba4db 0%, #00c3f7 100%)' }}
              >
                Pay via Paystack (Card / Mobile Money / Bank)
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">or record manually</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Payment method */}
              <div>
                <label className="form-label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'cash',          label: 'Cash' },
                    { value: 'card',          label: 'Card' },
                    { value: 'momo',          label: 'Mobile Money' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                  ] as const).map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPayMethod(m.value)}
                      className={cn(
                        'h-9 px-3 text-sm rounded-md border transition-colors cursor-pointer',
                        payMethod === m.value
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleRecordPayment}
                  disabled={recordingPayment}
                  className="btn-primary w-full justify-center"
                >
                  {recordingPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  Record Payment &amp; Download Receipt
                </button>
                <button
                  onClick={() => {
                    setPaymentModal(null)
                    handleStatusChange(paymentModal.id, 'completed')
                  }}
                  disabled={recordingPayment}
                  className="btn-secondary w-full justify-center text-gray-500"
                >
                  Complete Without Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
