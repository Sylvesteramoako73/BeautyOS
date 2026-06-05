'use client'
import { useState, useTransition } from 'react'
import { Plus, Search, Phone, Star, Edit2, Loader2, X, Check, Clock, MapPin, FileDown } from 'lucide-react'
import { updateStaffAvailability, createStaff, updateStaff, getStaffAppointmentsForReport } from '@/lib/actions/staff'
import { formatCurrency, cn } from '@/lib/utils'
import type { StaffWithStats } from '@/lib/types'
import type { Location } from '@/lib/actions/locations'

const EMPTY_FORM = { name: '', role: '', phone: '', specialties: '', commissionRate: 30, systemRole: 'staff' as 'owner' | 'manager' | 'staff', locationId: '' }

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type Day = typeof DAYS[number]
type DaySchedule = { enabled: boolean; start: string; end: string }
type WorkingHours = Record<Day, DaySchedule>

const DEFAULT_SCHEDULE: WorkingHours = {
  monday:    { enabled: true,  start: '09:00', end: '18:00' },
  tuesday:   { enabled: true,  start: '09:00', end: '18:00' },
  wednesday: { enabled: true,  start: '09:00', end: '18:00' },
  thursday:  { enabled: true,  start: '09:00', end: '18:00' },
  friday:    { enabled: true,  start: '09:00', end: '18:00' },
  saturday:  { enabled: false, start: '09:00', end: '17:00' },
  sunday:    { enabled: false, start: '09:00', end: '17:00' },
}

