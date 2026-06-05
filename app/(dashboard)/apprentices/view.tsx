'use client'
import { useState, useTransition, useMemo } from 'react'
import {
  Plus, Search, Star, Edit2, Loader2, X, BookOpen, Calendar,
  GraduationCap, Award, Check, TrendingUp, Users, ListTodo,
  CalendarCheck, Circle, Clock, CheckCircle, Trash2, Download,
} from 'lucide-react'
import { createApprentice, updateApprentice, addProgressNote, updateSkillSignOff } from '@/lib/actions/apprentices'
import { getTasksForApprentice, createTask, updateTaskStatus, deleteTask } from '@/lib/actions/apprentice-tasks'
import { getAttendanceForApprentice, logAttendance } from '@/lib/actions/apprentice-attendance'
import { formatCurrency, cn } from '@/lib/utils'
import type { Apprentice, ProgressNote, ApprenticeTask, AttendanceRecord, SkillSignOff } from '@/lib/types'
import type { Staff } from '@/lib/types'
import type { Role } from '@/lib/actions/users'
import type { Location } from '@/lib/actions/locations'

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function elapsed(startDate: string): string {
  const months = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (30.44 * 86400000)
  )
  if (months < 1) return 'Less than 1 month'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${months} month${months !== 1 ? 's' : ''}`
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`
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

const TASK_NEXT: Record<ApprenticeTask['status'], ApprenticeTask['status']> = {
  pending: 'in_progress', in_progress: 'completed', completed: 'pending',
}
const SKILL_NEXT: Record<SkillSignOff['status'], SkillSignOff['status']> = {
  not_started: 'in_progress', in_progress: 'signed_off', signed_off: 'not_started',
}

const STAGE_BORDER: Record<string, string> = {
  beginner: 'border-l-blue-400', intermediate: 'border-l-amber-400', advanced: 'border-l-emerald-400',
}
const STAGE_BADGE: Record<string, string> = {
  beginner: 'badge badge-blue', intermediate: 'badge badge-yellow', advanced: 'badge badge-green',
}
const STATUS_BADGE: Record<string, string> = {
  active:    'badge badge-green',
  graduated: 'badge bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  dropped:   'badge badge-gray',
}
const PRIORITY_BADGE: Record<string, string> = {
  low: 'badge badge-gray', medium: 'badge badge-yellow', high: 'badge badge-red',
}
const ATTEND_BADGE: Record<string, string> = {
  present: 'badge badge-green', absent: 'badge badge-red', late: 'badge badge-yellow',
}

// ── form type ─────────────────────────────────────────────────────────────────

type FormData = {
  name: string; phone: string; email: string; mentorId: string; locationId: string
  stage: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'graduated' | 'dropped'
  startDate: string; expectedGraduationDate: string
  programDurationMonths: string
  specialtiesLearning: string; stipend: string; notes: string
}
const EMPTY_FORM: FormData = {
  name: '', phone: '', email: '', mentorId: '', locationId: '',
  stage: 'beginner', status: 'active',
  startDate: new Date().toISOString().split('T')[0],
  expectedGraduationDate: '', programDurationMonths: '',
  specialtiesLearning: '', stipend: '', notes: '',
}

type TaskForm = { title: string; description: string; dueDate: string; priority: 'low' | 'medium' | 'high' }
const EMPTY_TASK: TaskForm = { title: '', description: '', dueDate: '', priority: 'medium' }

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  apprentices: Apprentice[]
  staff: Staff[]
  locations: Location[]
  userRole: Role
  userName: string
  defaultLocationId?: string | null
}

