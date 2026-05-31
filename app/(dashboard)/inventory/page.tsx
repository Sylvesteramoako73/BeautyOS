import { requireRole } from '@/lib/auth'
import { getInventory } from '@/lib/actions/inventory'
import { InventoryView } from './view'

export default async function InventoryPage() {
  await requireRole('owner', 'manager')
  const products = await getInventory()
  return <InventoryView products={products} />
}

export const revalidate = 60