export function StaffView({ staff: initial, locations }: { staff: StaffWithStats[]; locations: Location[] }) {
  const [staff, setStaff]         = useState(initial)
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editMember, setEditMember] = useState<StaffWithStats | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [scheduleFor, setScheduleFor] = useState<StaffWithStats | null>(null)
  const [schedule, setSchedule]   = useState(DEFAULT_SCHEDULE)
  const [, startTransition]       = useTransition()

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    (s.locationName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalEarnings = staff.reduce((s, m) => s + (m.monthlyEarnings ?? 0), 0)

  function openNew() {
    setEditMember(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(member: StaffWithStats) {
    setEditMember(member)
    setForm({
      name: member.name,
      role: member.role,
      phone: member.phone ?? '',
      specialties: member.specialties,
      commissionRate: member.commissionRate,
      systemRole: (member as any).systemRole ?? 'staff',
      locationId: member.locationId ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditMember(null)
    setForm(EMPTY_FORM)
  }

  function toggleAvailability(id: string, current: boolean) {
    startTransition(async () => {
      await updateStaffAvailability(id, !current)
      setStaff(prev => prev.map(s => s.id === id ? { ...s, isAvailable: !current } : s))
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    startTransition(async () => {
      const locationId = form.locationId || null
      if (editMember) {
        const updated = await updateStaff(editMember.id, {
          name: form.name, role: form.role,
          phone: form.phone || undefined,
          specialties: form.specialties,
          commissionRate: Number(form.commissionRate),
          systemRole: form.systemRole,
          locationId,
        })
        setStaff(prev => prev.map(s => s.id === editMember.id ? { ...s, ...updated } : s))
      } else {
        const created = await createStaff({ ...form, commissionRate: Number(form.commissionRate), systemRole: form.systemRole, locationId })
        setStaff(prev => [...prev, { ...created, todayBookings: 0, completedToday: 0, monthlyEarnings: 0 } as StaffWithStats])
      }
      closeForm()
      setSaving(false)
    })
  }

  async function downloadReport(member: StaffWithStats) {
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end   = now.toISOString().split('T')[0]
    const apts  = await getStaffAppointmentsForReport(member.id, start, end)
    const { downloadStaffReportPDF } = await import('@/lib/pdf')
    await downloadStaffReportPDF(member, { start, end }, apts)
  }

  function openSchedule(member: StaffWithStats) {
    setScheduleFor(member)
    setSchedule((member as any).workingHours ?? DEFAULT_SCHEDULE)
  }

  function saveSchedule() {
    if (!scheduleFor) return
    startTransition(async () => {
      await updateStaff(scheduleFor.id, { workingHours: schedule } as any)
      setStaff(prev => prev.map(s => s.id === scheduleFor.id ? { ...s, workingHours: schedule } as any : s))
      setScheduleFor(null)
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{staff.length} team members · {staff.filter(s => s.isAvailable).length} available</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNew} className="btn-primary"><Plus className="h-5 w-5" /> Add Staff</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Members',      value: String(staff.length) },
          { label: 'Available Now',     value: String(staff.filter(s => s.isAvailable).length) },
          { label: 'Team Earnings (mo)', value: formatCurrency(totalEarnings) },
          { label: 'Avg. Rating',       value: staff.length ? (staff.reduce((s, m) => s + m.rating, 0) / staff.length).toFixed(1) + ' / 5' : '—' },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-9" />
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th>Branch</th><th>Status</th><th>Today</th>
              <th>Rating</th><th>Commission</th><th className="text-right">Earnings (mo)</th>
              <th>Specialties</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(member => (
              <tr key={member.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      {member.phone && <p className="text-xs text-gray-500">{member.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="text-gray-600">{member.role}</td>
                <td>
                  {member.locationName
                    ? <span className="flex items-center gap-1 text-xs text-gray-600"><MapPin className="h-5 w-5 shrink-0" />{member.locationName}</span>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td>
                  <button
                    onClick={() => toggleAvailability(member.id, member.isAvailable)}
                    className={cn('badge cursor-pointer hover:opacity-80', member.isAvailable ? 'badge-green' : 'badge-yellow')}
                  >
                    {member.isAvailable ? 'Available' : 'With Client'}
                  </button>
                </td>
                <td className="text-gray-700">{member.completedToday ?? 0}/{member.todayBookings ?? 0}</td>
                <td>
                  <span className="flex items-center gap-1 text-gray-700">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    {member.rating}
                  </span>
                </td>
                <td className="text-gray-600">{member.commissionRate}%</td>
                <td className="text-right font-medium">{formatCurrency(member.monthlyEarnings ?? 0)}</td>
                <td>
                  <div className="flex gap-1 flex-wrap max-w-[180px]">
                    {member.specialties.split(',').filter(Boolean).slice(0, 2).map((s: string) => (
                      <span key={s} className="badge badge-gray text-[10px]">{s.trim()}</span>
                    ))}
                    {member.specialties.split(',').filter(Boolean).length > 2 && (
                      <span className="badge badge-gray text-[10px]">+{member.specialties.split(',').length - 2}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="btn-ghost h-8 w-8 p-0 justify-center">
                        <Phone className="h-5 w-5" />
                      </a>
                    )}
                    <button onClick={() => openSchedule(member)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Working hours">
                      <Clock className="h-5 w-5" />
                    </button>
                    <button onClick={() => downloadReport(member)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Download report">
                      <FileDown className="h-5 w-5" />
                    </button>
                    <button onClick={() => openEdit(member)} className="btn-ghost h-8 w-8 p-0 justify-center">
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900">{editMember ? 'Edit Staff Member' : 'New Staff Member'}</h2>
              <button onClick={closeForm} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Role *</label>
                  <input required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Senior Stylist" className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Commission Rate (%)</label>
                  <input type="number" min={0} max={100} value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: Number(e.target.value) }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">System Access Role</label>
                  <select value={form.systemRole} onChange={e => setForm(f => ({ ...f, systemRole: e.target.value as 'owner' | 'manager' | 'staff' }))} className="form-input w-full">
                    <option value="staff">Staff — Appointments, Clients, POS</option>
                    <option value="manager">Manager — + Services, Analytics, Payroll</option>
                    <option value="owner">Owner — Full access</option>
                  </select>
                </div>
                {locations.length > 0 && (
                  <div>
                    <label className="form-label">Branch / Location</label>
                    <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} className="form-input w-full">
                      <option value="">No specific branch</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="form-label">Specialties <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} placeholder="e.g. Box Braids, Cornrows" className="form-input w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {editMember ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Working Hours Modal */}
      {scheduleFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900">Working Hours</h2>
                <p className="text-xs text-gray-500 mt-0.5">{scheduleFor.name}</p>
              </div>
              <button onClick={() => setScheduleFor(null)} className="btn-ghost h-8 w-8 p-0 justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSchedule(s => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }))}
                      className={cn('relative h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0', schedule[day].enabled ? 'bg-gray-900' : 'bg-gray-200')}
                    >
                      <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', schedule[day].enabled && 'translate-x-4')} />
                    </button>
                    <span className="text-sm capitalize text-gray-700">{day.slice(0, 3)}</span>
                  </div>
                  {schedule[day].enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={schedule[day].start}
                        onChange={e => setSchedule(s => ({ ...s, [day]: { ...s[day], start: e.target.value } }))}
                        className="form-input flex-1 text-sm"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="time"
                        value={schedule[day].end}
                        onChange={e => setSchedule(s => ({ ...s, [day]: { ...s[day], end: e.target.value } }))}
                        className="form-input flex-1 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 flex-1">Day off</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-5">
              <button onClick={() => setScheduleFor(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveSchedule} className="btn-primary">
                <Check className="h-5 w-5" /> Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
