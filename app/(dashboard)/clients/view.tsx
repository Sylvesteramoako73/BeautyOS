'use client'
import { useState, useTransition } from 'react'
import { Plus, Search, ChevronDown, ChevronUp, Phone, Mail, Calendar, Loader2, ExternalLink, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient, deleteClient } from '@/lib/actions/clients'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client } from '@/lib/types'

interface Props { clients: Client[] }

const TIER_BADGE: Record<string, string> = {
  Platinum: 'badge-gray',
  Gold: 'badge-yellow',
  Silver: 'badge-gray',
  Bronze: 'badge-gray',
}

export function ClientsView({ clients: initial }: Props) {
  const router = useRouter()
  const [clients, setClients]   = useState<Client[]>(initial)
  const [search, setSearch]     = useState('')
  const [tier, setTier]         = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sort, setSort]         = useState<{ col: string; dir: 'asc'|'desc' }>({ col: 'name', dir: 'asc' })
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', dateOfBirth: '' })

  const toggleSort = (col: string) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })

  const SortIcon = ({ col }: { col: string }) =>
    sort.col === col
      ? sort.dir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
      : null

  let filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? '').toLowerCase().includes(q)) &&
      (tier === 'all' || c.loyaltyTier === tier)
  })

  filtered = [...filtered].sort((a, b) => {
    const d = sort.dir === 'asc' ? 1 : -1
    if (sort.col === 'name')   return a.name.localeCompare(b.name) * d
    if (sort.col === 'visits') return (a.totalVisits - b.totalVisits) * d
    if (sort.col === 'spent')  return (a.totalSpent - b.totalSpent) * d
    if (sort.col === 'points') return (a.loyaltyPoints - b.loyaltyPoints) * d
    return 0
  })

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const created = await createClient(form)
      setClients(prev => [...prev, created])
      setForm({ name: '', phone: '', email: '', notes: '', dateOfBirth: '' })
      setShowForm(false)
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} clients · {formatCurrency(totalRevenue)} lifetime value</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Client
        </button>
      </div>

      {/* Add client form */}
      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">New Client</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Full Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="form-input w-full" /></div>
            <div><label className="form-label">Phone *</label><input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="form-input w-full" /></div>
            <div><label className="form-label">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="form-input w-full" /></div>
            <div><label className="form-label">Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({...f, dateOfBirth: e.target.value}))} className="form-input w-full" /></div>
            <div className="col-span-2"><label className="form-label">Notes</label><input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="form-input w-full" /></div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients',   value: clients.length },
          { label: 'VIP Clients',     value: clients.filter(c => c.tags.includes('VIP')).length },
          { label: 'Avg. Spend',      value: formatCurrency(clients.length ? Math.round(totalRevenue / clients.length) : 0) },
          { label: 'Total Revenue',   value: formatCurrency(totalRevenue) },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-9 w-64" />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="form-input w-36">
          <option value="all">All Tiers</option>
          {['Platinum', 'Gold', 'Silver', 'Bronze'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="cursor-pointer" onClick={() => toggleSort('name')}>Name <SortIcon col="name" /></th>
              <th>Contact</th>
              <th>Tier</th>
              <th className="cursor-pointer" onClick={() => toggleSort('visits')}>Visits <SortIcon col="visits" /></th>
              <th className="cursor-pointer" onClick={() => toggleSort('spent')}>Total Spent <SortIcon col="spent" /></th>
              <th className="cursor-pointer" onClick={() => toggleSort('points')}>Points <SortIcon col="points" /></th>
              <th>Last Visit</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => (
              <>
                <tr key={client.id} onClick={() => setExpanded(expanded === client.id ? null : client.id)} className="cursor-pointer">
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{client.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/clients/${client.id}`) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700"
                        title="View profile"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs text-gray-600">{client.phone}</div>
                    {client.email && <div className="text-xs text-gray-400">{client.email}</div>}
                  </td>
                  <td><span className={`badge ${TIER_BADGE[client.loyaltyTier] ?? 'badge-gray'}`}>{client.loyaltyTier}</span></td>
                  <td className="text-gray-700">{client.totalVisits}</td>
                  <td className="font-medium">{formatCurrency(client.totalSpent)}</td>
                  <td className="text-gray-700">{client.loyaltyPoints}</td>
                  <td className="text-gray-500 text-xs">{client.lastVisitAt ? formatDate(new Date(client.lastVisitAt), 'short') : '—'}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {client.tags.split(',').filter(Boolean).slice(0, 2).map(tag => (
                        <span key={tag} className="badge badge-gray">{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
                {expanded === client.id && (
                  <tr key={`${client.id}-exp`} className="bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
                          <div className="space-y-1.5 text-gray-700">
                            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" />{client.phone}</div>
                            {client.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" />{client.email}</div>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Loyalty</p>
                          <p className="text-sm text-gray-700">{client.loyaltyTier} · {client.loyaltyPoints} points</p>
                          <p className="text-xs text-gray-500 mt-1">Total spent: {formatCurrency(client.totalSpent)}</p>
                        </div>
                        <div>
                          {client.notes && (
                            <>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{client.notes}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button className="btn-secondary"><Calendar className="h-3.5 w-3.5" /> Book Appointment</button>
                        {client.phone && <a href={`tel:${client.phone}`} className="btn-secondary"><Phone className="h-3.5 w-3.5" /> Call</a>}
                        {client.email && <a href={`mailto:${client.email}`} className="btn-secondary"><Mail className="h-3.5 w-3.5" /> Email</a>}
                        <button
                          className="btn-secondary"
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/${client.id}`) }}
                          title="Copy client portal link"
                        >
                          <Link2 className="h-3.5 w-3.5" /> Portal Link
                        </button>
                        <button
                          className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950 ml-auto"
                          onClick={() => { startTransition(async () => { await deleteClient(client.id); setClients(p => p.filter(c => c.id !== client.id)) }) }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-gray-500">No clients match your search.</div>}
      </div>
    </div>
  )
}
