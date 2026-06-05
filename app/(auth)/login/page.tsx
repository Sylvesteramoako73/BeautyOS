'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let credential

      if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.')
          setLoading(false)
          return
        }
        credential = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() })
        }
      } else {
        credential = await signInWithEmailAndPassword(auth, email, password)
      }

      const idToken = await credential.user.getIdToken()
      const res = await fetch('/api/auth/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken, isNewUser: mode === 'signup' }),
      })

      if (!res.ok) throw new Error('Session creation failed')
      router.push('/')
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/email-already-in-use')        setError('An account with this email already exists.')
      else if (code === 'auth/invalid-email')          setError('Please enter a valid email address.')
      else if (code === 'auth/weak-password')          setError('Password must be at least 6 characters.')
      else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
                                                        setError('Invalid email or password.')
      else if (code === 'auth/too-many-requests')      setError('Too many attempts. Please try again later.')
      else setError(err.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setError('')
    setName('')
    setEmail('')
    setPassword('')
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

        {/* Tab toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-6">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                mode === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Sarah Owusu"
                  className="form-input w-full"
                />
              </div>
            )}

            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sarah@salon.com"
                className="form-input w-full"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Password</label>
                {mode === 'signin' && (
                  <span className="text-xs text-gray-400">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
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
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={switchMode} className="text-gray-700 font-medium hover:underline cursor-pointer">
            {mode === 'signin' ? 'Create one' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  )
}
