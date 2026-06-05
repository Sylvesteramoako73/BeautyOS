'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight, Check, Loader2, Scissors } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep]           = useState<1 | 2>(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)

  // Step 1 — salon info
  const [salonName, setSalonName] = useState('')

  // Step 2 — owner account
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonName, ownerName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); setLoading(false); return }

      // Sign in to get a session cookie
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken    = await credential.user.getIdToken()
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      router.push('/')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">BeautyOS</span>
        </div>
        <a href="/login" className="text-sm text-gray-500 hover:text-gray-900">Sign in →</a>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  step > n ? 'bg-gray-900 text-white' : step === n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <span className={`text-sm ${step >= n ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {n === 1 ? 'Your salon' : 'Your account'}
                </span>
                {n < 2 && <div className={`flex-1 h-px ${step > n ? 'bg-gray-900' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            {step === 1 && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up your salon</h1>
                <p className="text-sm text-gray-500 mb-6">Tell us your salon name to get started.</p>
                <form onSubmit={e => { e.preventDefault(); if (salonName.trim()) setStep(2) }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Salon / Business Name *</label>
                    <input
                      required
                      autoFocus
                      value={salonName}
                      onChange={e => setSalonName(e.target.value)}
                      placeholder="e.g. Luxe Beauty Studio"
                      className="w-full h-11 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <button type="submit" disabled={!salonName.trim()} className="w-full h-11 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
                <p className="text-sm text-gray-500 mb-6">You're setting up <span className="font-medium text-gray-900">{salonName}</span></p>
                {error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
                    <input
                      required
                      autoFocus
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full h-11 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@salon.com"
                      className="w-full h-11 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        required
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full h-11 px-4 pr-11 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
                    <p className="font-medium text-gray-700">What you get free for 14 days:</p>
                    {['Unlimited appointments & clients', 'Staff, services & inventory management', 'Apprenticeship tracking', 'Analytics & reporting'].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600 shrink-0" /> {f}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="h-11 px-4 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 h-11 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Create my salon
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account? <a href="/login" className="text-gray-600 underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
