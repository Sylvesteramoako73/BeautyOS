import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getSalonSettings, updateSalonSettings } from '@/lib/actions/settings'

export async function GET() {
  const settings = await getSalonSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await req.json()
  await updateSalonSettings(data)
  return NextResponse.json({ ok: true })
}
