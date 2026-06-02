'use client'
import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Search, Star, Edit2, Loader2, X, BookOpen, Calendar,
  GraduationCap, Award, Check, TrendingUp, Users
} from 'lucide-react'
import { createApprentice, updateApprentice, addProgressNote } from '@/lib/actions/apprentices'
import { formatCurrency, cn } from '@/lib/utils'
import type { Apprentice, ProgressNote } from '@/lib/types'
import type { Staff } from '@/lib/types'
import type { Role } from '@/lib/actions/users'

type FormData = {
  name: string
  phone: string
  email: string
  mentorId: string
  stage: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'graduated' | 'dropped'
  startDate: string
  expectedGraduationDate: string
  specialtiesLearning: string
  stipend: string
  notes: string
}

const EMPTY_FORM: FormData = {
  name: '',
  phone: '',
  email: '',
  mentorId: '',
  stage: 'beginner',
  status: 'active',
  startDate: new Date().toISOString().split('T')[0],
  expectedGraduationDate: '',
  specialtiesLearning: '',
  stipend: '',
  notes: '',
}

const STAGE_BADGE: Record<string, string> = {
  beginner:     'badge badge-blue',
  intermediate: 'badge badge-yellow',
  advanced:     'badge badge-green',
}

const STATUS_BADGE: Record<string, string> = {
  active:    'badge badge-green',
  graduated: 'badge bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  dropped:   'badge badge-gray',
}

const STAGE_BORDER: Record<string, string> = {
  beginner:     'border-l-blue-400',
  intermediate: 'border-l-amber-400',
  advanced:     'border-l-emerald-400',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="cursor-pointer">
          <Star className={cn('h-5 w-5', n <= value ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600')} />
        </button>
      ))}
    </div>
  )
}

interface Props {
  apprentices: Apprentice[]
  staff: Staff[]
  userRole: Role
  userName: string
}

