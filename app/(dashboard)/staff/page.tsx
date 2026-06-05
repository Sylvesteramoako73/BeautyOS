import { requireRole, getEffectiveLocationId } from '@/lib/auth'
import { getStaffWithStats } from '@/lib/actions/staff'
import { getLocations } from '@/lib/actions/locations'
import { StaffView } from './view'

export default async function StaffPage() {
  await requireRole('owner', 'manager')
  const activeLocationId = await getEffectiveLocationId()
  const [allStaff, locations] = await Promise.all([getStaffWithStats(), getLocations()])
  // Include staff assigned to this branch OR staff with no branch assigned (available everywhere)
  const staff = activeLocationId
    ? allStaff.filter(s => !(s as any).locationId || (s as any).locationId === activeLocationId)
    : allStaff
  return <StaffView staff={staff as any} locations={locations} />
}

export const revalidate = 60
