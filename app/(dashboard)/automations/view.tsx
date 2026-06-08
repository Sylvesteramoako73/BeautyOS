'use client'
import { useState, useTransition } from 'react'
import {
  Plus, Zap, MessageSquare, Mail, Clock, Users, Gift,
  AlertCircle, Star, Check, Play, Pause, Edit2, Trash2,
  ChevronDown, ChevronUp, X, Loader2, RefreshCw, Send
} from 'lucide-react'
import { toggleAutomation, createAutomation, updateAutomation, deleteAutomation, runAutomationManually } from '@/lib/actions/automations'
import { cn } from '@/lib/utils'

type AutomationWithStats = {
  id: string; name: string; description: string | null
  trigger: string; channel: string; isActive: boolean
  delayMinutes: number; messageTemplate: string; conditionJson: string
  runsThisMonth: number; failedThisMonth: number; lastTriggered: Date | null
}

const TRIGGER_LABELS: Record<string, string> = {
  before_appointment: 'Before appointment',
  after_appointment:  'After appointment',
  birthday:           'Client birthday',
  no_visit:           'No visit (inactive clients)',
  no_show:            'After no-show',
  payment:            'After payment received',
  loyalty_upgrade:    'Loyalty tier upgrade',
  new_client:         'New client (first visit)',
  review_request:     'Review request',
}

const TRIGGER_ICONS: Record<string, any> = {
  before_appointment: Clock,
  after_appointment:  Check,
  birthday:           Gift,
  no_visit:           Users,
  no_show:            AlertCircle,
  payment:            Star,
  loyalty_upgrade:    Star,
  new_client:         Users,
  review_request:     MessageSquare,
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email',
}

const DEFAULT_TEMPLATES: Record<string, { name: string; description: string; delayMinutes: number; messageTemplate: string }> = {
  before_appointment: {
    name: 'Appointment Reminder',
    description: 'Remind clients before their appointment',
    delayMinutes: -120,
    messageTemplate: `Hi {{client_name}}, just a reminder that you have an appointment at {{time}} today for {{service}} with {{staff}}. See you soon! 💅`,
  },
  after_appointment: {
    name: 'Post-Visit Thank You',
    description: 'Thank clients after their visit',
    delayMinutes: 60,
    messageTemplate: `Hi {{client_name}}, thank you for visiting us today! We hope you loved your {{service}}. We'd love to see you again soon. 😊`,
  },
  birthday: {
    name: 'Birthday Message',
    description: 'Wish clients a happy birthday',
    delayMinutes: 0,
    messageTemplate: `Happy birthday, {{client_name}}! 🎂🎉 Wishing you a wonderful day. As a birthday treat, enjoy a special discount on your next visit with us!`,
  },
  no_visit: {
    name: 'Win-Back Message',
    description: 'Re-engage clients who haven\'t visited in a while',
    delayMinutes: 0,
    messageTemplate: `Hi {{client_name}}, we miss you! It's been a while since your last visit. Come back and treat yourself — we'd love to have you in again. Book anytime! 💖`,
  },
  no_show: {
    name: 'No-Show Follow-Up',
    description: 'Follow up with clients who missed their appointment',
    delayMinutes: 60,
    messageTemplate: `Hi {{client_name}}, we noticed you missed your appointment today. No worries — feel free to rebook at a time that works better for you!`,
  },
  payment: {
    name: 'Payment Confirmation',
    description: 'Confirm payment received',
    delayMinutes: 0,
    messageTemplate: `Hi {{client_name}}, we've received your payment of {{amount}}. Thank you! We look forward to your next visit. 🙏`,
  },
  loyalty_upgrade: {
    name: 'Loyalty Tier Upgrade',
    description: 'Congratulate clients on reaching a new loyalty tier',
    delayMinutes: 0,
    messageTemplate: `Congratulations, {{client_name}}! 🎉 You've been upgraded to {{new_tier}} status. Thank you for your loyalty — enjoy your exclusive benefits!`,
  },
  new_client: {
    name: 'New Client Welcome',
    description: 'Welcome first-time clients after their visit',
    delayMinutes: 60,
    messageTemplate: `Welcome, {{client_name}}! 🌟 It was so lovely having you for the first time today. We hope you enjoyed your {{service}}. We can't wait to see you again!`,
  },
  review_request: {
    name: 'Review Request',
    description: 'Ask clients to leave a review after their visit',
    delayMinutes: 1440,
    messageTemplate: `Hi {{client_name}}, thank you for visiting us yesterday! If you enjoyed your experience, we'd really appreciate a quick review. Your feedback means the world to us. 🙏`,
  },
}

const DEFAULT_FORM = {
  name: 'Appointment Reminder',
  description: 'Remind clients before their appointment',
  trigger: 'before_appointment',
  channel: 'whatsapp',
  delayMinutes: -120,
  messageTemplate: DEFAULT_TEMPLATES.before_appointment.messageTemplate,
  conditionJson: '{}',
}

