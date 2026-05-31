import { getClients } from '@/lib/actions/clients'
import { ClientsView } from './view'

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientsView clients={clients} />
}

export const revalidate = 60
