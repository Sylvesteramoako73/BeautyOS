'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)

      // Bake role/tenantId/locationId into Firebase custom claims (reads Firestore once).
      // This lets subsequent page loads verify the session without any Firestore reads.
      const initialToken = await credential.user.getIdToken()
      await fetch('/api/auth/claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken: initialToken }),
      })

      // Force-refresh so the new custom claims are included in the next token.
      const freshToken = await credential.user.getIdToken(true)

      // Create the session cookie from the fresh token (claims are now baked in).
      const res = await fetch('/api/auth/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken: freshToken }),
      })
      if (!res.ok) throw new Error('Session creation failed')
      router.push('/')
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setError('Invalid email or password.')
      else if (code === 'auth/too-many-requests')
        setError('Too many attempts. Please try again later.')
      else
        setError(err.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
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

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@salon.com"
                className="form-input w-full"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="form-label mb-0">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-gray-700 font-medium hover:underline">
            Start your free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