export function AutomationsView({ automations: initial }: { automations: AutomationWithStats[] }) {
  const [automations, setAutomations] = useState(initial)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [showNew, setShowNew]         = useState(false)
  const [editTemplate, setEditTemplate] = useState<{ id: string; text: string } | null>(null)
  const [filter, setFilter]           = useState<'all'|'active'|'inactive'>('all')
  const [form, setForm]               = useState(DEFAULT_FORM)
  const [runningId, setRunningId]     = useState<string | null>(null)
  const [runResult, setRunResult]     = useState<string | null>(null)
  const [pending, startTransition]    = useTransition()

  const active   = automations.filter(a => a.isActive).length
  const runTotal = automations.reduce((s, a) => s + a.runsThisMonth, 0)

  const filtered = automations.filter(a =>
    filter === 'all' ? true : filter === 'active' ? a.isActive : !a.isActive
  )

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleAutomation(id)
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a))
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const created = await createAutomation(form)
      setAutomations(prev => [...prev, { ...created, runsThisMonth: 0, failedThisMonth: 0, lastTriggered: null }])
      setForm(DEFAULT_FORM)
      setShowNew(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this automation?')) return
    startTransition(async () => {
      await deleteAutomation(id)
      setAutomations(prev => prev.filter(a => a.id !== id))
    })
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTemplate) return
    startTransition(async () => {
      await updateAutomation(editTemplate.id, { messageTemplate: editTemplate.text })
      setAutomations(prev =>
        prev.map(a => a.id === editTemplate.id ? { ...a, messageTemplate: editTemplate.text } : a)
      )
      setEditTemplate(null)
    })
  }

  async function handleRunNow(id: string) {
    setRunningId(id)
    setRunResult(null)
    try {
      const res = await fetch(`/api/automations/${id}/run`, { method: 'POST' })
      const data = await res.json()
      const r = data.result
      setRunResult(r ? `Sent: ${r.sent} · Skipped: ${r.skipped} · Failed: ${r.failed}` : 'No matching triggers found right now.')
    } catch (err: any) {
      setRunResult(`Error: ${err?.message ?? 'Unknown error'}`)
    }
    setRunningId(null)
  }

  function formatLastTriggered(d: Date | null) {
    if (!d) return 'Never'
    const diff = Date.now() - new Date(d).getTime()
    const mins  = Math.floor(diff / 60000)
    if (mins < 60)    return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24)   return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Automations</h1>
          <p className="page-subtitle">{active} active · {runTotal} messages sent this month</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setRunResult(null)
              const results = await runAutomationManually('')
              const total = results.reduce((s: number, r: any) => s + r.sent, 0)
              setRunResult(`Automation run complete: ${total} messages sent.`)
            }}
            className="btn-secondary"
          >
            <RefreshCw className="h-5 w-5" /> Run All Now
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="h-5 w-5" /> New Automation
          </button>
        </div>
      </div>

      {runResult && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
          <span>{runResult}</span>
          <button onClick={() => setRunResult(null)} className="text-blue-500 hover:text-blue-700 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Automations', value: String(automations.length) },
          { label: 'Active',            value: String(active) },
          { label: 'Runs This Month',   value: String(runTotal) },
          { label: 'Channels',          value: 'SMS · WhatsApp · Email' },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <strong>How automations work:</strong> The scheduler runs every 15 minutes via <code className="bg-blue-100 px-1 rounded">GET /api/cron</code> (requires <code className="bg-blue-100 px-1 rounded">Authorization: Bearer {'{CRON_SECRET}'}</code>).
          When credentials (Twilio/SMTP) are not configured, messages are logged to the server console instead of being sent.
          Configure providers in <strong>.env.local</strong>.
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 border border-gray-200 rounded-md w-fit overflow-hidden">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 text-sm capitalize cursor-pointer transition-colors', filter === f ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700')}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card overflow-hidden divide-y divide-gray-100">
        {filtered.map(auto => {
          const TriggerIcon = TRIGGER_ICONS[auto.trigger] ?? Zap
          const isExpanded  = expanded === auto.id

          return (
            <div key={auto.id}>
              <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(auto.id)}
                  className={cn('relative h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none', auto.isActive ? 'bg-gray-900' : 'bg-gray-200')}
                  title={auto.isActive ? 'Disable' : 'Enable'}
                >
                  <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', auto.isActive && 'translate-x-4')} />
                </button>

                {/* Icon */}
                <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', auto.isActive ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-100 dark:bg-gray-800')}>
                  <TriggerIcon className={cn('h-5 w-5', auto.isActive ? 'text-white' : 'text-gray-400')} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{auto.name}</p>
                    {!auto.isActive && <span className="badge badge-gray">Inactive</span>}
                    {auto.failedThisMonth > 0 && <span className="badge badge-red">{auto.failedThisMonth} failed</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{auto.description}</p>
                </div>

                {/* Meta */}
                <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 w-48">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-5 w-5" />
                    {TRIGGER_LABELS[auto.trigger] ?? auto.trigger}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {auto.channel === 'email' ? <Mail className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                    {CHANNEL_LABELS[auto.channel] ?? auto.channel}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden lg:block text-right shrink-0 w-24">
                  <p className="text-sm font-semibold text-gray-900">{auto.runsThisMonth}</p>
                  <p className="text-xs text-gray-400">runs / mo</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleRunNow(auto.id)}
                    disabled={runningId === auto.id}
                    className="btn-ghost h-7 px-2 text-xs disabled:opacity-50"
                    title="Run now"
                  >
                    {runningId === auto.id
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Send className="h-5 w-5" />}
                  </button>
                  <button onClick={() => setExpanded(isExpanded ? null : auto.id)} className="btn-ghost h-8 w-8 p-0 justify-center">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Trigger</p>
                      <p className="text-sm text-gray-700">{TRIGGER_LABELS[auto.trigger] ?? auto.trigger}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delay</p>
                      <p className="text-sm text-gray-700">
                        {auto.delayMinutes === 0 ? 'Immediately' :
                          auto.delayMinutes < 0
                            ? `${Math.abs(auto.delayMinutes) >= 60 ? `${Math.abs(auto.delayMinutes)/60}h` : `${Math.abs(auto.delayMinutes)}m`} before`
                            : `${auto.delayMinutes >= 60 ? `${auto.delayMinutes/60}h` : `${auto.delayMinutes}m`} after`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Channel</p>
                      <p className="text-sm text-gray-700">{CHANNEL_LABELS[auto.channel]}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Triggered</p>
                      <p className="text-sm text-gray-700">{formatLastTriggered(auto.lastTriggered)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message Template</p>
                    {editTemplate?.id === auto.id ? (
                      <form onSubmit={handleSaveTemplate} className="space-y-2">
                        <textarea
                          rows={5}
                          value={editTemplate.text}
                          onChange={e => setEditTemplate(t => t ? { ...t, text: e.target.value } : t)}
                          className="form-input w-full h-auto pt-2 resize-none text-xs font-mono"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary h-7 px-3 text-xs">
                            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                            Save
                          </button>
                          <button type="button" onClick={() => setEditTemplate(null)} className="btn-secondary h-7 px-3 text-xs">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 whitespace-pre-wrap font-sans leading-relaxed">{auto.messageTemplate}</pre>
                        <p className="text-xs text-gray-400 mt-1.5">
                          Variables: {'{{client_name}}'} · {'{{time}}'} · {'{{service}}'} · {'{{staff}}'} · {'{{amount}}'} · {'{{date}}'} · {'{{new_tier}}'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setEditTemplate({ id: auto.id, text: auto.messageTemplate })}
                      className="btn-secondary"
                    >
                      <Edit2 className="h-5 w-5" /> Edit Template
                    </button>
                    <button onClick={() => handleToggle(auto.id)} className={cn('btn-secondary', auto.isActive && 'text-yellow-700 hover:bg-yellow-50')}>
                      {auto.isActive ? <><Pause className="h-5 w-5" /> Disable</> : <><Play className="h-5 w-5" /> Enable</>}
                    </button>
                    <button onClick={() => handleDelete(auto.id)} className="btn-ghost text-red-600 hover:bg-red-50 ml-auto">
                      <Trash2 className="h-5 w-5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-500">No automations found.</div>
        )}
      </div>

      {/* New automation modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Automation</h2>
              <button onClick={() => setShowNew(false)} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="form-label">Automation Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Appointment Reminder (2h)" className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="form-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Trigger *</label>
                  <select
                    value={form.trigger}
                    onChange={e => {
                      const t = e.target.value
                      const defaults = DEFAULT_TEMPLATES[t]
                      setForm(f => ({
                        ...f,
                        trigger: t,
                        ...(defaults ? {
                          name: defaults.name,
                          description: defaults.description,
                          delayMinutes: defaults.delayMinutes,
                          messageTemplate: defaults.messageTemplate,
                        } : {}),
                      }))
                    }}
                    className="form-input w-full"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Channel *</label>
                  <select value={form.channel} onChange={e => setForm(f => ({...f, channel: e.target.value}))} className="form-input w-full">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Delay (minutes, negative = before, positive = after)</label>
                <input type="number" value={form.delayMinutes} onChange={e => setForm(f => ({...f, delayMinutes: Number(e.target.value)}))} className="form-input w-full" />
                <p className="text-xs text-gray-400 mt-1">-1440 = 24h before · -120 = 2h before · 60 = 1h after</p>
              </div>
              <div>
                <label className="form-label">Message Template *</label>
                <textarea
                  required rows={5}
                  value={form.messageTemplate}
                  onChange={e => setForm(f => ({...f, messageTemplate: e.target.value}))}
                  placeholder="Hi {{client_name}}, ..."
                  className="form-input w-full h-auto pt-2 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{'{{client_name}}'} · {'{{time}}'} · {'{{service}}'} · {'{{staff}}'} · {'{{amount}}'}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  Create Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
