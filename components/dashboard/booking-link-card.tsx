'use client'
import { useState, useEffect } from 'react'
import { Link2, Copy, Check, ExternalLink } from 'lucide-react'

const BOOKING_APP_URL = process.env.NEXT_PUBLIC_BOOKING_APP_URL ?? 'https://book.beautyhubapp.online'

export function BookingLinkCard() {
  const [slug, setSlug]     = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/tenant')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.slug) setSlug(d.slug) })
      .catch(() => {})
  }, [])

  const bookingUrl = slug ? `${BOOKING_APP_URL}/${slug}` : null

  function copy() {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-gray-500" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Online Booking Link</h2>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Share this link with clients so they can book themselves.</p>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate font-mono">
            {bookingUrl ?? 'Loading…'}
          </span>
          <button
            onClick={copy}
            disabled={!bookingUrl}
            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full justify-center text-xs"
          >
            <ExternalLink className="h-4 w-4" /> Preview booking page
          </a>
        )}
      </div>
    </div>
  )
}
