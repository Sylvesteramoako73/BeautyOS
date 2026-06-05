import { getAppointments } from '@/lib/actions/appointments'
import { getClients } from '@/lib/actions/clients'
import { getStaff } from '@/lib/actions/staff'
import { getServices } from '@/lib/actions/services'
import { getLocations } from '@/lib/actions/locations'
import { getSalonSettings } from '@/lib/actions/settings'
import { getEffectiveLocationId } from '@/lib/auth'
import { AppointmentsView } from './view'

export default async function AppointmentsPage() {
  const activeLocationId = await getEffectiveLocationId() ?? undefined
  const [appointments, clients, staff, services, locations, salonSettings] = await Promise.all([
    getAppointments(activeLocationId ? { locationId: activeLocationId } : undefined),
    getClients(),
    getStaff(),
    getServices(),
    getLocations(),
    getSalonSettings(),
  ])
  return (
    <AppointmentsView
      appointments={appointments as any}
      clients={clients}
      staff={staff}
      services={services}
      locations={locations}
      salonSettings={salonSettings}
    />
  )
}

export const revalidate = 30
