import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Singleton browser client with client-side token rotation DISABLED.
 *
 * Why `autoRefreshToken: false`:
 * The browser client refreshes from its own *in-memory* session, while the
 * server (proxy + route handlers) refreshes from the *cookie*. Those two
 * refreshers rotate the same refresh token independently and drift apart — once
 * the browser refreshes with a token the server already rotated (past Supabase's
 * ~10s reuse grace), "Detect and revoke compromised refresh tokens" kills the
 * whole session and forces an OTP re-login.
 *
 * Fix: let the SERVER be the single refresher. Server clients are request-scoped
 * and always read the *current* cookie, so they never go stale. The browser just
 * reads the session the server keeps fresh (see SessionKeepAlive + /api/auth/keepalive).
 */
let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
      },
    },
  )
  return browserClient
}
