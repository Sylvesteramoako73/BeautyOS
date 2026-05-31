'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { ExpenseSchema } from '@/lib/validation'

export type ExpenseCategory =
  | 'rent' | 'supplies' | 'utilities' | 'wages'
  | 'equipment' | 'marketing' | 'maintenance' | 'other'

export type Expense = {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  locationId: string | null
  locationName: string | null
  createdAt: string
}

const col = () => adminDb.collection('expenses')

export async function getExpenses(filters?: { month?: string; locationId?: string }): Promise<Expense[]> {
  let q: FirebaseFirestore.Query = col()
  if (filters?.month) q = q.where('date', '>=', `${filters.month}-01`).where('date', '<=', `${filters.month}-31`)
  const snap = await q.get()
  let results = snap.docs.map(d => docData(d) as Expense)
  if (filters?.locationId) results = results.filter(e => e.locationId === filters.locationId)
  return results.sort((a, b) => b.date.localeCompare(a.date))
}

export async function createExpense(data: {
  category: ExpenseCategory; description: string; amount: number; date: string; locationId?: string | null
}): Promise<Expense> {
  const parsed = ExpenseSchema.parse(data)
  let locationName: string | null = null
  if (parsed.locationId) {
    const { adminDb } = await import('@/lib/firebase-admin')
    const locDoc = await adminDb.collection('locations').doc(parsed.locationId).get()
    locationName = locDoc.data()?.name ?? null
  }
  const ref = col().doc()
  const now = new Date().toISOString()
  const doc = { ...parsed, locationName, createdAt: now }
  await ref.set(doc)
  revalidatePath('/expenses')
  return { id: ref.id, ...doc } as Expense
}

export async function deleteExpense(id: string) {
  await col().doc(id).delete()
  revalidatePath('/expenses')
}

export async function getExpenseSummary(monthStart: string, monthEnd: string) {
  const snap = await col().where('date', '>=', monthStart).where('date', '<=', monthEnd).get()
  const expenses = snap.docs.map(d => d.data() as Expense)
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)
  return { total, byCategory, count: expenses.length }
}
