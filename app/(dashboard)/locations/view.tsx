'use client'
import { useState, useTransition } from 'react'
import { Plus, Edit2, Trash2, Loader2, MapPin, Phone, X, Check, Users, Calendar, TrendingUp } from 'lucide-react'
import { createLocation, updateLocation, deleteLocation } from '@/lib/actions/locations'
import { formatCurrency } from '@/lib/utils'
import type { LocationStats } from '@/lib/actions/locations'

const EMPTY_FORM = { name: '', address: '', phone: '' }

export function LocationsView({ locations: initial }: { locations: LocationStats[] }) {
  const [locations, setLocations] = useState(initial)
  const [showForm, setShowForm]   = useState(false)
  const [editLoc, setEditLoc]     = useState<LocationStats | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [, startTransition]       = useTransition()

  function openNew()  { setEditLoc(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(l: LocationStats) { setEditLoc(l); setForm({ name: l.name, address: l.address, phone: l.phone }); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditLoc(null); setForm(EMPTY_FORM) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (editLoc) {
      await updateLocation(editLoc.id, form)
      setLocations(prev => prev.map(l => l.id === editLoc.id ? { ...l, ...form } : l))
    } else {
      const created = await createLocation(form)
      setLocations(prev => [...prev, { ...created, staffCount: 0, monthRevenue: 0, monthBookings: 0, todayBookings: 0 }])
    }
    closeForm(); setSaving(false)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLocation(id)
      setLocations(prev => prev.filter(l => l.id !== id))
    })
  }

  const totalRevenue  = locations.reduce((s, l) => s + l.monthRevenue, 0)
  const totalBookings = locations.reduce((s, l) => s + l.monthBookings, 0)
  const totalStaff    = locations.reduce((s, l) => s + l.staffCount, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">{locations.length} branch{locations.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-5 w-5" /> Add Location</button>
      </div>

      {/* Network summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-box">
          <p className="text-xs text-gray-500 mb-2">Network Revenue (mo)</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="stat-box">
          <p className="text-xs text-gray-500 mb-2">Total Bookings (mo)</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalBookings}</p>
        </div>
        <div className="stat-box">
          <p className="text-xs text-gray-500 mb-2">Total Staff</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalStaff}</p>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editLoc ? 'Edit Location' : 'New Location'}</h3>
            <button onClick={closeForm} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Branch Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Branch" className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 30 000 0000" className="form-input w-full" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Address *</label>
                <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main Street, Accra" className="form-input w-full" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                {editLoc ? 'Save Changes' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branch cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map(loc => {
          const revPct = totalRevenue > 0 ? Math.round(loc.monthRevenue / totalRevenue * 100) : 0
          return (
            <div key={loc.id} className="card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-900 dark:bg-gray-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-white dark:text-gray-900" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{loc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loc.address}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="h-5 w-5" /> {loc.phone}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(loc)} className="btn-ghost h-8 w-8 p-0 justify-center"><Edit2 className="h-5 w-5" /></button>
                  <button onClick={() => handleDelete(loc.id)} className="btn-ghost h-8 w-8 p-0 justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="h-5 w-5" /></button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Calendar className="h-5 w-5" /> Today</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{loc.todayBookings}</p>
                  <p className="text-xs text-gray-400">bookings</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><TrendingUp className="h-5 w-5" /> This Month</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(loc.monthRevenue)}</p>
                  <p className="text-xs text-gray-400">{loc.monthBookings} bookings</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Users className="h-5 w-5" /> Staff</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{loc.staffCount}</p>
                  <p className="text-xs text-gray-400">assigned</p>
                </div>
              </div>

              {/* Revenue share bar */}
              {totalRevenue > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Revenue share</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{revPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 dark:bg-gray-300 rounded-full transition-all" style={{ width: `${revPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {locations.length === 0 && (
          <div className="col-span-2 card p-12 text-center text-sm text-gray-400">No locations yet. Add your first branch.</div>
        )}
      </div>
    </div>
  )
}
