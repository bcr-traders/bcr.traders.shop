import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isAdminLogin    = createRouteMatcher(['/admin/login'])
const isAdminRoute    = createRouteMatcher(['/admin(.*)'])
const isDeliveryLogin = createRouteMatcher(['/delivery/login'])
const isDeliveryRoute = createRouteMatcher(['/delivery(.*)'])
const isCustomerProtected = createRouteMatcher(['/account(.*)', '/orders(.*)'])

export const proxy = clerkMiddleware(async (auth, request) => {
  if (isAdminLogin(request) || isDeliveryLogin(request)) return

  if (isAdminRoute(request)) {
    const { userId, sessionClaims } = await auth()
    const role = (sessionClaims?.publicMetadata as { role?: string })?.role
    if (!userId || !['super_admin', 'admin'].includes(role ?? '')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (isDeliveryRoute(request)) {
    const { userId, sessionClaims } = await auth()
    const role = (sessionClaims?.publicMetadata as { role?: string })?.role
    if (!userId || role !== 'delivery') {
      return NextResponse.redirect(new URL('/delivery/login', request.url))
    }
  }

  if (isCustomerProtected(request)) {
    const { userId } = await auth()
    if (!userId) return NextResponse.redirect(new URL('/login', request.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$).*)'],
}