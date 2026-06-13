'use client'
import { useEffect } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

// Silently refreshes the server-side session cookie on every dashboard visit.
// This resets the 14-day expiry so active users are never logged out.
export function SessionRefresher() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      try {
        const idToken = await getIdToken(user, true)
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      } catch {
        // silent — never disrupt the UI
      }
    })
    return unsub
  }, [])
  return null
}
