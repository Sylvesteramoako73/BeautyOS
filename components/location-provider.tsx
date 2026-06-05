'use client'
import { createContext, useContext, useState } from 'react'
import type { Location } from '@/lib/actions/locations'

type LocationCtx = {
  locations: Location[]
  activeId: string | null
  activeName: string
  lockedLocationId: string | null  // non-null = user is branch-locked, no switching allowed
  setActive: (id: string | null) => void
}

const Ctx = createContext<LocationCtx>({
  locations: [], activeId: null, activeName: 'All Locations', lockedLocationId: null, setActive: () => {},
})

export function useLocation() { return useContext(Ctx) }

export function LocationProvider({
  children,
  locations,
  initialActiveId,
  lockedLocationId = null,
}: {
  children: React.ReactNode
  locations: Location[]
  initialActiveId: string | null
  lockedLocationId?: string | null
}) {
  const [activeId, setActiveId] = useState<string | null>(initialActiveId)

  const activeName = activeId
    ? (locations.find(l => l.id === activeId)?.name ?? 'All Locations')
    : 'All Locations'

  function setActive(id: string | null) {
    if (lockedLocationId) return  // branch-locked users cannot switch
    setActiveId(id)
    if (id) {
      document.cookie = `activeLocation=${id}; path=/; max-age=${60 * 60 * 24 * 30}`
    } else {
      document.cookie = 'activeLocation=; path=/; max-age=0'
    }
    window.location.reload()
  }

  return (
    <Ctx.Provider value={{ locations, activeId, activeName, lockedLocationId, setActive }}>
      {children}
    </Ctx.Provider>
  )
}
