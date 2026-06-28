/**
 * PATCH /api/orders/[id]/return
 *
 * Admin-only. Marks an order as "returned", sets returned_at,
 * and restores stock_qty for each item in the order.
 * Only allowed on orders that are 'delivered'.
 */
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ClerkPublicMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch the order (verify it exists and is in a returnable state)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: fetchError } = await (supabase as any)
    .from('orders')
    .select('id, status, items')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'Only delivered orders can be marked as returned' },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()

  // Mark order as returned
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('orders')
    .update({ status: 'returned', returned_at: now, updated_at: now })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Restore stock — best-effort, fire-and-forget style
  void restoreStock(order.items as OrderItem[], supabase)

  return NextResponse.json({ ok: true, returned_at: now })
}

async function restoreStock(
  items: OrderItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
) {
  for (const item of items) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', item.product_id)
        .maybeSingle()
      if (!product) continue
      await supabase
        .from('products')
        .update({ stock_qty: product.stock_qty + item.quantity })
        .eq('id', item.product_id)
    } catch {
      // Non-fatal — log in production
    }
  }
}
