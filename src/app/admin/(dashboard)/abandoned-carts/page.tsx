import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import AbandonedCartsClient from './AbandonedCartsClient'

export const metadata: Metadata = { title: 'Abandoned Carts | BCR Admin' }
export const dynamic = 'force-dynamic'

export interface AbandonedCart {
  id: string
  user_id: string
  customer_name: string | null
  phone: string | null
  items: { name: string; quantity: number; price: number; unit: string }[]
  total_value: number
  item_count: number
  is_recovered: boolean
  last_activity: string
  created_at: string
}

export default async function AbandonedCartsPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('abandoned_carts')
    .select('*')
    .order('last_activity', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]

  // The live table stores cart_items (not items) and has no customer_name —
  // join profiles to show who abandoned each cart.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, name').in('id', userIds)
    : { data: [] }
  const nameById = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((profiles ?? []) as any[]).map((p) => [p.id, p.name]),
  )

  const carts = rows.map((c) => ({
    ...c,
    items: Array.isArray(c.cart_items) ? c.cart_items : [],
    customer_name: nameById[c.user_id] ?? c.customer_name ?? null,
  })) as AbandonedCart[]

  return <AbandonedCartsClient initialCarts={carts} />
}
