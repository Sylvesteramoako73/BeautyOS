'use client'
import { useState } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { useLocation } from '@/components/location-provider'
import { cn } from '@/lib/utils'

export function LocationSwitcher() {
  const { locations, activeId, activeName, lockedLocationId, setActive } = useLocation()
  const [open, setOpen] = useState(false)

  if (locations.length === 0) return null

  // Branch-locked users see a read-only label — no dropdown
  if (lockedLocationId) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
        <span className="max-w-[140px] truncate">{activeName}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <MapPin className="h-5 w-5 text-gray-400" />
        <span className="max-w-[140px] truncate">{activeName}</span>
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Branch</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setActive(null); setOpen(false) }}
                className={cn('w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  !activeId ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                All Locations
                {!activeId && <Check className="h-5 w-5 text-gray-900 dark:text-gray-100" />}
              </button>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => { setActive(loc.id); setOpen(false) }}
                  className={cn('w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    activeId === loc.id ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  <span className="truncate">{loc.name}</span>
                  {activeId === loc.id && <Check className="h-5 w-5 shrink-0 text-gray-900 dark:text-gray-100" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
