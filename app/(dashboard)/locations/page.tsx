import { requireRole } from '@/lib/auth'
import { getLocationStats } from '@/lib/actions/locations'
import { LocationsView } from './view'

export default async function LocationsPage() {
  await requireRole('owner')
  const locations = await getLocationStats()
  return <LocationsView locations={locations} />
}

export const revalidate = 60
