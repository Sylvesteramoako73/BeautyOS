import { requireRole } from '@/lib/auth'
import { getAutomationStats } from '@/lib/actions/automations'
import { AutomationsView } from './view'

export default async function AutomationsPage() {
  await requireRole('owner', 'manager')
  const automations = await getAutomationStats()
  return <AutomationsView automations={automations as any} />
}

export const revalidate = 120
