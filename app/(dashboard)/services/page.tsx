import { requireRole } from '@/lib/auth'
import { getServicesWithStats } from '@/lib/actions/services'
import { ServicesView } from './view'

export default async function ServicesPage() {
  await requireRole('owner', 'manager')
  const services = await getServicesWithStats()
  return <ServicesView services={services} />
}

export const revalidate = 120
