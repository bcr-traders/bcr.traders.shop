import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { AuthMetadata } from '@/types'
import { STAFF_COOKIE_NAME, isStaffPath } from '@/lib/supabase/cookie-scope'

const PUBLIC_PREFIXES = [
  '/login',
  '/admin/login',
  '/delivery/login',
  '/auth/callback',
  // SEO / crawler files — must never redirect to login.
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/category/',
  '/product/',
  '/search',
  '/api/products',
  '/api/categories',
  '/api/coupons',
  '/api/banners',
  '/api/cms',
  '/api/search',
  '/api/pincodes/check',
  '/api/unserviceable',
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
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api')

  // A client bound to either the store (default) or the separate staff cookie.
  // getUser() on it also refreshes and writes back THAT cookie.
  const makeClient = (staff: boolean) =>
    createServerClient(
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
        ...(staff ? { cookieOptions: { name: STAFF_COOKIE_NAME } } : {}),
      },
    )

  const getUserSafe = async (staff: boolean) => {
    try {
      const { data } = await makeClient(staff).auth.getUser()
      return data.user
    } catch (err) {
      if (process.env.AUTH_DEBUG) console.error('[proxy] getUser failed:', err)
      return null
    }
  }

  const hasStaffCookie = request.cookies
    .getAll()
    .some((c) => c.name === STAFF_COOKIE_NAME || c.name.startsWith(`${STAFF_COOKIE_NAME}.`))

  // Resolve (and refresh) the acting session for this request:
  //   • admin/delivery pages → ONLY the staff cookie counts.
  //   • everything else → the staff session if its cookie is present, else the
  //     store session. Both are kept fresh as the user visits either portal.
  let user = null
  if (isStaffPath(pathname)) {
    user = await getUserSafe(true)
  } else {
    if (hasStaffCookie) user = await getUserSafe(true)
    if (!user) user = await getUserSafe(false)
  }

  if (isPublicRoute(pathname)) return response

  if (!user) {
    // For API/fetch calls, answer with a clean JSON 401 instead of a 307 to an
    // HTML login page — otherwise the client's fetch silently follows the
    // redirect and chokes trying to JSON-parse an HTML document.
    if (isApiRoute) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
