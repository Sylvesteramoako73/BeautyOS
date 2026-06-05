'use client'
import { useState } from 'react'
import { Plus, Minus, X, Search, Check, Smartphone, Banknote, CreditCard, Building2, ArrowRight, ChevronLeft, Receipt, Loader2, Gift } from 'lucide-react'
import { createPOSSale } from '@/lib/actions/appointments'
import { getGiftCardByCode, redeemGiftCard } from '@/lib/actions/gift-cards'
import { formatCurrency, cn } from '@/lib/utils'
import type { Client, Service, Staff } from '@/lib/types'

interface CartItem { service: Service; quantity: number }

const PAYMENT_METHODS = [
  { id: 'momo',     label: 'Mobile Money',  icon: Smartphone, desc: 'MTN, Vodafone, AirtelTigo' },
  { id: 'cash',     label: 'Cash',          icon: Banknote,   desc: 'Physical currency' },
  { id: 'card',     label: 'Card',          icon: CreditCard, desc: 'Visa / Mastercard' },
  { id: 'transfer', label: 'Bank Transfer', icon: Building2,  desc: 'Direct bank deposit' },
]

export function POSView({
  clients,
  services,
  staff,
}: {
  clients: Client[]
  services: Service[]
  staff: Staff[]
}) {
  const [step, setStep]                 = useState(1)
  const [cart, setCart]                 = useState<CartItem[]>([])
  const [clientId, setClientId]         = useState<string | null>(null)
  const [staffId, setStaffId]           = useState<string | null>(null)
  const [payMethod, setPayMethod]       = useState<string | null>(null)
  const [discount, setDiscount]         = useState(0)
  const [redeemPoints, setRedeemPoints] = useState(false)
  const [svcSearch, setSvcSearch]       = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [done, setDone]                 = useState(false)
  const [receipt, setReceipt]           = useState<{ invoiceNumber: string; total: number } | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  // Gift card
  const [gcCode, setGcCode]             = useState('')
  const [gcApplied, setGcApplied]       = useState<{ code: string; id: string; balance: number; deduct: number } | null>(null)
  const [gcError, setGcError]           = useState('')
  const [gcLoading, setGcLoading]       = useState(false)

  const selectedClient = clients.find(c => c.id === clientId)
  const pointsValue    = redeemPoints && selectedClient ? Math.floor(selectedClient.loyaltyPoints / 10) : 0

  const subtotal  = cart.reduce((s, i) => s + i.service.price * i.quantity, 0)
  const discAmt   = Math.round(subtotal * discount / 100)
  const gcDeduct  = gcApplied?.deduct ?? 0
  const total     = Math.max(0, subtotal - discAmt - pointsValue - gcDeduct)

  async function applyGiftCard() {
    if (!gcCode.trim()) return
    setGcLoading(true); setGcError('')
    const card = await getGiftCardByCode(gcCode)
    if (!card) { setGcError('Gift card not found'); setGcLoading(false); return }
    if (!card.isActive) { setGcError('This card has been voided'); setGcLoading(false); return }
    if (card.expiresAt && card.expiresAt < new Date().toISOString().split('T')[0]) {
      setGcError('This card has expired'); setGcLoading(false); return
    }
    const afterDiscount = Math.max(0, subtotal - discAmt - pointsValue)
    const deduct = Math.min(card.balance, afterDiscount)
    setGcApplied({ code: card.code, id: card.id, balance: card.balance, deduct })
    setGcLoading(false)
  }

  function removeGiftCard() { setGcApplied(null); setGcCode(''); setGcError('') }

  const addItem = (svc: Service) =>
    setCart(c => c.find(i => i.service.id === svc.id)
      ? c.map(i => i.service.id === svc.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...c, { service: svc, quantity: 1 }])

  const changeQty = (id: string, delta: number) =>
    setCart(c => c.map(i => i.service.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))

  const selectedStaff  = staff.find(s => s.id === staffId)
  const filteredSvcs   = services.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
  )

  async function handleCharge() {
    if (!payMethod || !clientId || !staffId) return
    setSubmitting(true)
    try {
      const serviceIds = cart.flatMap(i => Array(i.quantity).fill(i.service.id))
      const result = await createPOSSale({ clientId, staffId, serviceIds, paymentMethod: payMethod, discountPct: discount, redeemPoints: redeemPoints ? (selectedClient?.loyaltyPoints ?? 0) : 0 })
      // Redeem gift card after successful sale
      if (gcApplied && gcDeduct > 0) {
        await redeemGiftCard(gcApplied.code, gcDeduct, result.appointmentId)
      }
      setReceipt({ invoiceNumber: result.invoiceNumber, total: result.total })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  function resetSale() {
    setCart([]); setClientId(null); setStaffId(null)
    setPayMethod(null); setDiscount(0); setStep(1)
    setDone(false); setReceipt(null)
    removeGiftCard()
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Payment Complete</h2>
          <p className="text-gray-500 text-sm mb-1">{formatCurrency(total)} received via {PAYMENT_METHODS.find(p => p.id === payMethod)?.label}</p>
          {receipt && <p className="text-xs text-gray-400 mb-6">{receipt.invoiceNumber}</p>}

          {selectedClient && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-6 text-left">
              <p className="font-medium text-gray-900">{selectedClient.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">+{Math.round(total / 10)} loyalty points earned</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-1.5 mb-6 text-sm text-left">
            {cart.map(i => (
              <div key={i.service.id} className="flex justify-between text-gray-700">
                <span>{i.service.name} × {i.quantity}</span>
                <span>{formatCurrency(i.service.price * i.quantity)}</span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount {discount}%</span>
                <span>−{formatCurrency(discAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5 mt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={resetSale} className="btn-secondary flex-1">New Sale</button>
            <button onClick={() => window.print()} className="btn-primary flex-1">
              <Receipt className="h-5 w-5" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="page-title">Point of Sale</h1>
        <p className="page-subtitle">Create a new sale</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['Select Services', 'Client & Staff', 'Payment'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
              step === i + 1 ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' :
              step > i + 1  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' :
              'bg-white text-gray-400 border border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
            )}>
              {step > i + 1 ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
              {label}
            </div>
            {i < 2 && <div className="w-5 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Main */}
        <div className="col-span-2">
          {step === 1 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" placeholder="Search services..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} className="form-input pl-9 w-full" />
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th><th>Category</th><th>Duration</th>
                    <th className="text-right">Price</th><th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSvcs.map(svc => {
                    const inCart = cart.find(i => i.service.id === svc.id)
                    return (
                      <tr key={svc.id} className={cn(inCart ? 'bg-gray-50' : '')}>
                        <td className="font-medium">{svc.name}</td>
                        <td className="text-gray-500">{svc.category}</td>
                        <td className="text-gray-500">{svc.duration}m</td>
                        <td className="text-right font-medium">{formatCurrency(svc.price)}</td>
                        <td className="text-right">
                          {inCart ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => changeQty(svc.id, -1)} className="btn-ghost h-6 w-6 p-0 justify-center"><Minus className="h-5 w-5" /></button>
                              <span className="text-sm font-semibold w-5 text-center">{inCart.quantity}</span>
                              <button onClick={() => changeQty(svc.id, 1)}  className="btn-ghost h-6 w-6 p-0 justify-center"><Plus  className="h-5 w-5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => addItem(svc)} className="btn-secondary h-7 text-xs px-3">Add</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">Select Client</div>
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="form-input pl-9 w-full" />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredClients.map(c => (
                    <div key={c.id} onClick={() => setClientId(c.id)} className={cn('flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50', clientId === c.id && 'bg-gray-900 text-white hover:bg-gray-900')}>
                      <div>
                        <p className={cn('text-sm font-medium', clientId === c.id ? 'text-white' : 'text-gray-900')}>{c.name}</p>
                        <p className={cn('text-xs', clientId === c.id ? 'text-gray-300' : 'text-gray-500')}>{c.phone} · {c.loyaltyTier} · {c.loyaltyPoints} pts</p>
                      </div>
                      {clientId === c.id && <Check className="h-5 w-5 text-white" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">Assign Staff</div>
                <div className="divide-y divide-gray-100">
                  {staff.map(m => (
                    <div key={m.id} onClick={() => setStaffId(m.id)} className={cn('flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50', staffId === m.id && 'bg-gray-900 text-white hover:bg-gray-900')}>
                      <div>
                        <p className={cn('text-sm font-medium', staffId === m.id ? 'text-white' : 'text-gray-900')}>{m.name}</p>
                        <p className={cn('text-xs', staffId === m.id ? 'text-gray-300' : 'text-gray-500')}>{m.role} · {m.isAvailable ? 'Available' : 'Busy'}</p>
                      </div>
                      {staffId === m.id && <Check className="h-5 w-5 text-white" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">Payment Method</div>
                <div className="divide-y divide-gray-100">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon
                    return (
                      <div key={pm.id} onClick={() => setPayMethod(pm.id)} className={cn('flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50', payMethod === pm.id && 'bg-gray-900 hover:bg-gray-900')}>
                        <Icon className={cn('h-5 w-5', payMethod === pm.id ? 'text-white' : 'text-gray-400')} />
                        <div className="flex-1">
                          <p className={cn('text-sm font-medium', payMethod === pm.id ? 'text-white' : 'text-gray-900')}>{pm.label}</p>
                          <p className={cn('text-xs', payMethod === pm.id ? 'text-gray-300' : 'text-gray-500')}>{pm.desc}</p>
                        </div>
                        {payMethod === pm.id && <Check className="h-5 w-5 text-white" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Discount</p>
                <div className="flex gap-2">
                  {[0, 5, 10, 15, 20].map(d => (
                    <button key={d} onClick={() => setDiscount(d)} className={cn('px-4 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer', discount === d ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700')}>
                      {d}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Gift Card */}
              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-gray-400" /> Gift Card
                </p>
                {gcApplied ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm font-mono font-semibold text-green-800 dark:text-green-300">{gcApplied.code}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        −{formatCurrency(gcApplied.deduct)} applied · {formatCurrency(gcApplied.balance - gcApplied.deduct)} remaining
                      </p>
                    </div>
                    <button onClick={removeGiftCard} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={gcCode}
                        onChange={e => setGcCode(e.target.value.toUpperCase())}
                        placeholder="LUXE-XXXX-XXXX"
                        className="form-input flex-1 font-mono text-sm tracking-wider"
                        onKeyDown={e => e.key === 'Enter' && applyGiftCard()}
                      />
                      <button onClick={applyGiftCard} disabled={gcLoading || !gcCode} className="btn-secondary px-4 disabled:opacity-40">
                        {gcLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {gcError && <p className="text-xs text-red-600 dark:text-red-400">{gcError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="card overflow-hidden h-fit sticky top-6">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">Order Summary</div>
          <div className="p-4">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No items added yet</p>
            ) : (
              <div className="space-y-2 mb-4">
                {cart.map(i => (
                  <div key={i.service.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{i.service.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(i.service.price)} × {i.quantity}</p>
                    </div>
                    <span className="font-medium text-gray-900 shrink-0">{formatCurrency(i.service.price * i.quantity)}</span>
                    <button onClick={() => changeQty(i.service.id, -i.quantity)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount {discount}%</span><span>−{formatCurrency(discAmt)}</span></div>}
                {pointsValue > 0 && <div className="flex justify-between text-green-600"><span>Loyalty Points</span><span>−{formatCurrency(pointsValue)}</span></div>}
                {gcDeduct > 0 && <div className="flex justify-between text-green-600"><span>Gift Card</span><span>−{formatCurrency(gcDeduct)}</span></div>}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            )}

            {selectedClient && (
              <div className="mt-3 p-2.5 bg-gray-50 rounded-md text-xs space-y-2">
                <div>
                  <p className="font-medium text-gray-900">{selectedClient.name}</p>
                  <p className="text-gray-500">{selectedClient.loyaltyTier} · {selectedClient.loyaltyPoints} pts</p>
                </div>
                {selectedClient.loyaltyPoints >= 10 && cart.length > 0 && (
                  <div
                    onClick={() => setRedeemPoints(r => !r)}
                    className={cn('flex items-center justify-between p-2 rounded border cursor-pointer transition-colors', redeemPoints ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800' : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700')}
                  >
                    <div>
                      <p className={cn('font-medium text-xs', redeemPoints ? 'text-green-800' : 'text-gray-700')}>
                        Redeem {selectedClient.loyaltyPoints} pts
                      </p>
                      <p className="text-gray-400 text-xs">= {formatCurrency(Math.floor(selectedClient.loyaltyPoints / 10))} off</p>
                    </div>
                    <div className={cn('h-5 w-5 rounded border-2 flex items-center justify-center', redeemPoints ? 'bg-green-600 border-green-600' : 'border-gray-300')}>
                      {redeemPoints && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedStaff && step >= 2 && (
              <div className="mt-2 p-2.5 bg-gray-50 rounded-md text-xs">
                <p className="font-medium text-gray-900">{selectedStaff.name}</p>
                <p className="text-gray-500">{selectedStaff.role}</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 flex gap-2">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-none"><ChevronLeft className="h-5 w-5" /></button>}
            {step < 3
              ? <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? cart.length === 0 : clientId === null || staffId === null} className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed">Continue <ArrowRight className="h-5 w-5" /></button>
              : <button onClick={handleCharge} disabled={!payMethod || submitting} className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  Charge {formatCurrency(total)}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
