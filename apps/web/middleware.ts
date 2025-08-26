import { type NextRequest, NextResponse } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/accept-invitation',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
]

// Define auth routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth uses session cookies (typically named 'better-auth.session_token' or similar)
  // Check for Better Auth session cookies
  const sessionCookie =
    request.cookies.get('__Secure-better-auth.session_token') ||
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('session_token') ||
    request.cookies.get('auth.session_token')
  const isAuthenticated = !!sessionCookie?.value

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/accept-invitation/')
  )

  // Check if the current route is an auth page (login/register)
  const isAuthRoute = authRoutes.includes(pathname)

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!isAuthenticated && !isPublicRoute && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the original URL as a redirect parameter
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
