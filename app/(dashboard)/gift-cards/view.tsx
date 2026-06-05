'use client'
import { useState, useTransition } from 'react'
import { Plus, Gift, X, Check, Loader2, Copy, Ban, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'
import { issueGiftCard, voidGiftCard } from '@/lib/actions/gift-cards'
import { formatCurrency } from '@/lib/utils'
import type { GiftCard } from '@/lib/actions/gift-cards'

const EMPTY_FORM = { initialValue: 100, issuedTo: '', issuedBy: '', note: '', expiresAt: '' }

function BalanceBar({ card }: { card: GiftCard }) {
  const pct = card.initialValue > 0 ? Math.round(card.balance / card.initialValue * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">Balance</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(card.balance)} <span className="text-gray-400 font-normal">of {formatCurrency(card.initialValue)}</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function GiftCardsView({ cards: initial }: { cards: GiftCard[] }) {
  const [cards, setCards]       = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)
  const [, startTransition]     = useTransition()

  const totalIssued  = cards.reduce((s, c) => s + c.initialValue, 0)
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0)
  const totalRedeemed = totalIssued - totalBalance

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const created = await issueGiftCard({
      initialValue: Number(form.initialValue),
      issuedTo:     form.issuedTo,
      issuedBy:     form.issuedBy,
      note:         form.note || undefined,
      expiresAt:    form.expiresAt || null,
    })
    setCards(prev => [created, ...prev])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
  }

  function handleVoid(id: string) {
    startTransition(async () => {
      await voidGiftCard(id)
      setCards(prev => prev.filter(c => c.id !== id))
    })
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gift Cards</h1>
          <p className="page-subtitle">{cards.length} active cards</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-5 w-5" /> Issue Gift Card
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-box">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Issued</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalIssued)}</p>
        </div>
        <div className="stat-box">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Outstanding Balance</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="stat-box">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Redeemed</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalRedeemed)}</p>
        </div>
      </div>

      {/* Issue form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Issue New Gift Card</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleIssue} className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Value (GHS) *</label>
              <input type="number" required min={1} value={form.initialValue}
                onChange={e => setForm(f => ({ ...f, initialValue: Number(e.target.value) }))}
                className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Issued To *</label>
              <input required value={form.issuedTo} placeholder="Client name"
                onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))}
                className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Issued By *</label>
              <input required value={form.issuedBy} placeholder="Staff name"
                onChange={e => setForm(f => ({ ...f, issuedBy: e.target.value }))}
                className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Expires On <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="form-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={form.note} placeholder="e.g. Birthday gift, Refund, Promotion"
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="form-input w-full" />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                Issue Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards list */}
      <div className="space-y-3">
        {cards.length === 0 && (
          <div className="card p-12 text-center text-sm text-gray-400">No gift cards issued yet.</div>
        )}
        {cards.map(card => (
          <div key={card.id} className="card overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            >
              {/* Icon */}
              <div className="h-9 w-9 rounded-lg bg-gray-900 dark:bg-gray-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-white dark:text-gray-900" />
              </div>

              {/* Code + recipient */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider">{card.code}</span>
                  <button
                    onClick={e => { e.stopPropagation(); copyCode(card.code) }}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="Copy code"
                  >
                    {copied === card.code ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  For {card.issuedTo} · Issued by {card.issuedBy}
                  {card.expiresAt && <span className="ml-1">· Expires {card.expiresAt}</span>}
                </p>
              </div>

              {/* Balance */}
              <div className="text-right shrink-0 w-32">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(card.balance)}</p>
                <p className="text-xs text-gray-400">{Math.round(card.balance / card.initialValue * 100)}% remaining</p>
              </div>

              {expanded === card.id
                ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </div>

            {expanded === card.id && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-4">
                <BalanceBar card={card} />

                {card.note && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">{card.note}</p>
                )}

                {/* Transaction history */}
                {(card.transactions ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Usage History</p>
                    <div className="space-y-1">
                      {card.transactions.map((tx, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">{tx.date} · {tx.note}</span>
                          <span className={`font-medium ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {tx.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(tx.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => handleVoid(card.id)}
                    className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs"
                  >
                    <Ban className="h-5 w-5" /> Void Card
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
