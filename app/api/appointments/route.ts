import { NextResponse } from 'next/server'
import { getAppointments, createAppointment } from '@/lib/actions/appointments'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const appointments = await getAppointments({
    date:    searchParams.get('date') ?? undefined,
    staffId: searchParams.get('staffId') ?? undefined,
    status:  searchParams.get('status') ?? undefined,
  })
  return NextResponse.json({ appointments, total: appointments.length })
}

export async function POST(request: Request) {
  const body = await request.json()
  const appointment = await createAppointment(body)
  return NextResponse.json(appointment, { status: 201 })
}
