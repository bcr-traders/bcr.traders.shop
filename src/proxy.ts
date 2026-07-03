import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { AuthMetadata } from '@/types'

const PUBLIC_PREFIXES = [
  '/login',
  '/admin/login',
  '/delivery/login',
  '/category/',
  '/product/',
  '/search',
  '/api/products',
  '/api/categories',
  '/api/banners',
  '/api/cms',
  '/api/search',
  '/api/pincodes/check',
  '/api/merchant-feed',
  '/api/webhooks/',
  '/api/errors',
  '/api/translations',
  '/api/auth/',
]

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

function isDeliveryRoute(pathname: string): boolean {
  return pathname.startsWith('/delivery/dashboard') || pathname.startsWith('/delivery/orders')
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refreshes the session cookie if the access token is near expiry.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) return response

  if (!user) {
    if (isAdminRoute(pathname)) return NextResponse.redirect(new URL('/admin/login', request.url))
    if (isDeliveryRoute(pathname)) return NextResponse.redirect(new URL('/delivery/login', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const meta = (user.app_metadata ?? {}) as Partial<AuthMetadata>

  if (isAdminRoute(pathname)) {
    if (meta.role !== 'admin' && meta.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isDeliveryRoute(pathname)) {
    if (meta.role !== 'delivery') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/(api|trpc)(.*)',
  ],
}
