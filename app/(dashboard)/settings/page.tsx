'use client'
// Server-side role guard is in lib/auth.ts — this page is rendered client-side
// so we rely on the sidebar hiding the link + the API returning 403 for non-owners
import { useState, useEffect } from 'react'
import { Check, Loader2, Eye, EyeOff, Shield, Crown, User, MessageSquare, CheckCircle, XCircle, CalendarDays, Link2, Unlink } from 'lucide-react'
import {
  updateProfile, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { updateUserRole } from '@/lib/actions/users'
import type { AppUser, Role } from '@/lib/actions/users'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-200 last:border-0">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>}
      </div>
      <div className="col-span-2 space-y-4">{children}</div>
    </div>
  )
}

const ROLE_CONFIG: Record<Role, { label: string; desc: string; icon: any; color: string }> = {
  owner:   { label: 'Owner',   desc: 'Full access — all pages, settings, team management', icon: Crown,  color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  manager: { label: 'Manager', desc: 'All operations except settings and team management',  icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  staff:   { label: 'Staff',   desc: 'Dashboard, appointments, clients, and POS only',     icon: User,   color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.color}`}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function TwilioSection() {
  const [recipient, setRecipient] = useState('')
  const [channel, setChannel]     = useState('email')
  const [testing, setTesting]     = useState(false)
  const [result, setResult]       = useState<{ success: boolean; mock: boolean; error?: string } | null>(null)

  async function handleTest(e: React.FormEvent) {
    e.preventDefault()
    setTesting(true); setResult(null)
    const res = await fetch('/api/messaging/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: recipient, channel }),
    })
    setResult(await res.json())
    setTesting(false)
  }

  const placeholder = channel === 'email' ? 'client@example.com' : '+233 24 000 0000'
  const label       = channel === 'email' ? 'Email to test' : 'Phone to test'

  return (
    <div className="space-y-5">
      <form onSubmit={handleTest} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="form-label text-sm font-medium">{label}</label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder={placeholder}
              type={channel === 'email' ? 'email' : 'tel'}
              className="form-input w-full h-11 text-base mt-1"
              required
            />
          </div>
          <div>
            <label className="form-label text-sm font-medium">Channel</label>
            <select
              value={channel}
              onChange={e => { setChannel(e.target.value); setRecipient('') }}
              className="form-input w-full h-11 text-base mt-1"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={testing} className="btn-primary h-11 px-6 text-sm">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          Send Test Message
        </button>
      </form>
      {result && (
        <div className={`flex items-center gap-3 text-sm px-4 py-3 rounded-md border ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {result.success ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          {result.success
            ? result.mock ? 'Mock mode — message logged to server console. Configure credentials to send for real.' : 'Message sent successfully!'
            : `Failed: ${result.error}`}
        </div>
      )}
    </div>
  )
}

function GoogleCalendarSection() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>([])
  const [calendarId, setCalendarId] = useState('primary')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/google-calendar/sync')
      .then(r => r.json())
      .then(d => {
        setStatus(d.connected ? 'connected' : 'disconnected')
        if (d.calendars) setCalendars(d.calendars)
        if (d.calendarId) setCalendarId(d.calendarId)
      })
      .catch(() => setStatus('disconnected'))
  }, [])

  async function connect() {
    const res = await fetch('/api/google-calendar/auth-url')
    const { url } = await res.json()
    window.location.href = url
  }

  async function disconnect() {
    setSaving(true)
    await fetch('/api/google-calendar/sync', { method: 'DELETE' })
    setStatus('disconnected'); setCalendars([])
    setSaving(false)
  }

  if (status === 'loading') return <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Checking connection…</div>

  if (status === 'connected') return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="font-medium">Google Calendar connected</span>
      </div>
      {calendars.length > 0 && (
        <div>
          <label className="form-label">Sync to calendar</label>
          <select value={calendarId} onChange={e => setCalendarId(e.target.value)} className="form-input w-full">
            {calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
          </select>
        </div>
      )}
      <button onClick={disconnect} disabled={saving} className="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-800">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
        Disconnect Google Calendar
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">Setup required</p>
        <p>Add these to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.local</code> (one-time Google Cloud setup):</p>
        <code className="block mt-1 leading-relaxed">
          GOOGLE_CLIENT_ID=your_client_id<br />
          GOOGLE_CLIENT_SECRET=your_client_secret<br />
          NEXTAUTH_URL=https://your-domain.com
        </code>
      </div>
      <button onClick={connect} className="btn-primary">
        <Link2 className="h-4 w-4" /> Connect Google Calendar
      </button>
    </div>
  )
}

