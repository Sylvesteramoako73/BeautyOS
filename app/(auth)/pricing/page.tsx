'use client'
import { useState, useEffect } from 'react'
import { Check, Loader2, Scissors, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    id:       'starter',
    name:     'Starter',
    priceGHS: 150,
    period:   'month',
    desc:     'Perfect for a single-location salon',
    features: [
      'Unlimited appointments & clients',
      '1 branch / location',
      'Up to 5 staff accounts',
      'Basic analytics',
      'Service receipts & invoices',
      'Paystack payment collection',
    ],
    popular: false,
  },
  {
    id:       'pro',
    name:     'Pro',
    priceGHS: 350,
    period:   'month',
    desc:     'For growing salons with multiple branches',
    features: [
      'Everything in Starter',
      'Unlimited branches',
      'Unlimited staff accounts',
      'Apprenticeship management',
      'Advanced analytics & payroll',
      'Automations (SMS / WhatsApp)',
      'Gift cards & loyalty tiers',
      'Priority support',
    ],
    popular: true,
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    priceGHS: 700,
    period:   'month',
    desc:     'For salon chains & franchise groups',
    features: [
      'Everything in Pro',
      'Custom subdomain (yoursalon.beautyos.app)',
      'White-label receipts & certificates',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    popular: false,
  },
]

export default function PricingPage() {
  const [user, setUser]         = useState<{ name: string; email?: string; plan: string; trialEndsAt: string; tenantId: string } | null>(null)
  const [, setLoading]          = useState(true)
  const [paying, setPaying]     = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        fetch('/api/billing/status').then(r => r.json()).then(b => {
          setUser({ ...d, ...b })
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [])

  const daysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  async function handleSubscribe(plan: typeof PLANS[0]) {
    if (!user) { window.location.href = '/signup'; return }
    setPaying(plan.id)

    await new Promise<void>((resolve, reject) => {
      if ((window as any).PaystackPop) { resolve(); return }
      const s = document.createElement('script')
      s.src = 'https://js.paystack.co/v1/inline.js'
      s.onload = () => resolve()
      s.onerror = () => reject()
      document.head.appendChild(s)
    })

    const handler = (window as any).PaystackPop.setup({
      key:      process.env.NEXT_PUBLIC_PAYSTACK_PLATFORM_KEY,
      email:    user?.email ?? 'billing@beautyos.app',
      amount:   plan.priceGHS * 100,
      currency: 'GHS',
      ref:      `BEAUTYOS-${plan.id.toUpperCase()}-${Date.now()}`,
      metadata: { plan: plan.id, tenantId: user?.tenantId },
      channels: ['card', 'mobile_money', 'bank'],
      onSuccess: async (tx: { reference: string }) => {
        const res = await fetch('/api/billing/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: tx.reference, plan: plan.id }),
        })
        if (res.ok) {
          setSuccess(plan.name)
        }
        setPaying(null)
      },
      onCancel: () => setPaying(null),
    })
    handler.openIframe()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">BeautyOS</span>
        </div>
        {user && (
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-500">Start free for 14 days. No credit card required.</p>

          {daysLeft !== null && daysLeft > 0 && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-800">
              <span className="font-semibold">{daysLeft} days</span> left on your free trial
            </div>
          )}
          {daysLeft === 0 && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-full text-sm text-red-800">
              Your trial has ended — subscribe to continue
            </div>
          )}
        </div>

        {/* Success banner */}
        {success && (
          <div className="mb-8 flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold">You're now on the {success} plan!</p>
              <p className="text-sm text-green-700">Your subscription is active. <Link href="/" className="underline">Go to dashboard →</Link></p>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = user?.plan === plan.id
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-8 flex flex-col relative ${
                  plan.popular ? 'border-gray-900 shadow-lg' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-bold text-gray-900">GHS {plan.priceGHS}</span>
                    <span className="text-gray-500 mb-1">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={!!paying || isCurrent || !!success}
                  className={`w-full h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : plan.popular
                        ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 disabled:opacity-50'
                  }`}
                >
                  {paying === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <><Check className="h-4 w-4" /> Current plan</>
                  ) : (
                    `Subscribe — GHS ${plan.priceGHS}/mo`
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          All prices in Ghanaian Cedis (GHS). Cancel anytime. Questions?{' '}
          <a href="mailto:hello@beautyos.app" className="underline">Contact us</a>
        </p>
      </div>
    </div>
  )
}
