import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getLocations } from '@/lib/actions/locations'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/error-boundary'
import { LocationProvider } from '@/components/location-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [locations] = await Promise.all([getLocations()])
  const activeLocationCookie = cookies().get('activeLocation')?.value ?? null
  // Validate the cookie value is still a real location
  const activeLocationId = locations.some(l => l.id === activeLocationCookie) ? activeLocationCookie : null

  return (
    <ToastProvider>
      <LocationProvider locations={locations} initialActiveId={activeLocationId}>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col min-w-0 lg:ml-[220px]">
            <Topbar userName={user.name} />
            <main className="flex-1 overflow-y-auto p-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </LocationProvider>
    </ToastProvider>
  )
}
