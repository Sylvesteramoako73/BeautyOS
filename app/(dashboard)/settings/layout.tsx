import { requireRole } from '@/lib/auth'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole('owner')
  return <>{children}</>
}
