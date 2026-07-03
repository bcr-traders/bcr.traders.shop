import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import TimelineClient from './TimelineClient'

export const metadata: Metadata = { title: 'Order Timeline | BCR Admin' }
export const revalidate = 0

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderRes = await (supabase as any)
    .from('orders')
    .select('id, status, created_at, address')
    .eq('id', id)
    .maybeSingle()

  if (!orderRes.data) notFound()

  // Fetch timeline entries — returns [] if table doesn't exist yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineRes = await (supabase as any)
    .from('order_timeline')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const timeline = timelineRes.error?.code === '42P01' ? [] : (timelineRes.data ?? [])
  const tableExists = !timelineRes.error || timelineRes.error.code !== '42P01'

  return (
    <TimelineClient
      orderId={id}
      orderStatus={orderRes.data.status}
      orderRef={`#${id.slice(-8).toUpperCase()}`}
      initialTimeline={timeline}
      tableExists={tableExists}
    />
  )
}
