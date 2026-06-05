'use server'
import { revalidatePath } from 'next/cache'
import { adminDb, docData } from '@/lib/firebase-admin'
import { ServiceSchema } from '@/lib/validation'
import { getTenantId } from '@/lib/auth'
import type { Service, ServiceWithStats } from '@/lib/types'

export async function getServices(): Promise<Service[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const snap = await adminDb.collection('services')
    .where('tenantId', '==', tenantId)
    .get()
  return snap.docs.map(d => docData(d) as Service).filter(s => s.isActive).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
}

export async function getServicesWithStats(): Promise<ServiceWithStats[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Fetch services + appointments in parallel (1 query each — was N+1 before)
  const [services, apptSnap] = await Promise.all([
    getServices(),
    adminDb.collection('appointments')
      .where('tenantId', '==', tenantId)
      .get(),
  ])

  const appointments = apptSnap.docs.map(d => d.data() as any).filter(a => a.date >= monthStart)

  return services.map(svc => {
    let bookingsThisMonth = 0
    let revenueThisMonth  = 0
    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue
      const item = (appt.services ?? []).find((s: any) => s.serviceId === svc.id)
      if (item) {
        bookingsThisMonth++
        if (appt.paymentStatus === 'paid') revenueThisMonth += item.price
      }
    }
    return { ...svc, bookingsThisMonth, revenueThisMonth }
  })
}

export async function createService(data: {
  name: string; category: string; description?: string
  duration: number; price: number; isPopular?: boolean
}): Promise<Service> {
  const tenantId = await getTenantId()
  const parsed = ServiceSchema.parse(data)
  const ref = adminDb.collection('services').doc()
  const now = new Date().toISOString()
  const doc = {
    ...parsed,
    tenantId: tenantId ?? null,
    description: data.description ?? null,
    isPopular: data.isPopular ?? false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(doc)
  revalidatePath('/services')
  return { id: ref.id, ...doc } as Service
}

export async function updateService(id: string, data: {
  name?: string; category?: string; description?: string
  duration?: number; price?: number; isPopular?: boolean
}): Promise<Service> {
  const parsed = ServiceSchema.partial().parse(data)
  await adminDb.collection('services').doc(id).update({ ...parsed, updatedAt: new Date().toISOString() })
  revalidatePath('/services')
  const doc = await adminDb.collection('services').doc(id).get()
  return docData(doc) as Service
}

export async function deleteService(id: string) {
  await adminDb.collection('services').doc(id).update({ isActive: false, updatedAt: new Date().toISOString() })
  revalidatePath('/services')
}

export async function getServiceCategories(): Promise<string[]> {
  const services = await getServices()
  return [...new Set(services.map(s => s.category))]
}
