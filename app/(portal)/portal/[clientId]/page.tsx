import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getClientWithHistory } from '@/lib/actions/clients'
import { formatCurrency } from '@/lib/utils'
import { Calendar, Phone, Mail, Star, Clock, CheckCircle, XCircle, AlertCircle, Cake } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  confirmed:     { label: 'Upcoming',    icon: Calendar,     color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300' },
  'in-progress': { label: 'In Progress', icon: Clock,        color: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-300' },
  completed:     { label: 'Completed',   icon: CheckCircle,  color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' },
  cancelled:     { label: 'Cancelled',   icon: XCircle,      color: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300' },
  'no-show':     { label: 'No-show',     icon: AlertCircle,  color: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300' },
  pending:       { label: 'Pending',     icon: Clock,        color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300' },
}

const TIER_COLORS: Record<string, string> = {
  Platinum: 'bg-gray-900 text-white',
  Gold:     'bg-yellow-100 text-yellow-800',
  Silver:   'bg-gray-100 text-gray-700',
  Bronze:   'bg-orange-50 text-orange-700',
}

function isBirthdayMonth(dob: string) {
  return new Date(dob).getMonth() === new Date().getMonth()
}

export default async function ClientPortalPage({ params }: { params: { clientId: string } }) {
  const data = await getClientWithHistory(params.clientId)
  if (!data) notFound()

  const { appointments, ...client } = data as any
  const upcoming   = appointments.filter((a: any) => ['confirmed', 'pending'].includes(a.status))
  const past       = appointments.filter((a: any) => a.status === 'completed')
  const totalSpent = past.reduce((s: number, a: any) => s + a.totalPrice, 0)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Image src="/logo.png" alt="Luxe Beauty Studio" width={130} height={44} className="h-9 w-auto object-contain" />
        <Link href={`/book`} className="btn-primary text-xs">Book Appointment</Link>
      </header>

      {/* Client hero card */}
      <div className="card p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-2xl font-bold flex items-center justify-center mx-auto mb-3">
          {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{client.name}</h1>

        {client.dateOfBirth && isBirthdayMonth(client.dateOfBirth) && (
          <p className="text-sm text-pink-600 dark:text-pink-400 font-medium mt-1 flex items-center justify-center gap-1">
            <Cake className="h-5 w-5" /> Happy Birthday month! 🎂
          </p>
        )}

        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TIER_COLORS[client.loyaltyTier] ?? 'bg-gray-100 text-gray-600'}`}>
            {client.loyaltyTier} Member
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            {client.loyaltyPoints} loyalty points
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><Phone className="h-5 w-5 text-gray-400" />{client.phone}</span>
          {client.email && <span className="flex items-center gap-1.5"><Mail className="h-5 w-5 text-gray-400" />{client.email}</span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Visits', value: String(client.totalVisits) },
          { label: 'Total Spent', value: formatCurrency(totalSpent) },
          { label: 'Points', value: String(client.loyaltyPoints) },
        ].map(s => (
          <div key={s.label} className="stat-box text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Upcoming Appointments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {upcoming.map((apt: any) => {
              const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending
              const Icon = cfg.icon
              return (
                <div key={apt.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {(apt.services ?? []).map((s: any) => s.name).join(', ') || '—'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {apt.date === today ? '📅 Today' : apt.date} at {apt.startTime}
                        {apt.staffName && ` · with ${apt.staffName}`}
                      </p>
                      {apt.locationName && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📍 {apt.locationName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(apt.totalPrice)}</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${cfg.color}`}>
                        <Icon className="h-5 w-5" /> {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past appointments */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Appointment History</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{past.length} visits</span>
        </div>
        {past.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">No past appointments yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
            {past.map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {(apt.services ?? []).map((s: any) => s.name).join(', ') || '—'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{apt.date} · {apt.staffName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(apt.totalPrice)}</p>
                  <span className={`text-xs ${apt.paymentStatus === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    {apt.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book CTA */}
      <Link href="/book" className="btn-primary w-full justify-center text-sm py-3">
        <Calendar className="h-5 w-5" /> Book Your Next Appointment
      </Link>

      <footer className="text-center text-xs text-gray-400 pb-4">
        Luxe Beauty Studio · Powered by BeautyOS
      </footer>
    </div>
  )
}
