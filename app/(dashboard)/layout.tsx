import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser, getEffectiveLocationId } from '@/lib/auth'
import { getLocations } from '@/lib/actions/locations'
import { getTenant } from '@/lib/actions/tenants'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/error-boundary'
import { LocationProvider } from '@/components/location-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  // Redirect via /api/auth/session (GET) so it clears the stale cookie first.
  // A direct redirect('/login') would leave the cookie set, causing middleware to
  // bounce back here in a redirect loop.
  if (!user) redirect('/api/auth/session')

  const [locations, tenant] = await Promise.all([
    getLocations(),
    user.tenantId ? getTenant(user.tenantId) : null,
  ])

  const activeLocationId = await getEffectiveLocationId()

  // Trial banner: show for owners only when trialing
  const daysLeft = tenant?.subscriptionStatus === 'trialing' && tenant.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null
  const showTrialBanner = user.role === 'owner' && tenant?.subscriptionStatus === 'trialing' && daysLeft !== null

  return (
    <ToastProvider>
      <LocationProvider
        locations={locations}
        initialActiveId={activeLocationId}
        lockedLocationId={user.locationId}
      >
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col min-w-0 lg:ml-[220px]">
            {showTrialBanner && (
              <div className={`flex items-center justify-between px-4 py-2 text-xs font-medium ${daysLeft <= 3 ? 'bg-red-600' : 'bg-amber-500'} text-white`}>
                <span>
                  {daysLeft === 0
                    ? 'Your free trial has ended. Subscribe to keep using BeautyOS.'
                    : `Free trial: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`}
                </span>
                <Link href="/pricing" className="ml-4 px-3 py-1 bg-white text-gray-900 rounded-md font-semibold hover:bg-gray-100 transition-colors shrink-0">
                  Subscribe
                </Link>
              </div>
            )}
            <Topbar userName={user.name} />
            <main className="flex-1 overflow-y-auto p-3 sm:p-6">
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