export function ApprenticesView({ apprentices: initial, staff, locations, userRole, userName, defaultLocationId }: Props) {
  const [apprentices, setApprentices] = useState(initial)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'graduated' | 'dropped'>('all')
  const [saving, setSaving]           = useState(false)
  const [, startTransition]           = useTransition()

  // ── add/edit modal
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Apprentice | null>(null)
  const [form, setForm]         = useState<FormData>(EMPTY_FORM)

  // ── progress notes modal
  const [progressFor, setProgressFor] = useState<Apprentice | null>(null)
  const [noteText, setNoteText]       = useState('')
  const [noteRating, setNoteRating]   = useState(5)
  const [savingNote, setSavingNote]   = useState(false)

  // ── tasks modal
  const [taskFor, setTaskFor]         = useState<Apprentice | null>(null)
  const [tasks, setTasks]             = useState<ApprenticeTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm]       = useState<TaskForm>(EMPTY_TASK)
  const [savingTask, setSavingTask]   = useState(false)

  // ── skills modal
  const [skillFor, setSkillFor]       = useState<Apprentice | null>(null)
  const [savingSkill, setSavingSkill] = useState<string | null>(null)

  // ── attendance modal
  const [attendFor, setAttendFor]     = useState<Apprentice | null>(null)
  const [attendance, setAttendance]   = useState<AttendanceRecord[]>([])
  const [loadingAttend, setLoadingAttend] = useState(false)
  const [attendForm, setAttendForm]   = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'present' as 'present' | 'absent' | 'late',
    notes: '',
  })
  const [savingAttend, setSavingAttend] = useState(false)

  const canEdit = userRole === 'owner' || userRole === 'manager'

  // ── derived ────────────────────────────────────────────────────────────────

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

  // ── add/edit handlers ──────────────────────────────────────────────────────

  function openNew() {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, locationId: defaultLocationId ?? '' })
    setShowForm(true)
  }
  function openEdit(a: Apprentice) {
    setEditItem(a)
    setForm({
      name: a.name, phone: a.phone ?? '', email: a.email ?? '',
      mentorId: a.mentorId ?? '', locationId: a.locationId ?? '',
      stage: a.stage, status: a.status,
      startDate: a.startDate, expectedGraduationDate: a.expectedGraduationDate ?? '',
      programDurationMonths: a.programDurationMonths != null ? String(a.programDurationMonths) : '',
      specialtiesLearning: a.specialtiesLearning, stipend: a.stipend != null ? String(a.stipend) : '',
      notes: a.notes ?? '',
    })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditItem(null); setForm(EMPTY_FORM) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    startTransition(async () => {
      const payload = {
        name: form.name, phone: form.phone || undefined, email: form.email || undefined,
        mentorId: form.mentorId || null, locationId: form.locationId || null,
        stage: form.stage, status: form.status,
        startDate: form.startDate, expectedGraduationDate: form.expectedGraduationDate || null,
        programDurationMonths: form.programDurationMonths ? Number(form.programDurationMonths) : null,
        specialtiesLearning: form.specialtiesLearning,
        stipend: form.stipend ? Number(form.stipend) : null,
        notes: form.notes || undefined,
      }
      if (editItem) {
        const updated = await updateApprentice(editItem.id, payload)
        setApprentices(prev => prev.map(a => a.id === editItem.id ? updated : a))
      } else {
        const created = await createApprentice(payload)
        setApprentices(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      closeForm(); setSaving(false)
    })
  }

  // ── progress notes handlers ────────────────────────────────────────────────

  function openProgress(a: Apprentice) {
    setProgressFor(a); setNoteText(''); setNoteRating(5)
  }
  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!progressFor || !noteText.trim()) return
    setSavingNote(true)
    startTransition(async () => {
      await addProgressNote(progressFor.id, { note: noteText.trim(), rating: noteRating, addedBy: userName })
      const newNote: ProgressNote = {
        id: Date.now().toString(), date: new Date().toISOString().split('T')[0],
        note: noteText.trim(), rating: noteRating, addedBy: userName,
      }
      const updated = { ...progressFor, progressNotes: [...(progressFor.progressNotes ?? []), newNote] }
      setProgressFor(updated)
      setApprentices(prev => prev.map(a => a.id === progressFor.id ? updated : a))
      setNoteText(''); setNoteRating(5); setSavingNote(false)
    })
  }

  // ── task handlers ──────────────────────────────────────────────────────────

  function openTasks(a: Apprentice) {
    setTaskFor(a); setTasks([]); setShowTaskForm(false); setTaskForm(EMPTY_TASK)
    setLoadingTasks(true)
    startTransition(async () => {
      const t = await getTasksForApprentice(a.id)
      setTasks(t); setLoadingTasks(false)
    })
  }
  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskFor || !taskForm.title.trim()) return
    setSavingTask(true)
    startTransition(async () => {
      const created = await createTask({
        apprenticeId: taskFor.id, title: taskForm.title,
        description: taskForm.description || undefined,
        dueDate: taskForm.dueDate || null, priority: taskForm.priority,
        assignedBy: userName,
      })
      setTasks(prev => [created, ...prev])
      setTaskForm(EMPTY_TASK); setShowTaskForm(false); setSavingTask(false)
    })
  }
  function cycleTaskStatus(task: ApprenticeTask) {
    const next = TASK_NEXT[task.status]
    startTransition(async () => {
      await updateTaskStatus(task.id, next)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    })
  }
  function handleDeleteTask(id: string) {
    startTransition(async () => {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    })
  }

  // ── skill sign-off handlers ────────────────────────────────────────────────

  function openSkills(a: Apprentice) { setSkillFor(a) }
  function cycleSkill(skill: string, current: SkillSignOff['status']) {
    if (!skillFor) return
    const next = SKILL_NEXT[current]
    setSavingSkill(skill)
    startTransition(async () => {
      await updateSkillSignOff(skillFor.id, skill, next, userName)
      const updated = {
        ...skillFor,
        skillSignOffs: skillFor.skillSignOffs.map(s =>
          s.skill === skill
            ? { skill, status: next, signedOffBy: next === 'signed_off' ? userName : null, signedOffAt: next === 'signed_off' ? new Date().toISOString().split('T')[0] : null }
            : s
        ),
      }
      setSkillFor(updated)
      setApprentices(prev => prev.map(a => a.id === skillFor.id ? updated : a))
      setSavingSkill(null)
    })
  }

  // ── attendance handlers ────────────────────────────────────────────────────

  function openAttendance(a: Apprentice) {
    setAttendFor(a); setAttendance([])
    setAttendForm({ date: new Date().toISOString().split('T')[0], status: 'present', notes: '' })
    setLoadingAttend(true)
    startTransition(async () => {
      const records = await getAttendanceForApprentice(a.id)
      setAttendance(records); setLoadingAttend(false)
    })
  }
  function handleLogAttendance(e: React.FormEvent) {
    e.preventDefault()
    if (!attendFor) return
    setSavingAttend(true)
    startTransition(async () => {
      const record = await logAttendance({
        apprenticeId: attendFor.id, date: attendForm.date,
        status: attendForm.status, notes: attendForm.notes || undefined,
        recordedBy: userName,
      })
      setAttendance(prev => {
        const filtered = prev.filter(r => r.date !== record.date)
        return [record, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
      setSavingAttend(false)
    })
  }

  // ── certificate ────────────────────────────────────────────────────────────

  async function handleCertificate(a: Apprentice) {
    const { downloadApprenticeCertificate } = await import('@/lib/pdf')
    await downloadApprenticeCertificate(a)
  }

  // ── skill sign-off helpers ─────────────────────────────────────────────────

  function getSkillList(a: Apprentice): SkillSignOff[] {
    const skills = a.specialtiesLearning.split(',').map(s => s.trim()).filter(Boolean)
    return skills.map(s => {
      const found = (a.skillSignOffs ?? []).find(sf => sf.skill === s)
      return found ?? { skill: s, status: 'not_started', signedOffBy: null, signedOffAt: null }
    })
  }

  // ── render ────────────────────────────────────────────────────────────────

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
            <Plus className="h-5 w-5" /> Add Apprentice
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Apprentices', value: activeCount,    icon: TrendingUp, note: '' },
          { label: 'Graduating Soon',    value: graduatingSoon, icon: Calendar,   note: 'within 30 days' },
          { label: 'Total Graduated',    value: graduatedCount, icon: Award,      note: '' },
        ].map(s => (
          <div key={s.label} className="stat-box flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md shrink-0">
              <s.icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, mentor, skills…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Cards */}
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
            const skillList  = getSkillList(a)
            const signedOff  = skillList.filter(s => s.status === 'signed_off').length
            const notes      = a.progressNotes ?? []
            const avgRating  = notes.length ? Math.round(notes.reduce((s, n) => s + n.rating, 0) / notes.length) : 0
            const daysLeft   = a.expectedGraduationDate
              ? Math.ceil((new Date(a.expectedGraduationDate).getTime() - Date.now()) / 86400000)
              : null

            return (
              <div key={a.id} className={cn('card border-l-4 flex flex-col', STAGE_BORDER[a.stage] ?? 'border-l-gray-300')}>
                {/* Card top */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center justify-center shrink-0">
                        {getInitials(a.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{a.name}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          <span className={STAGE_BADGE[a.stage]  ?? 'badge badge-gray'}>{a.stage}</span>
                          <span className={STATUS_BADGE[a.status] ?? 'badge badge-gray'}>{a.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {a.status === 'graduated' && (
                        <button onClick={() => handleCertificate(a)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Download certificate">
                          <Download className="h-5 w-5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => openEdit(a)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Edit">
                          <Edit2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-5 w-5 shrink-0" />
                    <span className="truncate">{a.mentorName ?? <span className="italic text-gray-400">No mentor</span>}</span>
                    {a.locationName && (
                      <span className="ml-auto badge badge-blue text-[10px] shrink-0">{a.locationName}</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Calendar className="h-5 w-5 shrink-0" />
                      <span>{elapsed(a.startDate)} in program</span>
                      {a.programDurationMonths && <span className="text-gray-400">/ {a.programDurationMonths}-month program</span>}
                    </div>
                    {a.expectedGraduationDate && (
                      <p className={cn('pl-5', daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400 font-medium' : '')}>
                        Graduating {a.expectedGraduationDate}
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && ` · ${daysLeft}d left`}
                      </p>
                    )}
                  </div>

                  {skillList.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {skillList.slice(0, 3).map(s => (
                        <span key={s.skill} className={cn('badge text-[10px]', s.status === 'signed_off' ? 'badge-green' : s.status === 'in_progress' ? 'badge-yellow' : 'badge-gray')}>
                          {s.status === 'signed_off' && <Check className="h-2.5 w-2.5" />}
                          {s.skill}
                        </span>
                      ))}
                      {skillList.length > 3 && <span className="badge badge-gray text-[10px]">+{skillList.length - 3}</span>}
                    </div>
                  )}
                </div>

                {/* Card footer — clickable stat buttons */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-1">
                  <button
                    onClick={() => openProgress(a)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Progress notes"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>{notes.length}</span>
                    {avgRating > 0 && (
                      <span className="flex">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('h-2.5 w-2.5', i <= avgRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600')} />)}
                      </span>
                    )}
                  </button>

                  {skillList.length > 0 && (
                    <button
                      onClick={() => openSkills(a)}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Skill sign-offs"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>{signedOff}/{skillList.length}</span>
                    </button>
                  )}

                  <button
                    onClick={() => openTasks(a)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Tasks"
                  >
                    <ListTodo className="h-5 w-5" />
                    <span>Tasks</span>
                  </button>

                  <button
                    onClick={() => openAttendance(a)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Attendance"
                  >
                    <CalendarCheck className="h-5 w-5" />
                    <span>Attend</span>
                  </button>

                  {a.stipend != null && (
                    <span className="ml-auto text-xs text-gray-400">{formatCurrency(a.stipend)}/mo</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showForm && canEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{editItem ? 'Edit Apprentice' : 'New Apprentice'}</h2>
              <button onClick={closeForm} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Apprentice's full name" className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 …" className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Mentor (Staff Member)</label>
                  <select value={form.mentorId} onChange={e => setForm(f => ({ ...f, mentorId: e.target.value }))} className="form-input w-full">
                    <option value="">No mentor assigned</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                </div>
                {locations.length > 0 && (
                  <div>
                    <label className="form-label">Branch</label>
                    <select
                      value={form.locationId}
                      onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                      disabled={!!defaultLocationId}
                      className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">No branch assigned</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Stage *</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as FormData['stage'] }))} className="form-input w-full">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                {editItem && (
                  <div>
                    <label className="form-label">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormData['status'] }))} className="form-input w-full">
                      <option value="active">Active</option>
                      <option value="graduated">Graduated</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Start Date *</label>
                  <input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Expected Graduation</label>
                  <input type="date" value={form.expectedGraduationDate} onChange={e => setForm(f => ({ ...f, expectedGraduationDate: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Program Duration (months)</label>
                  <input type="number" min={1} max={120} value={form.programDurationMonths} onChange={e => setForm(f => ({ ...f, programDurationMonths: e.target.value }))} placeholder="e.g. 24" className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Monthly Stipend (GHS)</label>
                  <input type="number" min={0} value={form.stipend} onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))} placeholder="0" className="form-input w-full" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Skills / Specialties Learning <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input value={form.specialtiesLearning} onChange={e => setForm(f => ({ ...f, specialtiesLearning: e.target.value }))} placeholder="e.g. Box Braids, Cornrows, Locs" className="form-input w-full" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="form-input w-full h-auto py-2" placeholder="Any additional notes…" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {editItem ? 'Save Changes' : 'Add Apprentice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Progress Notes Modal ──────────────────────────────────────────── */}
      {progressFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Progress Notes</h2>
                <p className="text-xs text-gray-500 mt-0.5">{progressFor.name}</p>
              </div>
              <button onClick={() => setProgressFor(null)} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(progressFor.progressNotes ?? []).length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No notes yet. Add the first one below.</p>
                : [...(progressFor.progressNotes ?? [])].reverse().map(n => (
                  <div key={n.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{n.date} · {n.addedBy}</span>
                      <div className="flex shrink-0">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('h-5 w-5', i <= n.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200 dark:text-gray-700')} />)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{n.note}</p>
                  </div>
                ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 shrink-0">
              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <label className="form-label">Add Evaluation Note</label>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Skills practiced, improvements, achievements…" className="form-input w-full h-auto py-2" />
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="form-label mb-0">Rating</span>
                    <StarRating value={noteRating} onChange={setNoteRating} />
                  </div>
                  <button type="submit" disabled={savingNote || !noteText.trim()} className="btn-primary">
                    {savingNote ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks Modal ───────────────────────────────────────────────────── */}
      {taskFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
                <p className="text-xs text-gray-500 mt-0.5">{taskFor.name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowTaskForm(v => !v)} className="btn-secondary h-8 px-3 text-xs">
                  <Plus className="h-5 w-5" /> Assign Task
                </button>
                <button onClick={() => setTaskFor(null)} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-3 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">Task Title *</label>
                    <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Practice box braids on mannequin" className="form-input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Due Date</label>
                    <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="form-input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as TaskForm['priority'] }))} className="form-input w-full">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Description</label>
                    <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} className="form-input w-full h-auto py-2" placeholder="Optional details…" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingTask} className="btn-primary">
                    {savingTask ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    Assign
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {loadingTasks
                ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                : tasks.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-8">No tasks assigned yet.</p>
                  : tasks.map(t => (
                    <div key={t.id} className={cn('flex items-start gap-3 p-3 rounded-md border transition-colors', t.status === 'completed' ? 'border-gray-100 dark:border-gray-800 opacity-60' : 'border-gray-200 dark:border-gray-700')}>
                      <button onClick={() => cycleTaskStatus(t)} className="mt-0.5 shrink-0 cursor-pointer" title="Cycle status">
                        {t.status === 'completed'
                          ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                          : t.status === 'in_progress'
                            ? <Clock className="h-5 w-5 text-blue-500" />
                            : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium', t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>{t.title}</p>
                        {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={PRIORITY_BADGE[t.priority]}>{t.priority}</span>
                          {t.dueDate && <span className="text-xs text-gray-400">{t.dueDate}</span>}
                          <span className="text-xs text-gray-400">by {t.assignedBy}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(t.id)} className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Skill Sign-Off Modal ──────────────────────────────────────────── */}
      {skillFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Skill Sign-Offs</h2>
                <p className="text-xs text-gray-500 mt-0.5">{skillFor.name}</p>
              </div>
              <button onClick={() => setSkillFor(null)} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {getSkillList(skillFor).length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No skills listed. Add them in the apprentice's profile.</p>
                : getSkillList(skillFor).map(s => (
                  <div key={s.skill} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                    <button
                      onClick={() => cycleSkill(s.skill, s.status)}
                      disabled={savingSkill === s.skill}
                      className="shrink-0 cursor-pointer disabled:opacity-50"
                      title="Cycle status"
                    >
                      {savingSkill === s.skill
                        ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        : s.status === 'signed_off'
                          ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                          : s.status === 'in_progress'
                            ? <Clock className="h-5 w-5 text-amber-500" />
                            : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.skill}</p>
                      {s.status === 'signed_off' && s.signedOffBy && (
                        <p className="text-xs text-gray-500 mt-0.5">Signed off by {s.signedOffBy} on {s.signedOffAt}</p>
                      )}
                      {s.status === 'in_progress' && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">In progress</p>}
                      {s.status === 'not_started' && <p className="text-xs text-gray-400 mt-0.5">Not started</p>}
                    </div>
                    <span className={cn('badge text-[10px] shrink-0', s.status === 'signed_off' ? 'badge-green' : s.status === 'in_progress' ? 'badge-yellow' : 'badge-gray')}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 shrink-0">
              <p className="text-xs text-gray-400 text-center">Click the icon to cycle: not started → in progress → signed off</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ──────────────────────────────────────────────── */}
      {attendFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Attendance</h2>
                <p className="text-xs text-gray-500 mt-0.5">{attendFor.name}</p>
              </div>
              <button onClick={() => setAttendFor(null)} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>

            {/* Log form */}
            <form onSubmit={handleLogAttendance} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Log Attendance</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" value={attendForm.date} onChange={e => setAttendForm(f => ({ ...f, date: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select value={attendForm.status} onChange={e => setAttendForm(f => ({ ...f, status: e.target.value as typeof attendForm.status }))} className="form-input w-full">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={savingAttend} className="btn-primary w-full justify-center">
                    {savingAttend ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    Save
                  </button>
                </div>
                <div className="col-span-3">
                  <label className="form-label">Notes (optional)</label>
                  <input value={attendForm.notes} onChange={e => setAttendForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Arrived 30 min late" className="form-input w-full" />
                </div>
              </div>
            </form>

            {/* Records */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAttend
                ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                : attendance.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-8">No attendance records yet.</p>
                  : (
                    <>
                      {/* Summary */}
                      <div className="flex gap-3 mb-4">
                        {(['present', 'absent', 'late'] as const).map(s => {
                          const count = attendance.filter(r => r.status === s).length
                          return (
                            <div key={s} className="flex-1 text-center p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{count}</p>
                              <p className="text-xs capitalize text-gray-500">{s}</p>
                            </div>
                          )
                        })}
                      </div>
                      <div className="space-y-2">
                        {attendance.map(r => (
                          <div key={r.id} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-24 shrink-0">{r.date}</span>
                            <span className={ATTEND_BADGE[r.status]}>{r.status}</span>
                            {r.notes && <span className="text-xs text-gray-400 truncate">{r.notes}</span>}
                            <span className="ml-auto text-xs text-gray-300 dark:text-gray-600 shrink-0">{r.recordedBy}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
