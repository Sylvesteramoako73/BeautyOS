import { getClients } from '@/lib/actions/clients'
import { getServices } from '@/lib/actions/services'
import { getStaff } from '@/lib/actions/staff'
import { POSView } from './view'

export default async function POSPage() {
  const [clients, services, staff] = await Promise.all([
    getClients(),
    getServices(),
    getStaff(),
  ])
  return <POSView clients={clients} services={services} staff={staff} />
}