export function ApprenticesView({ apprentices: initial, staff, userRole, userName }: Props) {
  const [apprentices, setApprentices] = useState(initial)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'graduated' | 'dropped'>('all')
  const [showForm, setShowForm]       = useState(false)
  const [editItem, setEditItem]       = useState<Apprentice | null>(null)
  const [form, setForm]               = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressFor, setProgressFor] = useState<Apprentice | null>(null)
  const [noteText, setNoteText]       = useState('')
  const [noteRating, setNoteRating]   = useState(5)
  const [savingNote, setSavingNote]   = useState(false)
  const [, startTransition]           = useTransition()

  const canEdit = userRole === 'owner' || userRole === 'manager'

  const filtered = useMemo(() => apprentices.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      (a.mentorName ?? '').toLowerCase().includes(q) ||
      a.specialtiesLearning.toLowerCase().includes(q)
    )
  }), [apprentices, statusFilter, search])

  const activeCount    = apprentices.filter(a => a.status === 'active').length
  const graduatedCount = apprentices.filter(a => a.status === 'graduated').length
  const graduatingSoon = apprentices.filter(a => {
    if (a.status !== 'active' || !a.expectedGraduationDate) return false
    const days = Math.ceil((new Date(a.expectedGraduationDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 30
  }).length

  function openNew() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(a: Apprentice) {
    setEditItem(a)
    setForm({
      name:                   a.name,
      phone:                  a.phone ?? '',
      email:                  a.email ?? '',
      mentorId:               a.mentorId ?? '',
      stage:                  a.stage,
      status:                 a.status,
      startDate:              a.startDate,
      expectedGraduationDate: a.expectedGraduationDate ?? '',
      specialtiesLearning:    a.specialtiesLearning,
      stipend:                a.stipend != null ? String(a.stipend) : '',
      notes:                  a.notes ?? '',
    })
    setShowForm(true)
  }

  function openProgressNotes(a: Apprentice) {
    setProgressFor(a)
    setNoteText('')
    setNoteRating(5)
    setShowProgress(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    startTransition(async () => {
      const payload = {
        name:                   form.name,
        phone:                  form.phone || undefined,
        email:                  form.email || undefined,
        mentorId:               form.mentorId || null,
        stage:                  form.stage,
        status:                 form.status,
        startDate:              form.startDate,
        expectedGraduationDate: form.expectedGraduationDate || null,
        specialtiesLearning:    form.specialtiesLearning,
        stipend:                form.stipend ? Number(form.stipend) : null,
        notes:                  form.notes || undefined,
      }
      if (editItem) {
        const updated = await updateApprentice(editItem.id, payload)
        setApprentices(prev => prev.map(a => a.id === editItem.id ? updated : a))
      } else {
        const created = await createApprentice(payload)
        setApprentices(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      closeForm()
      setSaving(false)
    })
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!progressFor || !noteText.trim()) return
    setSavingNote(true)
    startTransition(async () => {
      await addProgressNote(progressFor.id, { note: noteText.trim(), rating: noteRating, addedBy: userName })
      const newNote: ProgressNote = {
        id:       Date.now().toString(),
        date:     new Date().toISOString().split('T')[0],
        note:     noteText.trim(),
        rating:   noteRating,
        addedBy:  userName,
      }
      const updated = { ...progressFor, progressNotes: [...(progressFor.progressNotes ?? []), newNote] }
      setProgressFor(updated)
      setApprentices(prev => prev.map(a => a.id === progressFor.id ? updated : a))
      setNoteText('')
      setNoteRating(5)
      setSavingNote(false)
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Apprentices</h1>
          <p className="page-subtitle">{activeCount} active · {graduatedCount} graduated</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Apprentice
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Apprentices', value: String(activeCount),    icon: TrendingUp, note: '' },
          { label: 'Graduating Soon',    value: String(graduatingSoon), icon: Calendar,   note: 'within 30 days' },
          { label: 'Total Graduated',    value: String(graduatedCount), icon: Award,      note: '' },
        ].map(s => (
          <div key={s.label} className="stat-box flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md shrink-0">
              <s.icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}{s.note && <span className="text-gray-400"> ({s.note})</span>}</p>
              <p className="text-xl font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          {(['all', 'active', 'graduated', 'dropped'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 capitalize transition-colors cursor-pointer',
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mentor, skills…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No apprentices found</p>
          {canEdit && !search && statusFilter === 'all' && (
            <button onClick={openNew} className="btn-primary mt-4 mx-auto">Add First Apprentice</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const skills   = a.specialtiesLearning.split(',').filter(Boolean)
            const notes    = a.progressNotes ?? []
            const daysLeft = a.expectedGraduationDate
              ? Math.ceil((new Date(a.expectedGraduationDate).getTime() - Date.now()) / 86400000)
              : null
            return (
              <div key={a.id} className={cn('card border-l-4 p-4 space-y-3', STAGE_BORDER[a.stage] ?? 'border-l-gray-300')}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center justify-center shrink-0">
                      {getInitials(a.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{a.name}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        <span className={STAGE_BADGE[a.stage] ?? 'badge badge-gray'}>{a.stage}</span>
                        <span className={STATUS_BADGE[a.status]  ?? 'badge badge-gray'}>{a.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openProgressNotes(a)}
                      className="btn-ghost h-7 w-7 p-0 justify-center"
                      title={`Progress notes (${notes.length})`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>
                    {canEdit && (
                      <button onClick={() => openEdit(a)} className="btn-ghost h-7 w-7 p-0 justify-center" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mentor */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{a.mentorName ?? <span className="italic text-gray-400">No mentor assigned</span>}</span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Started {a.startDate}</span>
                  {a.expectedGraduationDate && (
                    <>
                      <span>→</span>
                      <span className={cn(daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400 font-medium' : '')}>
                        {a.expectedGraduationDate}
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && ` (${daysLeft}d left)`}
                      </span>
                    </>
                  )}
                </div>

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {skills.slice(0, 3).map(s => (
                      <span key={s} className="badge badge-gray text-[10px]">{s.trim()}</span>
                    ))}
                    {skills.length > 3 && (
                      <span className="badge badge-gray text-[10px]">+{skills.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    {notes.length > 0 && (
                      <span className="flex ml-1">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={cn('h-2.5 w-2.5', i <= Math.round(notes.reduce((s, n) => s + n.rating, 0) / notes.length) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200 dark:text-gray-700')} />
                        ))}
                      </span>
                    )}
                  </span>
                  {a.stipend != null && <span>{formatCurrency(a.stipend)}/mo</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && canEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {editItem ? 'Edit Apprentice' : 'New Apprentice'}
              </h2>
              <button onClick={closeForm} className="btn-ghost h-7 w-7 p-0 justify-center"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Apprentice's full name"
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+233 …"
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Mentor (Staff Member)</label>
                  <select
                    value={form.mentorId}
                    onChange={e => setForm(f => ({ ...f, mentorId: e.target.value }))}
                    className="form-input w-full"
                  >
                    <option value="">No mentor assigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Stage *</label>
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value as FormData['stage'] }))}
                    className="form-input w-full"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                {editItem && (
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as FormData['status'] }))}
                      className="form-input w-full"
                    >
                      <option value="active">Active</option>
                      <option value="graduated">Graduated</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Start Date *</label>
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Expected Graduation</label>
                  <input
                    type="date"
                    value={form.expectedGraduationDate}
                    onChange={e => setForm(f => ({ ...f, expectedGraduationDate: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Monthly Stipend (GHS)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.stipend}
                    onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))}
                    placeholder="0"
                    className="form-input w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Skills / Specialties Learning <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input
                    value={form.specialtiesLearning}
                    onChange={e => setForm(f => ({ ...f, specialtiesLearning: e.target.value }))}
                    placeholder="e.g. Box Braids, Cornrows, Locs"
                    className="form-input w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="form-input w-full h-auto py-2"
                    placeholder="Any additional notes…"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editItem ? 'Save Changes' : 'Add Apprentice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Notes Modal */}
      {showProgress && progressFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Progress Notes</h2>
                <p className="text-xs text-gray-500 mt-0.5">{progressFor.name}</p>
              </div>
              <button onClick={() => setShowProgress(false)} className="btn-ghost h-7 w-7 p-0 justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Existing notes timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(progressFor.progressNotes ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No progress notes yet. Add the first one below.</p>
              ) : (
                [...(progressFor.progressNotes ?? [])].reverse().map(n => (
                  <div key={n.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{n.date} · {n.addedBy}</span>
                      <div className="flex shrink-0">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={cn('h-3 w-3', i <= n.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200 dark:text-gray-700')} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{n.note}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add note */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 shrink-0">
              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <label className="form-label">Add Evaluation Note</label>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="Skills practiced, areas of improvement, achievements…"
                    className="form-input w-full h-auto py-2"
                  />
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="form-label mb-0">Rating</span>
                    <StarRating value={noteRating} onChange={setNoteRating} />
                  </div>
                  <button type="submit" disabled={savingNote || !noteText.trim()} className="btn-primary">
                    {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
