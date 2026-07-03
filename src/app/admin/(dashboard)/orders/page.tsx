import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export const metadata: Metadata = { title: 'Orders | BCR Admin' }
export const revalidate = 0

export default async function OrdersPage() {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('orders')
    .select('id, status, total, created_at, address, items, payment_method')
    .order('created_at', { ascending: false })
    .limit(300)

  return <OrdersClient initialOrders={data ?? []} />
}
