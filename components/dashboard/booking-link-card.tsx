'use client'
import { useState } from 'react'
import { Link2, Copy, Check } from 'lucide-react'

export function BookingLinkCard() {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/book`
    : '/book'

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
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
          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate font-mono">/book</span>
          <button onClick={copy} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <a
          href="/book"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full justify-center text-xs"
        >
          Preview booking page
        </a>
      </div>
    </div>
  )
}
