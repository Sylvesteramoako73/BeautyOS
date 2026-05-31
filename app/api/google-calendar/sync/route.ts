import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { createCalendarEvent, listCalendars } from '@/lib/services/google-calendar'

// POST /api/google-calendar/sync — sync a single appointment to Google Calendar
export async function POST(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded  = await adminAuth.verifySessionCookie(session)
    const tokenDoc = await adminDb.collection('googleCalendarTokens').doc(decoded.uid).get()
    if (!tokenDoc.exists) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })

    const tokens     = tokenDoc.data()!
    const { appointmentId } = await req.json()
    if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 })

    const apptDoc = await adminDb.collection('appointments').doc(appointmentId).get()
    if (!apptDoc.exists) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const appt = apptDoc.data()!

    // Build start/end ISO datetimes
    const startDT = `${appt.date}T${appt.startTime}:00`
    const endDT   = `${appt.date}T${appt.endTime}:00`
    const services = (appt.services ?? []).map((s: any) => s.name).join(', ')

    const gcalId = await createCalendarEvent(tokens as any, tokens.calendarId ?? 'primary', {
      summary:     `${appt.clientName} — ${services}`,
      description: `Staff: ${appt.staffName}\nServices: ${services}\nStatus: ${appt.status}${appt.notes ? '\nNotes: ' + appt.notes : ''}`,
      location:    appt.locationName ?? undefined,
      start:       startDT,
      end:         endDT,
    })

    // Store the Google Calendar event ID on the appointment for later deletion
    await adminDb.collection('appointments').doc(appointmentId).update({ googleCalendarEventId: gcalId })

    return NextResponse.json({ ok: true, gcalId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/google-calendar/sync — get connection status + calendars
export async function GET(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ connected: false })

  try {
    const decoded  = await adminAuth.verifySessionCookie(session)
    const tokenDoc = await adminDb.collection('googleCalendarTokens').doc(decoded.uid).get()
    if (!tokenDoc.exists) return NextResponse.json({ connected: false })

    const tokens    = tokenDoc.data()!
    const calendars = await listCalendars(tokens as any)
    return NextResponse.json({ connected: true, calendars, calendarId: tokens.calendarId })
  } catch {
    return NextResponse.json({ connected: false })
  }
}

// DELETE /api/google-calendar/sync — disconnect
export async function DELETE(req: NextRequest) {
  const session = cookies().get('session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth.verifySessionCookie(session)
    await adminDb.collection('googleCalendarTokens').doc(decoded.uid).delete()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
