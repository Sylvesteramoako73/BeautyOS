'use client'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type AnalyticsData = {
  revenueTrend: { date: string; revenue: number; bookings: number }[]
  serviceBreakdown: { name: string; bookings: number; revenue: number; percentage: number }[]
  paymentMethods: { name: string; value: number }[]
  locationBreakdown: { name: string; revenue: number; bookings: number }[]
  kpis: {
    monthlyRevenue: number
    monthlyGrowth: number
    totalBookings: number
    newClients: number
    newClientsGrowth: number
    completionRate: number
  }
}

const KPI = ({ label, value, change, changeLabel }: { label: string; value: string; change: number; changeLabel: string }) => (
  <div className="stat-box">
    <p className="text-xs text-gray-500 mb-2">{label}</p>
    <p className="text-2xl font-semibold text-gray-900 mb-1">{value}</p>
    <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      {Math.abs(change)}% {changeLabel}
    </p>
  </div>
)

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold text-gray-900 dark:text-gray-100">
          {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const PIE_COLORS = ['#111827', '#374151', '#6B7280', '#9CA3AF']

export function AnalyticsView({ initialData }: { initialData: AnalyticsData }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  async function changePeriod(p: 'week' | 'month') {
    if (p === period) return
    setPeriod(p)
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?period=${p}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })

  return (
    <div className={`max-w-6xl mx-auto space-y-6 transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Luxe Beauty Studio · {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            {(['week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`px-3 py-1.5 text-sm capitalize cursor-pointer transition-colors ${period === p ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn-secondary"><Download className="h-5 w-5" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Monthly Revenue"  value={formatCurrency(data.kpis.monthlyRevenue)} change={data.kpis.monthlyGrowth}    changeLabel="vs last month" />
        <KPI label="Total Bookings"   value={String(data.kpis.totalBookings)}          change={0}                           changeLabel="vs last month" />
        <KPI label="New Clients"      value={String(data.kpis.newClients)}             change={data.kpis.newClientsGrowth}  changeLabel="vs last month" />
        <KPI label="Completion Rate"  value={`${data.kpis.completionRate}%`}           change={0}                           changeLabel="vs last month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue trend */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Revenue Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {period === 'week' ? 'This week' : 'Last 30 days'} · {formatCurrency(data.revenueTrend.reduce((s, d) => s + d.revenue, 0))} total
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.revenueTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#111827" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${v / 1000}k`} />
              <Tooltip content={<TooltipContent />} />
              <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#111827' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment methods */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Payment Methods</h3>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentMethods} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={2}>
                  {data.paymentMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E5E7EB' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {data.paymentMethods.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-600">{m.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Daily bookings */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Daily Bookings</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.revenueTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipContent />} />
              <Bar dataKey="bookings" fill="#111827" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by category */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Revenue by Category</h3>
          <div className="space-y-3">
            {data.serviceBreakdown.map(stat => (
              <div key={stat.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{stat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{stat.bookings} bookings</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stat.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 dark:bg-gray-100 rounded-full" style={{ width: `${stat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-location breakdown */}
      {data.locationBreakdown.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Revenue by Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.locationBreakdown.map(loc => {
              const totalRev = data.locationBreakdown.reduce((s, l) => s + l.revenue, 0)
              const pct = totalRev > 0 ? Math.round(loc.revenue / totalRev * 100) : 0
              return (
                <div key={loc.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{loc.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(loc.revenue)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loc.bookings} bookings · {pct}% of total</p>
                  <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 dark:bg-gray-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
