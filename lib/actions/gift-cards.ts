'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { z } from 'zod'

export type GiftCard = {
  id: string
  code: string
  initialValue: number
  balance: number
  issuedTo: string
  issuedBy: string
  note: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  transactions: GiftCardTx[]
}

export type GiftCardTx = {
  date: string
  amount: number
  note: string
  appointmentId: string | null
}

const col = () => adminDb.collection('giftCards')

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `LUXE-${seg()}-${seg()}`
}

const IssueSchema = z.object({
  initialValue: z.number().min(1).max(10_000),
  issuedTo:     z.string().min(1).max(100).trim(),
  issuedBy:     z.string().min(1).max(100).trim(),
  note:         z.string().max(300).optional(),
  expiresAt:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function getGiftCards(): Promise<GiftCard[]> {
  const snap = await col().where('isActive', '==', true).get()
  return snap.docs
    .map(d => docData(d) as GiftCard)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getGiftCardByCode(code: string): Promise<GiftCard | null> {
  const snap = await col().where('code', '==', code.toUpperCase().trim()).get()
  if (snap.empty) return null
  return docData(snap.docs[0]) as GiftCard
}

export async function issueGiftCard(data: {
  initialValue: number; issuedTo: string; issuedBy: string; note?: string; expiresAt?: string | null
}): Promise<GiftCard> {
  const parsed = IssueSchema.parse(data)
  const ref    = col().doc()
  const now    = new Date().toISOString()
  const doc: Omit<GiftCard, 'id'> = {
    code:         generateCode(),
    initialValue: parsed.initialValue,
    balance:      parsed.initialValue,
    issuedTo:     parsed.issuedTo,
    issuedBy:     parsed.issuedBy,
    note:         parsed.note ?? null,
    expiresAt:    parsed.expiresAt ?? null,
    isActive:     true,
    createdAt:    now,
    transactions: [],
  }
  await ref.set(doc)
  revalidatePath('/gift-cards')
  return { id: ref.id, ...doc }
}

export async function redeemGiftCard(code: string, amount: number, appointmentId?: string): Promise<{
  success: boolean; newBalance: number; error?: string
}> {
  const snap = await col().where('code', '==', code.toUpperCase().trim()).get()
  if (snap.empty) return { success: false, newBalance: 0, error: 'Gift card not found' }

  const doc  = snap.docs[0]
  const card = docData(doc) as GiftCard

  if (!card.isActive)         return { success: false, newBalance: card.balance, error: 'Gift card is inactive' }
  if (card.balance < amount)  return { success: false, newBalance: card.balance, error: `Insufficient balance. Available: GHS ${card.balance.toFixed(2)}` }
  if (card.expiresAt && card.expiresAt < new Date().toISOString().split('T')[0]) {
    return { success: false, newBalance: card.balance, error: 'Gift card has expired' }
  }

  const newBalance = parseFloat((card.balance - amount).toFixed(2))
  const tx: GiftCardTx = {
    date:          new Date().toISOString().split('T')[0],
    amount:        -amount,
    note:          'Redeemed at POS',
    appointmentId: appointmentId ?? null,
  }

  await doc.ref.update({
    balance:      newBalance,
    isActive:     newBalance > 0,
    transactions: [...(card.transactions ?? []), tx],
  })

  revalidatePath('/gift-cards')
  return { success: true, newBalance }
}

export async function voidGiftCard(id: string) {
  await col().doc(id).update({ isActive: false })
  revalidatePath('/gift-cards')
}
