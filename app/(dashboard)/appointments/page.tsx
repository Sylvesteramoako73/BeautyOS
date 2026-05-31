import { cookies } from 'next/headers'
import { getAppointments } from '@/lib/actions/appointments'
import { getClients } from '@/lib/actions/clients'
import { getStaff } from '@/lib/actions/staff'
import { getServices } from '@/lib/actions/services'
import { getLocations } from '@/lib/actions/locations'
import { AppointmentsView } from './view'

export default async function AppointmentsPage() {
  const activeLocationId = cookies().get('activeLocation')?.value ?? undefined
  const [appointments, clients, staff, services, locations] = await Promise.all([
    getAppointments(activeLocationId ? { locationId: activeLocationId } : undefined),
    getClients(),
    getStaff(),
    getServices(),
    getLocations(),
  ])
  return (
    <AppointmentsView
      appointments={appointments as any}
      clients={clients}
      staff={staff}
      services={services}
      locations={locations}
    />
  )
}

export const revalidate = 30
