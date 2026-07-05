import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import AdminShell from '@/components/layout/AdminShell'
import AdminToaster from '@/components/admin/AdminToaster'

async function fetchBadges() {
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
}

/**
 * The display name shown in the sidebar. Read live from admin_profiles so that
 * editing the name in Supabase is reflected on next load — the Auth
 * user_metadata copy is only set at account-creation time and goes stale.
 */
async function fetchAdminName(userId: string): Promise<string | null> {
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
}

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
