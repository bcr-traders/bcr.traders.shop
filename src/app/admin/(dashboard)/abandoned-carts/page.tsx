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
  const { data } = await (supabase as any)
    .from('abandoned_carts')
    .select('*')
    .order('last_activity', { ascending: false })

  return <AbandonedCartsClient initialCarts={(data ?? []) as AbandonedCart[]} />
}
