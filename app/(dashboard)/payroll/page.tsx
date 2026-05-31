import { requireRole } from '@/lib/auth'
import { PayrollView } from './view'

export default async function PayrollPage() {
  await requireRole('owner', 'manager')
  return <PayrollView />
}

export const revalidate = 120
