import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import AdminShell from '@/components/layout/AdminShell'
import AdminToaster from '@/components/admin/AdminToaster'

/**
 * This layout wraps EVERY admin page, so everything below ran on every single
 * navigation — 3 DB queries before the page's own work even started. A layout
 * doing uncached DB work also BLOCKS the navigation (loading.tsx can't show
 * until it resolves), which is why admin pages took seconds and the skeleton
 * never appeared.
 *
 * These are sidebar chrome — a notification count and a display name — so a
 * short cache is fine and makes navigation immediate. Badges refresh within
 * 30s; the name within 5 min.
 */
const fetchBadges = unstable_cache(
  async () => {
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const [ordersRes, unserviceableRes] = await Promise.all([
        db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed'),
        db.from('unserviceable_attempts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
      ])
      return {
        orders: ordersRes.count ?? 0,
        unserviceable: unserviceableRes.count ?? 0,
      }
    } catch {
      return { orders: 0, unserviceable: 0 }
    }
  },
  ['admin-badges'],
  { revalidate: 30, tags: ['admin-badges'] },
)

/**
 * The display name shown in the sidebar. Read from admin_profiles (the Auth
 * user_metadata copy is only set at account-creation time and goes stale).
 * Cached per user — it changes rarely.
 */
const fetchAdminName = unstable_cache(
  async (userId: string): Promise<string | null> => {
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db
        .from('admin_profiles')
        .select('name')
        .eq('user_id', userId)
        .maybeSingle()
      return (data?.name as string | undefined)?.trim() || null
    } catch {
      return null
    }
  },
  ['admin-name'],
  { revalidate: 300, tags: ['admin-name'] },
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/admin/login')

  const role = sessionClaims?.publicMetadata.role

  if (role !== 'super_admin' && role !== 'admin') redirect('/admin/login')

  const [badges, name] = await Promise.all([fetchBadges(), fetchAdminName(userId)])

  return (
    <>
      <AdminShell role={role} badges={badges} name={name}>{children}</AdminShell>
      <AdminToaster />
    </>
  )
}
