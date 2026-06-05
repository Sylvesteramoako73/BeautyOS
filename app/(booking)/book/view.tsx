'use client'
import { useState } from 'react'
import { Check, ArrowRight, ChevronLeft, Loader2, MapPin } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Service, Staff } from '@/lib/types'
import type { Location } from '@/lib/actions/locations'

const TIMES = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
               '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30']

function getMinDate() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]
}

export function BookingView({ services, staff, locations }: { services: Service[]; staff: Staff[]; locations: Location[] }) {
  const hasLocations = locations.length > 1

  const [step, setStep]             = useState(1)
  const [locationId, setLocationId] = useState(locations.length === 1 ? locations[0].id : '')
  const [selectedSvcs, setSvcs]     = useState<string[]>([])
  const [staffId, setStaffId]       = useState('')
  const [date, setDate]             = useState('')
  const [time, setTime]             = useState('')
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')

  const selectedLocation = locations.find(l => l.id === locationId) ?? null

  // Filter staff by selected location (if any has a locationId set)
  const staffForLocation = locationId && staff.some(s => (s as any).locationId)
    ? staff.filter(s => (s as any).locationId === locationId || !(s as any).locationId)
    : staff

  const categories = [...new Set(services.map(s => s.category))]
  const picked     = services.filter(s => selectedSvcs.includes(s.id))
  const total      = picked.reduce((s, sv) => s + sv.price, 0)
  const duration   = picked.reduce((s, sv) => s + sv.duration, 0)

  // Step labels — add Location step only when multiple locations exist
  const steps = hasLocations
    ? ['Location', 'Services', 'Date & Staff', 'Your Details']
    : ['Services', 'Date & Staff', 'Your Details']

  function toggleSvc(id: string) {
    setSvcs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds: selectedSvcs, staffId, date, startTime: time, name, phone, email, notes, locationId: locationId || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Booking failed')
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  function reset() {
    setStep(1); setSvcs([]); setStaffId(''); setDate(''); setTime('')
    setName(''); setPhone(''); setEmail(''); setNotes(''); setDone(false)
    if (locations.length !== 1) setLocationId('')
  }

  if (done) return (
    <div className="card p-8 text-center">
      <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Booking Requested!</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Thank you, {name}. We'll confirm your appointment shortly.</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{date} at {time} · {picked.map(s => s.name).join(', ')}</p>
      {selectedLocation && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{selectedLocation.name}</p>}
      <button onClick={reset} className="btn-secondary mt-6">Book Another</button>
    </div>
  )

  // Resolve which content step index maps to logical step
  const locationStep  = hasLocations ? 1 : null
  const servicesStep  = hasLocations ? 2 : 1
  const dateStaffStep = hasLocations ? 3 : 2
  const detailsStep   = hasLocations ? 4 : 3

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
              step === i + 1 ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' :
              step > i + 1  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' :
              'bg-white text-gray-400 border border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700')}>
              {step > i + 1 ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
              {label}
            </div>
            {i < steps.length - 1 && <div className="w-4 h-px bg-gray-200 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {/* Step: Location (only when multiple locations) */}
        {hasLocations && step === locationStep && (
          <div className="p-5 space-y-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Choose a branch</p>
            <div className="grid grid-cols-1 gap-3">
              {locations.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => setLocationId(loc.id)}
                  className={cn(
                    'flex items-start gap-3 border rounded-lg p-4 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors',
                    locationId === loc.id
                      ? 'border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <MapPin className={cn('h-5 w-5 mt-0.5 shrink-0', locationId === loc.id ? 'text-white dark:text-gray-200' : 'text-gray-400')} />
                  <div>
                    <p className={cn('font-semibold text-sm', locationId === loc.id ? 'text-white dark:text-gray-100' : 'text-gray-900 dark:text-gray-100')}>{loc.name}</p>
                    <p className={cn('text-xs mt-0.5', locationId === loc.id ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400')}>{loc.address}</p>
                    <p className={cn('text-xs', locationId === loc.id ? 'text-gray-300' : 'text-gray-400')}>{loc.phone}</p>
                  </div>
                  {locationId === loc.id && <Check className="h-5 w-5 text-white dark:text-gray-200 ml-auto shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Services */}
        {step === servicesStep && (
          <div>
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{cat}</p>
                </div>
                {services.filter(s => s.category === cat).map(svc => {
                  const sel = selectedSvcs.includes(svc.id)
                  return (
                    <div key={svc.id} onClick={() => toggleSvc(svc.id)}
                      className={cn('flex items-center justify-between px-5 py-3.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', sel && 'bg-gray-900 hover:bg-gray-900 dark:bg-gray-800')}>
                      <div>
                        <p className={cn('text-sm font-medium', sel ? 'text-white' : 'text-gray-900 dark:text-gray-100')}>{svc.name}</p>
                        <p className={cn('text-xs mt-0.5', sel ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400')}>{svc.duration}m{svc.description ? ` · ${svc.description}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('text-sm font-medium', sel ? 'text-white' : 'text-gray-700 dark:text-gray-300')}>{formatCurrency(svc.price)}</span>
                        {sel && <Check className="h-5 w-5 text-white" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Step: Date & Staff */}
        {step === dateStaffStep && (
          <div className="p-5 space-y-5">
            {selectedLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2">
                <MapPin className="h-5 w-5 shrink-0" />
                <span>{selectedLocation.name} · {selectedLocation.address}</span>
              </div>
            )}
            <div>
              <label className="form-label">Select Staff</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div onClick={() => setStaffId('any')}
                  className={cn('border rounded-md p-3 cursor-pointer text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors', staffId === 'any' ? 'border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-800 text-white' : 'border-gray-200 dark:border-gray-700')}>
                  <p className={cn('text-sm font-medium', staffId === 'any' ? 'text-white' : 'text-gray-900 dark:text-gray-100')}>Any Available</p>
                  <p className={cn('text-xs mt-0.5', staffId === 'any' ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400')}>We'll assign the best match</p>
                </div>
                {staffForLocation.map(m => (
                  <div key={m.id} onClick={() => setStaffId(m.id)}
                    className={cn('border rounded-md p-3 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors', staffId === m.id ? 'border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-800 text-white' : 'border-gray-200 dark:border-gray-700')}>
                    <p className={cn('text-sm font-medium', staffId === m.id ? 'text-white' : 'text-gray-900 dark:text-gray-100')}>{m.name}</p>
                    <p className={cn('text-xs mt-0.5', staffId === m.id ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400')}>{m.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date *</label>
                <input type="date" min={getMinDate()} value={date} onChange={e => setDate(e.target.value)} className="form-input w-full" required />
              </div>
              <div>
                <label className="form-label">Time *</label>
                <select value={time} onChange={e => setTime(e.target.value)} className="form-input w-full">
                  <option value="">Select time…</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {picked.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                <p className="font-medium text-gray-900 dark:text-gray-100">{picked.map(s => s.name).join(', ')}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{duration} min · {formatCurrency(total)}</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Your Details */}
        {step === detailsStep && (
          <form id="booking-form" onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="form-input w-full" placeholder="Amara Mensah" />
              </div>
              <div>
                <label className="form-label">Phone Number *</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)} className="form-input w-full" placeholder="+233 24 000 0000" />
              </div>
            </div>
            <div>
              <label className="form-label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input w-full" placeholder="you@email.com" />
            </div>
            <div>
              <label className="form-label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="form-input w-full" placeholder="Any preferences or allergies…" />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 text-sm space-y-1">
              {selectedLocation && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Branch</span><span>{selectedLocation.name}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Services</span><span>{picked.map(s => s.name).join(', ')}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Date & Time</span><span>{date} at {time}</span></div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-1 mt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
          </form>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 1 && <button onClick={() => setStep(s => s - 1)} className="btn-secondary"><ChevronLeft className="h-5 w-5" /></button>}
        {step < steps.length ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === locationStep && !locationId) ||
              (step === servicesStep && selectedSvcs.length === 0) ||
              (step === dateStaffStep && (!staffId || !date || !time))
            }
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button form="booking-form" type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-40">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Confirm Booking
          </button>
        )}
      </div>
    </div>
  )
}
