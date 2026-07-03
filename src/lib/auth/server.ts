import { createClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'

/**
 * Clerk-shaped auth() shim over Supabase Auth, so the many API routes that
 * used to destructure `const { userId, sessionClaims } = await auth()` keep
 * working unchanged. Role/profile linkage is read from the Supabase user's
 * app_metadata (set at account-link time — see otp/verify route), which
 * rides in the JWT the same way Clerk's publicMetadata did.
 */
export async function auth(): Promise<{
  userId: string | null
  sessionClaims: { publicMetadata: AuthMetadata } | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, sessionClaims: null }

  const meta = (user.app_metadata ?? {}) as Partial<AuthMetadata>
  return {
    userId: user.id,
    sessionClaims: {
      publicMetadata: {
        role: meta.role ?? 'customer',
        supabase_profile_id: meta.supabase_profile_id ?? user.id,
        admin_profile_id: meta.admin_profile_id,
      },
    },
  }
}

export async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
