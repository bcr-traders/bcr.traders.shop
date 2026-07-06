import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { CartItem, Address, OrderItem } from '@/types/database.types'
import type { OrderEmailData } from '@/lib/resend'

export async function GET() {
  return Response.json({})
}

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return Response.json({ error: 'Profile not configured' }, { status: 400 })

  let body: { address_id: string; items: CartItem[]; notes?: string; is_bulk?: boolean; coupon_code?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { address_id, items, notes, is_bulk, coupon_code } = body

  if (!address_id || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'address_id and items are required' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Verify the address belongs to this user. `addresses` is a service-role-only
  // table (no anon/authenticated grant), so this MUST use the admin client —
  // scoped to the session's profileId, so it can only ever match the user's own.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawAddress } = await (adminDb as any)
    .from('addresses')
    .select('*')
    .eq('id', address_id)
    .eq('user_id', profileId)
    .maybeSingle()

  const address = rawAddress as unknown as Address | null
  if (!address) return Response.json({ error: 'Address not found' }, { status: 404 })

  // Validate quantities
  for (const item of items) {
    if (!item.id || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return Response.json({ error: 'Invalid item quantity' }, { status: 400 })
    }
  }

  // Fetch authoritative prices from DB — never trust client-submitted prices.
  // Read via the admin client so RLS can't hide an inactive product (that would
  // make it look "missing" instead of "unavailable").
  const productIds = [...new Set(items.map((i) => i.product_id ?? i.id))]
  const { data: dbProducts } = await adminDb
    .from('products')
    .select('id, name, price, mrp, unit, images, slug, is_active, variants')
    .in('id', productIds)

  type DbVariant = { label: string; price: number; mrp: number | null }
  type DbProduct = { id: string; name: string; price: number; mrp: number | null; unit: string; images: string[] | null; slug: string; is_active: boolean; variants: DbVariant[] | null }

  const productMap = new Map<string, DbProduct>(
    ((dbProducts as DbProduct[] | null) ?? []).map((p) => [p.id, p]),
  )

  // Resolve each cart line to authoritative product/variant pricing. Flag any
  // line that's unavailable — product deleted/inactive, or a selected variant
  // that no longer exists — by its CART LINE id so the client can drop it.
  const unavailableIds: string[] = []
  const orderItems: OrderItem[] = []
  for (const i of items) {
    const pid = i.product_id ?? i.id
    const product = productMap.get(pid)
    if (!product || !product.is_active) { unavailableIds.push(i.id); continue }

    let price = product.price
    let mrp = product.mrp ?? null
    let unit = product.unit
    if (i.variant) {
      const variant = (product.variants ?? []).find((v) => v.label === i.variant)
      if (!variant) { unavailableIds.push(i.id); continue }
      price = variant.price
      mrp = variant.mrp ?? null
      unit = variant.label
    }
    orderItems.push({
      product_id: pid,
      name: product.name,
      price,   // authoritative DB (variant) price
      mrp,
      quantity: i.quantity,
      unit,
      image: product.images?.[0] ?? null,
    })
  }

  if (unavailableIds.length > 0) {
    return Response.json({
      error: 'Some items in your cart are no longer available and were removed. Please review your order.',
      error_code: 'items_unavailable',
      unavailable_ids: unavailableIds,
    }, { status: 400 })
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const deliveryFee = 0

  // ── Authoritative coupon validation — never trust a client-sent discount ──
  let discountAmt = 0
  let appliedCouponCode: string | null = null
  let appliedCoupon: { id: string; uses_count: number | null } | null = null

  if (coupon_code && coupon_code.trim()) {
    const { data: coupon } = await adminDb
      .from('coupons')
      .select('id, code, discount_type, discount_value, min_order_value, max_discount, max_uses, uses_count, valid_until, is_active')
      .ilike('code', coupon_code.trim())
      .maybeSingle()

    const c = coupon as null | {
      id: string; code: string; discount_type: 'percentage' | 'flat'; discount_value: number
      min_order_value: number | null; max_discount: number | null; max_uses: number | null
      uses_count: number | null; valid_until: string | null; is_active: boolean
    }

    const invalid =
      !c ||
      !c.is_active ||
      (c.valid_until != null && new Date(c.valid_until) < new Date()) ||
      (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) ||
      (c.min_order_value != null && subtotal < c.min_order_value)

    if (invalid) {
      return Response.json({ error: 'This coupon is not valid for your order.' }, { status: 400 })
    }

    let d =
      c!.discount_type === 'percentage'
        ? Math.round((subtotal * c!.discount_value) / 100)
        : c!.discount_value
    if (c!.max_discount != null && d > c!.max_discount) d = c!.max_discount
    discountAmt = Math.min(d, subtotal)
    appliedCouponCode = c!.code
    appliedCoupon = { id: c!.id, uses_count: c!.uses_count }
  }

  const total = subtotal + deliveryFee - discountAmt

  const { data: order, error } = await adminDb
    .from('orders')
    .insert({
      user_id: profileId,
      items: orderItems,
      address,
      subtotal,
      delivery_fee: deliveryFee,
      discount: discountAmt,
      coupon_code: appliedCouponCode,
      total,
      payment_method: 'cod',
      status: 'placed',
      notes: notes?.trim() || null,
      is_bulk: is_bulk ?? false,
    })
    .select('id, order_number, created_at')
    .single()

  if (error) {
    console.error('Order creation failed:', error.message)
    return Response.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const { id: orderId, order_number: orderNumber, created_at: createdAt } =
    order as { id: string; order_number: string; created_at: string }

  // Decrement stock immediately to prevent overselling
  void decrementStock(orderItems)

  // Record coupon usage
  if (appliedCoupon) {
    void adminDb
      .from('coupons')
      .update({ uses_count: (appliedCoupon.uses_count ?? 0) + 1 })
      .eq('id', appliedCoupon.id)
  }

  // Mark this customer's abandoned cart as recovered (best-effort).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (adminDb as any).from('abandoned_carts').update({ is_recovered: true }).eq('user_id', profileId)

  // Fire-and-forget: emails + low stock check
  void sendOrderEmails(orderId, orderNumber, createdAt, orderItems, address, subtotal, deliveryFee, discountAmt, appliedCouponCode, total, profileId)

  return Response.json({ order_id: orderId }, { status: 201 })
}

async function sendOrderEmails(
  orderId: string,
  orderNumber: string,
  createdAt: string,
  items: OrderItem[],
  address: Address,
  subtotal: number,
  deliveryFee: number,
  discount: number,
  couponCode: string | null,
  total: number,
  profileId: string,
) {
  try {
    const resend = await import('@/lib/resend')
    const supabase = createAdminClient()

    // Get customer email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .maybeSingle()

    const emailData: OrderEmailData = {
      orderId,
      orderNumber,
      items,
      address,
      subtotal,
      deliveryFee,
      discount,
      couponCode,
      total,
      createdAt,
      customerEmail: (profile as { email?: string | null } | null)?.email ?? null,
      customerName: address.name,
    }

    const admins = await resend.getOrderEmailAdmins()

    await Promise.allSettled([
      resend.sendOrderPlacedCustomer(emailData),
      resend.sendOrderPlacedAdmin(emailData, admins),
      checkLowStock(items, supabase, resend),
    ])
  } catch (e) {
    console.error('Order email error:', e)
  }
}

async function decrementStock(items: OrderItem[]) {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const productIds = items.map((i) => i.product_id)
    const { data: products } = await db
      .from('products')
      .select('id, stock_qty')
      .in('id', productIds)
    if (!products) return
    type StockRow = { id: string; stock_qty: number }
    await Promise.all(
      (products as StockRow[]).map((p) => {
        const ordered = items.filter((i) => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0)
        const next = Math.max(0, p.stock_qty - ordered)
        return db.from('products').update({ stock_qty: next }).eq('id', p.id)
      }),
    )
  } catch (e) {
    console.error('Stock decrement failed:', e)
  }
}

async function checkLowStock(
  items: OrderItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resend: typeof import('@/lib/resend'),
) {
  const productIds = items.map(i => i.product_id)

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, stock_qty, low_stock_threshold')
    .in('id', productIds)

  if (!products) return

  type ProductRow = { id: string; name: string; sku: string | null; stock_qty: number; low_stock_threshold: number }
  const lowStock = (products as ProductRow[])
    .filter(p => p.stock_qty <= p.low_stock_threshold)
    .map(p => ({ id: p.id, name: p.name, sku: p.sku, stockQty: p.stock_qty, lowStockThreshold: p.low_stock_threshold }))

  if (!lowStock.length) return

  const admins = await resend.getLowStockAlertAdmins()
  await resend.sendLowStockAlert({ products: lowStock }, admins)
}
