'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import type { Location } from '@/lib/actions/locations'

type LocationCtx = {
  locations: Location[]
  activeId: string | null   // null = "All Locations"
  activeName: string
  setActive: (id: string | null) => void
}

const Ctx = createContext<LocationCtx>({
  locations: [], activeId: null, activeName: 'All Locations', setActive: () => {},
})

export function useLocation() { return useContext(Ctx) }

export function LocationProvider({
  children,
  locations,
  initialActiveId,
}: {
  children: React.ReactNode
  locations: Location[]
  initialActiveId: string | null
}) {
  const [activeId, setActiveId] = useState<string | null>(initialActiveId)

  const activeName = activeId
    ? (locations.find(l => l.id === activeId)?.name ?? 'All Locations')
    : 'All Locations'

  function setActive(id: string | null) {
    setActiveId(id)
    // Persist in cookie so server pages can filter on it
    if (id) {
      document.cookie = `activeLocation=${id}; path=/; max-age=${60 * 60 * 24 * 30}`
    } else {
      document.cookie = 'activeLocation=; path=/; max-age=0'
    }
    // Reload so server-rendered pages pick up the new filter
    window.location.reload()
  }

  return (
    <Ctx.Provider value={{ locations, activeId, activeName, setActive }}>
      {children}
    </Ctx.Provider>
  )
}
