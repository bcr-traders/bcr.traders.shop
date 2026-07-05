import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const items = (body as { items?: unknown }).items as
    | { price?: number; quantity?: number }[]
    | undefined
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
  }

  const totalValue = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0,
  )
  const itemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  const supabase = await createClient()

  // Live columns: cart_items / last_activity / total_value / item_count.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('abandoned_carts')
    .upsert(
      {
        user_id: userId,
        cart_items: items,
        total_value: totalValue,
        item_count: itemCount,
        last_activity: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (error) {
    // Table may not exist yet — fail silently so the client never errors
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({})
}
