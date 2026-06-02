import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApprentices } from '@/lib/actions/apprentices'
import { getStaff } from '@/lib/actions/staff'
import { ApprenticesView } from './view'

export default async function ApprenticesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [apprentices, staff] = await Promise.all([getApprentices(), getStaff()])
  return <ApprenticesView apprentices={apprentices} staff={staff} userRole={user.role} userName={user.name} />
}

export const revalidate = 60
