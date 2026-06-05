'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function PushNotificationButton() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return }

    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'idle')
    })
  }, [])

  async function registerSW() {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return reg
  }

  async function subscribe() {
    setLoading(true)
    try {
      const reg  = await registerSW()
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setStatus('denied'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY).buffer as ArrayBuffer,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'unsupported') return null

  if (status === 'subscribed') return (
    <button
      onClick={unsubscribe}
      disabled={loading}
      title="Disable push notifications"
      className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
    >
      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
    </button>
  )

  return (
    <button
      onClick={subscribe}
      disabled={loading || status === 'denied'}
      title={status === 'denied' ? 'Notifications blocked — allow in browser settings' : 'Enable push notifications'}
      className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-40"
    >
      <BellOff className="h-5 w-5 text-gray-400" />
    </button>
  )
}
