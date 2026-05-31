import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session  = req.cookies.get('session')?.value
  const { pathname } = req.nextUrl

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    // If already signed in, redirect away from login
    if (session && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // API routes (cron etc.) — let them through
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Protected: require session cookie
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
