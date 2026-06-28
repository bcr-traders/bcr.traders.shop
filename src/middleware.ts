import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { ClerkPublicMetadata } from '@/types'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/admin/login(.*)',
  '/delivery/login(.*)',
  '/category/(.*)',
  '/product/(.*)',
  '/search(.*)',
  // Public API endpoints
  '/api/products(.*)',
  '/api/categories(.*)',
  '/api/banners(.*)',
  '/api/cms(.*)',
  '/api/search(.*)',
  '/api/pincodes/check(.*)',
  '/api/merchant-feed(.*)',
  '/api/webhooks/(.*)',
  '/api/errors(.*)',
  '/api/translations(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin/(.+)'])
const isDeliveryAppRoute = createRouteMatcher(['/delivery/dashboard(.*)', '/delivery/orders(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Public routes — no auth required
  if (isPublicRoute(request)) return

  const { userId, sessionClaims } = await auth()
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined

  // Unauthenticated — redirect to appropriate login
  if (!userId) {
    if (isAdminRoute(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (isDeliveryAppRoute(request)) {
      return NextResponse.redirect(new URL('/delivery/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin routes — require admin or super_admin role
  if (isAdminRoute(request)) {
    if (meta?.role !== 'admin' && meta?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Delivery app routes — require delivery role
  if (isDeliveryAppRoute(request)) {
    if (meta?.role !== 'delivery') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
