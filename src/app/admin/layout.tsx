import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ClerkPublicMetadata } from '@/types'
import { createAdminClient } from '@/lib/supabase/server'
import AdminShell from '@/components/layout/AdminShell'

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/admin/login')

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  const role = meta?.role

  if (role !== 'super_admin' && role !== 'admin') redirect('/admin/login')

  const badges = await fetchBadges()

  return <AdminShell role={role} badges={badges}>{children}</AdminShell>
}
