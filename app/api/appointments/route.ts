import { NextResponse } from 'next/server'
import { getAppointments, createAppointment } from '@/lib/actions/appointments'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appointments = await getAppointments({
    date:    searchParams.get('date') ?? undefined,
    staffId: searchParams.get('staffId') ?? undefined,
    status:  searchParams.get('status') ?? undefined,
  })
  return NextResponse.json({ appointments, total: appointments.length })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const appointment = await createAppointment(body)
  return NextResponse.json(appointment, { status: 201 })
}
