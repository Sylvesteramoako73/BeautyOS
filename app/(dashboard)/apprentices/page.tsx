import { getSessionUser, getEffectiveLocationId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApprentices } from '@/lib/actions/apprentices'
import { getStaff } from '@/lib/actions/staff'
import { getLocations } from '@/lib/actions/locations'
import { ApprenticesView } from './view'

export default async function ApprenticesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const locationId = await getEffectiveLocationId()
  const [apprentices, staff, locations] = await Promise.all([
    getApprentices(locationId),
    getStaff(),
    getLocations(),
  ])
  return (
    <ApprenticesView
      apprentices={apprentices}
      staff={staff}
      locations={locations}
      userRole={user.role}
      userName={user.name}
      defaultLocationId={locationId}
    />
  )
}

export const revalidate = 60
