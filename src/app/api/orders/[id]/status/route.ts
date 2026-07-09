import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { OrderStatus, OrderItem } from '@/types/database.types'
import { notifyOrderEvent } from '@/lib/resend/notify'

const VALID_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: OrderStatus; notes?: string; estimated_delivery?: string; custom_message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.estimated_delivery !== undefined) updateData.estimated_delivery = body.estimated_delivery
  if (body.custom_message !== undefined) updateData.custom_message = body.custom_message

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Restore stock when an order is cancelled
  if (body.status === 'cancelled') {
    void restoreStockOnCancel(id)
  }

  // Notify the customer AND every eligible admin/super-admin on each status
  // change (PRD #4). Best-effort — never blocks the status update.
  if (body.status && ['confirmed', 'packed', 'shipping', 'delivered', 'cancelled'].includes(body.status)) {
    void notifyOrderEvent(id, body.status, { adminProfileId: meta?.admin_profile_id ?? null })
  }

  return NextResponse.json({ ok: true })
}

async function restoreStockOnCancel(orderId: string) {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: order } = await db
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .maybeSingle()
    const items = (order?.items ?? []) as OrderItem[]
    if (!items.length) return
    const productIds = items.map((i) => i.product_id)
    const { data: products } = await db
      .from('products')
      .select('id, stock_qty')
      .in('id', productIds)
    if (!products) return
    type StockRow = { id: string; stock_qty: number }
    await Promise.all(
      (products as StockRow[]).map((p) => {
        const qty = items.filter((i) => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0)
        return db.from('products').update({ stock_qty: p.stock_qty + qty }).eq('id', p.id)
      }),
    )
  } catch (e) {
    console.error('Stock restore failed:', e)
  }
}

