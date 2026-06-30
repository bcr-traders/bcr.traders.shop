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

const isAdminRoute    = createRouteMatcher(['/admin(.+)'])
const isDeliveryRoute = createRouteMatcher(['/delivery/dashboard(.*)', '/delivery/orders(.*)'])

export const proxy = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return

  const { userId, sessionClaims } = await auth()
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined

  if (!userId) {
    if (isAdminRoute(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (isDeliveryRoute(request)) {
      return NextResponse.redirect(new URL('/delivery/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdminRoute(request)) {
    if (meta?.role !== 'admin' && meta?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isDeliveryRoute(request)) {
    if (meta?.role !== 'delivery') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/(api|trpc)(.*)',
  ],
}