function BusinessSection() {
  const [form, setForm] = useState({ salonName: '', tagline: '', phone: '', address: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    fetch('/api/settings/salon')
      .then(r => r.json())
      .then(d => { setForm(d); setLoading(false) })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    await fetch('/api/settings/salon', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setMsg('Saved.')
    setSaving(false)
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">Salon / Business Name</label>
          <input value={form.salonName} onChange={e => setForm(f => ({ ...f, salonName: e.target.value }))} placeholder="e.g. Luxe Beauty Studio" className="form-input w-full" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Tagline</label>
          <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="e.g. Where Beauty Meets Excellence" className="form-input w-full" />
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 …" className="form-input w-full" />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="form-input w-full" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Address</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City" className="form-input w-full" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Details
        </button>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const user = auth.currentUser

  const [myRole, setMyRole]           = useState<Role | null>(null)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [nameSaving, setNameSaving]   = useState(false)
  const [nameMsg, setNameMsg]         = useState('')

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass]         = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [passSaving, setPassSaving]   = useState(false)
  const [passMsg, setPassMsg]         = useState('')
  const [passError, setPassError]     = useState('')

  const [teamUsers, setTeamUsers]     = useState<AppUser[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setMyRole(d.role); setDisplayName(d.name) } })

    fetch('/api/users')
      .then(r => r.ok ? r.json() : [])
      .then(setTeamUsers)
      .finally(() => setTeamLoading(false))
  }, [])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !displayName.trim()) return
    setNameSaving(true); setNameMsg('')
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      // Also update in Firestore
      await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: displayName.trim() }) })
      setNameMsg('Name updated.')
    } catch { setNameMsg('Failed to update name.') }
    setNameSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(''); setPassError('')
    if (newPass !== confirmPass) { setPassError('Passwords do not match.'); return }
    if (newPass.length < 6)     { setPassError('Minimum 6 characters.'); return }
    if (!user?.email)           { setPassError('No email on this account.'); return }
    setPassSaving(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPass)
      setPassMsg('Password changed.')
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
    } catch (err: any) {
      const code = err?.code ?? ''
      setPassError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : err.message ?? 'Failed to change password.'
      )
    }
    setPassSaving(false)
  }

  async function handleRoleChange(uid: string, role: Role) {
    setRoleUpdating(uid)
    await updateUserRole(uid, role)
    setTeamUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u))
    setRoleUpdating(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and team</p>
      </div>

      <div className="card p-6">
        {/* Profile */}
        <Section title="Profile" description="Update your display name shown across the app.">
          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <label className="form-label">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="form-input w-full" placeholder="Your name" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input value={user?.email ?? ''} disabled className="form-input w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
            {myRole && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Your role:</span>
                <RoleBadge role={myRole} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={nameSaving} className="btn-primary">
                {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Name
              </button>
              {nameMsg && <p className="text-sm text-green-600">{nameMsg}</p>}
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Use a strong password of at least 6 characters.">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                  className="form-input w-full pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} className="form-input w-full" placeholder="••••••••" required />
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="form-input w-full" placeholder="••••••••" required />
            </div>
            {passError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{passError}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={passSaving} className="btn-primary">
                {passSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Change Password
              </button>
              {passMsg && <p className="text-sm text-green-600">{passMsg}</p>}
            </div>
          </form>
        </Section>

        {/* Team Management — owner only */}
        {myRole === 'owner' && (
          <Section title="Team Access" description="Control what each team member can see and do in the app.">
            {teamLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
              </div>
            ) : (
              <div className="space-y-2">
                {/* Role legend */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
                    <div key={role} className={`border rounded-md p-2.5 ${cfg.color}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <cfg.icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">{cfg.label}</span>
                      </div>
                      <p className="text-xs opacity-80 leading-tight">{cfg.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
                  {teamUsers.map(u => (
                    <div key={u.uid} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-8 w-8 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {roleUpdating === u.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.uid, e.target.value as Role)}
                            className="form-input py-1 text-xs w-28"
                          >
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                  {teamUsers.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No team members yet.</p>
                  )}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Business Details */}
        {myRole === 'owner' && (
          <Section title="Business Details" description="Salon name, tagline, and contact info used on receipts, certificates, and documents.">
            <BusinessSection />
          </Section>
        )}

        {/* Messaging / Twilio */}
        {myRole === 'owner' && (
          <Section title="Messaging (Email / SMS / WhatsApp)" description="Test your messaging channels. Email uses Gmail SMTP. SMS and WhatsApp require Twilio credentials.">
            <TwilioSection />
          </Section>
        )}

        {/* Google Calendar */}
        {myRole === 'owner' && (
          <Section title="Google Calendar" description="Sync appointments to your Google Calendar automatically. Connect once — new appointments appear in your calendar.">
            <GoogleCalendarSection />
          </Section>
        )}

        {/* Sign out */}
        <Section title="Session" description="Sign out of your account on this device.">
          <button
            onClick={async () => { await fetch('/api/auth/session', { method: 'DELETE' }); window.location.href = '/login' }}
            className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
          >
            Sign out
          </button>
        </Section>
      </div>
    </div>
  )
}
