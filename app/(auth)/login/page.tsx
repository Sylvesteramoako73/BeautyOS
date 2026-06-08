'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<'signin' | 'signup'>('signin')

  // Sign in state
  const [siEmail, setSiEmail]   = useState('')
  const [siPass, setSiPass]     = useState('')
  const [siShow, setSiShow]     = useState(false)
  const [siLoading, setSiLoading] = useState(false)
  const [siError, setSiError]   = useState('')

  // Sign up state
  const [salonName, setSalonName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [suEmail, setSuEmail]   = useState('')
  const [suPass, setSuPass]     = useState('')
  const [suShow, setSuShow]     = useState(false)
  const [suLoading, setSuLoading] = useState(false)
  const [suError, setSuError]   = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSiLoading(true); setSiError('')
    try {
      const credential   = await signInWithEmailAndPassword(auth, siEmail, siPass)
      const initialToken = await credential.user.getIdToken()
      await fetch('/api/auth/claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: initialToken }),
      })
      const freshToken = await credential.user.getIdToken(true)
      const res = await fetch('/api/auth/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: freshToken }),
      })
      if (!res.ok) throw new Error('Session creation failed')
      router.push('/')
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setSiError('Invalid email or password.')
      else if (code === 'auth/too-many-requests')
        setSiError('Too many attempts. Please try again later.')
      else
        setSiError(err.message ?? 'Something went wrong.')
      setSiLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (suPass.length < 6) { setSuError('Password must be at least 6 characters.'); return }
    setSuLoading(true); setSuError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonName, ownerName, email: suEmail, password: suPass }),
      })
      const data = await res.json()
      if (!res.ok) { setSuError(data.error ?? 'Signup failed'); setSuLoading(false); return }

      const credential   = await signInWithEmailAndPassword(auth, suEmail, suPass)
      const initialToken = await credential.user.getIdToken()
      await fetch('/api/auth/claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: initialToken }),
      })
      const freshToken = await credential.user.getIdToken(true)
      await fetch('/api/auth/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: freshToken }),
      })
      router.push('/')
    } catch (err: any) {
      setSuError(err.message ?? 'Something went wrong.')
      setSuLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Image src="/logo.png" alt="BeautyOS" width={180} height={60} className="h-14 w-auto object-contain" priority />
          </div>
          <p className="text-sm text-gray-500 mt-1">Salon Management System</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-gray-200">
            {(['signin', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-gray-900 border-b-2 border-gray-900 -mb-px bg-white'
                    : 'text-gray-400 hover:text-gray-600 bg-gray-50'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── Sign In ── */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="form-label">Email address</label>
                  <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)}
                    placeholder="you@salon.com" className="form-input w-full" required autoFocus />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative mt-1.5">
                    <input type={siShow ? 'text' : 'password'} value={siPass} onChange={e => setSiPass(e.target.value)}
                      placeholder="••••••••" className="form-input w-full pr-10" required />
                    <button type="button" onClick={() => setSiShow(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {siShow ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {siError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{siError}</p>}
                <button type="submit" disabled={siLoading} className="btn-primary w-full justify-center disabled:opacity-50">
                  {siLoading
                    ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                    : <>Sign in <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}

            {/* ── Sign Up ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="form-label">Salon / Business Name</label>
                  <input value={salonName} onChange={e => setSalonName(e.target.value)}
                    placeholder="e.g. Luxe Beauty Studio" className="form-input w-full" required autoFocus />
                </div>
                <div>
                  <label className="form-label">Your Name</label>
                  <input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="Full name" className="form-input w-full" required />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)}
                    placeholder="you@salon.com" className="form-input w-full" required />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative mt-1.5">
                    <input type={suShow ? 'text' : 'password'} value={suPass} onChange={e => setSuPass(e.target.value)}
                      placeholder="Min. 6 characters" className="form-input w-full pr-10" required />
                    <button type="button" onClick={() => setSuShow(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {suShow ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-700">Free for 14 days — no card needed</p>
                  {['Unlimited appointments & clients', 'Staff, services & inventory', 'Analytics & reporting'].map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-600 shrink-0" /> {f}
                    </div>
                  ))}
                </div>

                {suError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{suError}</p>}
                <button type="submit" disabled={suLoading} className="btn-primary w-full justify-center disabled:opacity-50">
                  {suLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                    : <>Create my salon <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
