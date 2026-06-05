'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { getTenantId } from '@/lib/auth'
import { z } from 'zod'

export type Product = {
  id: string
  name: string
  brand: string | null
  category: string
  sku: string | null
  stockLevel: number
  lowStockThreshold: number
  unit: string
  costPrice: number
  sellingPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const ProductSchema = z.object({
  name:              z.string().min(1).max(150).trim(),
  brand:             z.string().max(100).optional(),
  category:          z.string().min(1).max(100).trim(),
  sku:               z.string().max(50).optional(),
  stockLevel:        z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  unit:              z.string().min(1).max(30).trim(),
  costPrice:         z.number().min(0).max(1_000_000),
  sellingPrice:      z.number().min(0).max(1_000_000),
})

export async function getInventory(): Promise<Product[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('inventory')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs
    .map(d => docData(d) as Product)
    .filter(p => p.isActive)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
}

export async function createProduct(data: Omit<Product, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const tenantId = await getTenantId()
  const parsed = ProductSchema.parse(data)
  const ref    = adminDb.collection('inventory').doc()
  const now    = new Date().toISOString()
  const doc    = { ...parsed, tenantId: tenantId ?? null, brand: parsed.brand ?? null, sku: parsed.sku ?? null, isActive: true, createdAt: now, updatedAt: now }
  await ref.set(doc)
  revalidatePath('/inventory')
  return { id: ref.id, ...doc }
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product> {
  const parsed = ProductSchema.partial().parse(data)
  await adminDb.collection('inventory').doc(id).update({ ...parsed, updatedAt: new Date().toISOString() })
  revalidatePath('/inventory')
  const doc = await adminDb.collection('inventory').doc(id).get()
  return docData(doc) as Product
}

export async function adjustStock(id: string, delta: number, note?: string): Promise<number> {
  const doc  = await adminDb.collection('inventory').doc(id).get()
  const data = doc.data()!
  const newLevel = Math.max(0, (data.stockLevel ?? 0) + delta)
  await adminDb.collection('inventory').doc(id).update({
    stockLevel: newLevel,
    updatedAt:  new Date().toISOString(),
    ...(note && { lastAdjustmentNote: note }),
  })
  revalidatePath('/inventory')
  return newLevel
}

export async function deleteProduct(id: string) {
  await adminDb.collection('inventory').doc(id).update({ isActive: false, updatedAt: new Date().toISOString() })
  revalidatePath('/inventory')
}
