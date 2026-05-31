// Google Calendar sync service
// Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env.local
// One-time OAuth setup: see /settings — Google Calendar section

const SCOPES = 'https://www.googleapis.com/auth/calendar'

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.NEXTAUTH_URL + '/api/google-calendar/callback',
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string; refresh_token: string; expiry_date: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.NEXTAUTH_URL + '/api/google-calendar/callback',
      grant_type:    'authorization_code',
    }),
  })
  const json = await res.json()
  return {
    access_token:  json.access_token,
    refresh_token: json.refresh_token,
    expiry_date:   Date.now() + json.expires_in * 1000,
  }
}

async function getAccessToken(tokens: { access_token: string; refresh_token: string; expiry_date: number }): Promise<string> {
  if (tokens.expiry_date > Date.now() + 60_000) return tokens.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token:  tokens.refresh_token,
      client_id:      process.env.GOOGLE_CLIENT_ID!,
      client_secret:  process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:     'refresh_token',
    }),
  })
  const json = await res.json()
  return json.access_token
}

export type CalendarEvent = {
  id?: string
  summary: string
  description?: string
  location?: string
  start: string  // ISO datetime
  end: string
  attendeeEmail?: string
}

export async function createCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string,
  event: CalendarEvent
): Promise<string> {
  const token = await getAccessToken(tokens)

  const body: Record<string, any> = {
    summary:     event.summary,
    description: event.description ?? '',
    location:    event.location ?? '',
    start:       { dateTime: event.start, timeZone: 'Africa/Accra' },
    end:         { dateTime: event.end,   timeZone: 'Africa/Accra' },
  }

  if (event.attendeeEmail) {
    body.attendees = [{ email: event.attendeeEmail }]
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  const json = await res.json()
  return json.id
}

export async function deleteCalendarEvent(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  calendarId: string,
  eventId: string
): Promise<void> {
  const token = await getAccessToken(tokens)
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
}

export async function listCalendars(
  tokens: { access_token: string; refresh_token: string; expiry_date: number }
): Promise<{ id: string; summary: string }[]> {
  const token = await getAccessToken(tokens)
  const res   = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return (json.items ?? []).map((c: any) => ({ id: c.id, summary: c.summary }))
}
