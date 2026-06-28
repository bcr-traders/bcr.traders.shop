import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { ClerkPublicMetadata } from '@/types'
import type { Order } from '@/types/database.types'
import OrderDetailClient from './OrderDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}

export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login')

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) redirect('/login')

  const { id } = await params
  const { new: isNew } = await searchParams

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', profileId)
    .maybeSingle()

  if (error || !data) notFound()

  return <OrderDetailClient order={data as unknown as Order} isNew={isNew === '1'} />
}
