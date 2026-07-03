import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSafeInternalPath } from '@/lib/validators'

/**
 * Exchanges the magic-link `code` (from generateLink in /api/auth/otp/verify)
 * for a Supabase session, sets the session cookies, then redirects.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/'
  const next = isSafeInternalPath(requestedNext) ? requestedNext : '/'

  if (!code) {
    // No `?code=` means this Supabase project issued an implicit-flow link
    // instead of PKCE — the tokens live in the URL fragment, which never
    // reaches the server. Redirecting straight to `next` would bounce off
    // the middleware (it can't see the fragment either, so a protected page
    // looks unauthenticated and redirects to login before the client JS
    // ever runs). Land on the public /auth/callback page instead, which
    // reads the fragment client-side, establishes the session, then
    // navigates to `next` itself.
    return NextResponse.redirect(new URL(`/auth/callback?next=${encodeURIComponent(next)}`, requestUrl.origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component context — safe to ignore
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Code exchange failed:', error.message)
    return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
