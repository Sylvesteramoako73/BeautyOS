'use client'
import { useEffect, useState, useCallback } from 'react'
import { Bell, Plus, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LocationSwitcher } from '@/components/layout/location-switcher'
import { PushNotificationButton } from '@/components/push-notifications'

type Notification = {
  id: string; title: string; body: string; read: boolean
  createdAt: string; link?: string; type: string
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'Just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function Topbar({ userName }: { userName: string }) {
  const [notifOpen, setNotifOpen]   = useState(false)
  const [notifications, setNotifs]  = useState<Notification[]>([])

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifs(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifs()
    const id = setInterval(fetchNotifs, 30000)
    return () => clearInterval(id)
  }, [fetchNotifs])

  const unread = notifications.filter(n => !n.read).length

  async function handleOpen() {
    setNotifOpen(true)
    if (unread > 0) {
      await fetch('/api/notifications', { method: 'POST' })
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 ml-auto">
        <LocationSwitcher />
        <PushNotificationButton />
        {/* Quick actions */}
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <Link href="/pos" className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Plus className="h-5 w-5 shrink-0" /> <span className="hidden sm:inline">New Sale</span>
          </Link>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <Link href="/appointments" className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Calendar className="h-5 w-5 shrink-0" /> <span className="hidden sm:inline">Book</span>
          </Link>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleOpen}
            className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
                  {notifications.length > 0 && (
                    <Link href="/appointments" onClick={() => setNotifOpen(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">View all</Link>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={cn('px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer', !n.read && 'bg-blue-50/40 dark:bg-blue-900/20')}
                        onClick={() => { setNotifOpen(false); if (n.link) window.location.href = n.link }}
                      >
                        <div className="flex gap-2.5">
                          {!n.read && <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                          <div className={cn(!n.read ? '' : 'pl-4')}>
                            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                            <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {n.link && <ExternalLink className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold flex items-center justify-center">
          {userName ? getInitials(userName) : '…'}
        </div>
      </div>
    </header>
  )
}
