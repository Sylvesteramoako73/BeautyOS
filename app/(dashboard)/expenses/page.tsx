import { requireRole, getEffectiveLocationId } from '@/lib/auth'
import { getExpenses } from '@/lib/actions/expenses'
import { getLocations } from '@/lib/actions/locations'
import { ExpensesView } from './view'

export default async function ExpensesPage() {
  await requireRole('owner', 'manager')
  const now              = new Date()
  const month            = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const activeLocationId = await getEffectiveLocationId() ?? undefined
  const [expenses, locations] = await Promise.all([
    getExpenses({ month, locationId: activeLocationId }),
    getLocations(),
  ])
  return <ExpensesView expenses={expenses} currentMonth={month} locations={locations} />
}

export const revalidate = 60
