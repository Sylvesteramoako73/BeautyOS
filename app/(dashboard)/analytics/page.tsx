import { requireRole, getEffectiveLocationId } from '@/lib/auth'
import { getAnalyticsData } from '@/lib/actions/analytics'
import { AnalyticsView } from './view'

export default async function AnalyticsPage() {
  await requireRole('owner', 'manager')
  const activeLocationId = await getEffectiveLocationId()
  const data = await getAnalyticsData('week', activeLocationId)
  return <AnalyticsView initialData={data} />
}

export const revalidate = 120
