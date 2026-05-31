import { cookies } from 'next/headers'
import { requireRole } from '@/lib/auth'
import { getAnalyticsData } from '@/lib/actions/analytics'
import { AnalyticsView } from './view'

export default async function AnalyticsPage() {
  await requireRole('owner', 'manager')
  const activeLocationId = cookies().get('activeLocation')?.value ?? null
  const data = await getAnalyticsData('week', activeLocationId)
  return <AnalyticsView initialData={data} />
}

export const revalidate = 120
