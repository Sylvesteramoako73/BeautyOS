import { NextRequest, NextResponse } from 'next/server'

// Public routes that never require a session
const PUBLIC = ['/login', '/signup', '/api/auth', '/api/book', '/book']

function isPublic(pathname: string) {
  return PUBLIC.some(p => pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  const session    = req.cookies.get('session')?.value
  const { pathname, hostname } = req.nextUrl

  // Pass through static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // API routes — let through (they do their own auth)
  if (pathname.startsWith('/api')) return NextResponse.next()

  // Subdomain detection — only on our production domain, never on vercel.app
  // e.g. hairport.beautyos.app → slug = "hairport"
  const isProductionSubdomain =
    hostname.endsWith('.beautyos.app') &&
    hostname !== 'beautyos.app' &&
    hostname !== 'www.beautyos.app'
  if (isProductionSubdomain) {
    const slug = hostname.split('.')[0]
    const res  = NextResponse.next()
    res.headers.set('x-tenant-slug', slug)
    if (!session && !isPublic(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // Redirect authenticated users away from login/signup
  if (session && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Public routes
  if (isPublic(pathname)) return NextResponse.next()

  // Protected: require session cookie
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
