import { TrendingUp, TrendingDown, AlertCircle, ChevronRight, Check } from 'lucide-react'
import Link from 'next/link'
import { getDashboardStats, getTodayAppointments } from '@/lib/actions/appointments'
import { getStaffWithStats } from '@/lib/actions/staff'
import { getSessionUser, getEffectiveLocationId } from '@/lib/auth'
import { formatCurrency, getGreeting } from '@/lib/utils'
import { BookingLinkCard } from '@/components/dashboard/booking-link-card'

function StatBox({ label, value, sub, up }: { label: string; value: string; sub: string; up?: boolean }) {
  return (
    <div className="stat-box">
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mb-1">{value}</p>
      <p className={`text-xs flex items-center gap-1 ${up === true ? 'text-green-600' : up === false ? 'text-red-600' : 'text-gray-500'}`}>
        {up === true  && <TrendingUp  className="h-5 w-5" />}
        {up === false && <TrendingDown className="h-5 w-5" />}
        {sub}
      </p>
    </div>
  )
}

export default async function DashboardPage() {
  const user             = await getSessionUser()
  const firstName        = user?.name.split(' ')[0] ?? 'there'
  const activeLocationId = await getEffectiveLocationId()

  const [stats, todayApts, staffList] = await Promise.all([
    getDashboardStats(activeLocationId),
    getTodayAppointments(activeLocationId),
    getStaffWithStats(activeLocationId),
  ])

  const today = new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{getGreeting()}, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today} · BeautyOS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Today's Revenue"  value={formatCurrency(stats.todayRevenue)}   sub={`${stats.completedToday} completed · ${stats.upcomingToday} upcoming`} />
        <StatBox label="Today's Bookings" value={String(stats.todayBookings)}           sub={`${stats.availableStaff} of ${stats.staffCount} staff available`} />
        <StatBox label="Monthly Revenue"  value={formatCurrency(stats.monthlyRevenue)}  sub={`${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}% vs last month`} up={stats.revenueGrowth >= 0} />
        <StatBox label="Avg. Transaction" value={formatCurrency(stats.avgTransaction)}  sub={`${stats.totalClients} active clients`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm">Today's Appointments</h2>
            <Link href="/appointments" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
              View all <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
          {todayApts.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-8 text-center">No appointments today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Staff</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {todayApts.map(apt => (
                    <tr key={apt.id}>
                      <td className="font-mono text-xs text-gray-500">{apt.startTime}</td>
                      <td className="font-medium">{apt.clientName}</td>
                      <td className="text-gray-600">{apt.services.map((s: any) => s.name).join(', ') || '—'}</td>
                      <td className="text-gray-500">{apt.staffName.split(' ')[0]}</td>
                      <td>
                        <span className={`badge ${
                          apt.status === 'completed'   ? 'badge-gray'   :
                          apt.status === 'in-progress' ? 'badge-green'  :
                          apt.status === 'confirmed'   ? 'badge-blue'   :
                          apt.status === 'cancelled'   ? 'badge-red'    : 'badge-yellow'
                        }`}>
                          {apt.status === 'in-progress' ? 'In Progress' : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </span>
                      </td>
                      <td className="text-right font-medium">{formatCurrency(apt.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-sm">Staff Status</h2>
              <Link href="/staff" className="text-xs text-gray-500 hover:text-gray-900">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {staffList.map(member => (
                <div key={member.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${member.isAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{member.completedToday}/{member.todayBookings}</span>
                </div>
              ))}
            </div>
          </div>

          <BookingLinkCard />

          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-sm">Insights</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.revenueGrowth > 0 && (
                <div className="flex gap-3 px-4 py-3">
                  <TrendingUp className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">Revenue up {stats.revenueGrowth}% this month.</p>
                </div>
              )}
              <div className="flex gap-3 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  Check <Link href="/automations" className="underline">Automations</Link> to send re-engagement messages to inactive clients.
                </p>
              </div>
              <div className="flex gap-3 px-4 py-3">
                <Check className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{stats.totalClients} active clients registered.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const revalidate = 30
