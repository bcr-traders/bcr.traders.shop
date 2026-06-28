import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import UnserviceableClient from './UnserviceableClient'

export const metadata: Metadata = { title: 'Unserviceable Attempts | BCR Admin' }
export const dynamic = 'force-dynamic'

export interface UnserviceableAttempt {
  id: string
  customer_name: string | null
  phone: string | null
  pincode: string
  city: string | null
  cart_value: number | null
  cart_items: { name: string; quantity: number }[] | null
  is_contacted: boolean
  notes: string | null
  created_at: string
}

export default async function UnserviceablePage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('unserviceable_attempts')
    .select('*')
    .order('created_at', { ascending: false })

  return <UnserviceableClient initialRows={(data ?? []) as UnserviceableAttempt[]} />
}
