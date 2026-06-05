'use client'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, Star, Calendar, TrendingUp,
  Gift, Edit2, Check, X, Cake, Clock, Scissors,
  User, MessageSquare, Award
} from 'lucide-react'
import { getClientWithHistory } from '@/lib/actions/clients'
import { updateClient } from '@/lib/actions/clients'
import { formatCurrency } from '@/lib/utils'

const TIER_COLORS: Record<string, string> = {
  Platinum: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
  Gold:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Silver:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  Bronze:   'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
}

const STATUS_COLORS: Record<string, string> = {
  completed:     'bg-gray-100 dark:bg-gray-800 border-l-gray-400',
  confirmed:     'bg-blue-50 dark:bg-blue-950/40 border-l-blue-400',
  'in-progress': 'bg-green-50 dark:bg-green-950/40 border-l-green-400',
  cancelled:     'bg-red-50 dark:bg-red-950/40 border-l-red-300',
  'no-show':     'bg-red-50 dark:bg-red-950/40 border-l-red-300',
  pending:       'bg-yellow-50 dark:bg-yellow-950/40 border-l-yellow-400',
}

function age(dob: string): number {
  const b = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

function isBirthdayThisMonth(dob: string): boolean {
  return new Date(dob).getMonth() === new Date().getMonth()
}

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingTags, setEditingTags]   = useState(false)
  const [notes, setNotes]               = useState('')
  const [tags, setTags]                 = useState('')
  const [, startTransition]             = useTransition()

  useEffect(() => {
    getClientWithHistory(params.id).then(d => {
      if (d) {
        setData(d)
        setNotes((d as any).notes ?? '')
        setTags((d as any).tags ?? '')
      }
    })
  }, [params.id])

  if (!data) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="card p-6 h-40 animate-pulse bg-gray-100 dark:bg-gray-800" />
    </div>
  )

  const { appointments, ...client } = data as any
  const completedApts  = appointments.filter((a: any) => a.status === 'completed')
  const avgSpend       = completedApts.length > 0
    ? Math.round(completedApts.reduce((s: number, a: any) => s + a.totalPrice, 0) / completedApts.length)
    : 0

  // Insights
  const staffCount: Record<string, number> = {}
  const svcCount:   Record<string, number> = {}
  for (const apt of completedApts) {
    if (apt.staffName) staffCount[apt.staffName] = (staffCount[apt.staffName] ?? 0) + 1
    for (const s of (apt.services ?? [])) {
      if (s.name) svcCount[s.name] = (svcCount[s.name] ?? 0) + 1
    }
  }
  const favouriteStaff   = Object.entries(staffCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const topServices      = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // Visit frequency
  const lastVisit   = completedApts[0]?.date ?? null
  const firstVisit  = completedApts[completedApts.length - 1]?.date ?? null
  const daysSinceLast = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86_400_000)
    : null

  function saveNotes() {
    startTransition(async () => {
      await updateClient(client.id, { notes })
      setData((prev: any) => ({ ...prev, notes }))
      setEditingNotes(false)
    })
  }

  function saveTags() {
    startTransition(async () => {
      await updateClient(client.id, { tags })
      setData((prev: any) => ({ ...prev, tags }))
      setEditingTags(false)
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
        <ArrowLeft className="h-5 w-5" /> Back to Clients
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-2xl font-bold flex items-center justify-center shrink-0">
              {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TIER_COLORS[client.loyaltyTier] ?? 'bg-gray-100 text-gray-600'}`}>
                  {client.loyaltyTier}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  {client.loyaltyPoints} pts
                </span>
                {client.dateOfBirth && isBirthdayThisMonth(client.dateOfBirth) && (
                  <span className="text-xs text-pink-600 dark:text-pink-400 flex items-center gap-1 font-medium">
                    <Cake className="h-5 w-5" /> Birthday this month!
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="btn-secondary text-xs">
                <Phone className="h-5 w-5" /> Call
              </a>
            )}
            <Link href="/appointments" className="btn-primary text-xs">
              <Calendar className="h-5 w-5" /> Book
            </Link>
          </div>
        </div>

        {/* Contact row */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="h-5 w-5 text-gray-400" /> {client.phone}
          </span>
          {client.email && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-5 w-5 text-gray-400" /> {client.email}
            </span>
          )}
          {client.dateOfBirth && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Cake className="h-5 w-5 text-gray-400" />
              {new Date(client.dateOfBirth).toLocaleDateString('en-GH', { day: 'numeric', month: 'long' })}
              {' '}· Age {age(client.dateOfBirth)}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Visits',   value: String(client.totalVisits), icon: Calendar },
          { label: 'Total Spent',    value: formatCurrency(client.totalSpent), icon: TrendingUp },
          { label: 'Avg. Per Visit', value: formatCurrency(avgSpend), icon: Award },
          { label: 'Last Visit',     value: daysSinceLast !== null ? `${daysSinceLast}d ago` : '—', icon: Clock },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — notes, tags, insights */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <MessageSquare className="h-5 w-5 text-gray-400" /> Notes
              </h3>
              {!editingNotes
                ? <button onClick={() => setEditingNotes(true)} className="btn-ghost h-6 w-6 p-0 justify-center"><Edit2 className="h-5 w-5" /></button>
                : <div className="flex gap-1">
                    <button onClick={saveNotes} className="btn-ghost h-6 w-6 p-0 justify-center text-green-600"><Check className="h-5 w-5" /></button>
                    <button onClick={() => { setEditingNotes(false); setNotes(client.notes ?? '') }} className="btn-ghost h-6 w-6 p-0 justify-center text-red-500"><X className="h-5 w-5" /></button>
                  </div>
              }
            </div>
            {editingNotes
              ? <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="form-input w-full h-auto py-2 resize-none text-xs" placeholder="Add client notes…" />
              : <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{client.notes || <span className="text-gray-400 italic">No notes yet.</span>}</p>
            }
          </div>

          {/* Tags */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tags</h3>
              {!editingTags
                ? <button onClick={() => setEditingTags(true)} className="btn-ghost h-6 w-6 p-0 justify-center"><Edit2 className="h-5 w-5" /></button>
                : <div className="flex gap-1">
                    <button onClick={saveTags} className="btn-ghost h-6 w-6 p-0 justify-center text-green-600"><Check className="h-5 w-5" /></button>
                    <button onClick={() => { setEditingTags(false); setTags(client.tags ?? '') }} className="btn-ghost h-6 w-6 p-0 justify-center text-red-500"><X className="h-5 w-5" /></button>
                  </div>
              }
            </div>
            {editingTags
              ? <input value={tags} onChange={e => setTags(e.target.value)} className="form-input w-full text-xs" placeholder="VIP, Bride, Regular…" />
              : <div className="flex gap-1.5 flex-wrap">
                  {(client.tags ?? '').split(',').filter(Boolean).map((t: string) => (
                    <span key={t} className="badge badge-gray text-xs">{t.trim()}</span>
                  ))}
                  {!client.tags && <span className="text-xs text-gray-400 italic">No tags.</span>}
                </div>
            }
          </div>

          {/* Insights */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights</h3>
            {favouriteStaff && (
              <div className="flex items-center gap-2 text-xs">
                <User className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Favourite stylist</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 ml-auto">{favouriteStaff}</span>
              </div>
            )}
            {topServices.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs mb-1.5">
                  <Scissors className="h-5 w-5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">Top services</span>
                </div>
                <div className="space-y-1 pl-5">
                  {topServices.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{name}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {firstVisit && (
              <div className="flex items-center gap-2 text-xs">
                <Gift className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Client since</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 ml-auto">
                  {new Date(firstVisit).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right — appointment timeline */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Appointment History</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{appointments.length} total · {completedApts.length} completed</span>
          </div>

          {appointments.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">No appointments yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[520px] overflow-y-auto">
              {appointments.map((apt: any, i: number) => (
                <div
                  key={apt.id}
                  className={`flex gap-3 px-5 py-3.5 border-l-2 ${STATUS_COLORS[apt.status] ?? 'border-l-gray-200'}`}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className={`h-2 w-2 rounded-full mt-0.5 ${
                      apt.status === 'completed' ? 'bg-gray-400' :
                      apt.status === 'confirmed' ? 'bg-blue-400' :
                      apt.status === 'cancelled' || apt.status === 'no-show' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                    {i < appointments.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {(apt.services ?? []).map((s: any) => s.name).join(', ') || '—'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {apt.staffName} · {apt.date} at {apt.startTime}
                          {apt.locationName && <span className="ml-1">· {apt.locationName}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(apt.totalPrice)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          apt.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {apt.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
