import { after } from 'next/server'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cleanGstin } from '@/lib/validations/gst'
import { findBuyOption } from '@/lib/products/packaging'
import { getReferralConfig, computeRefereeDiscount, computeReferrerReward } from '@/lib/referral/config'
import { generateUniqueReferralCode } from '@/lib/referral/code'
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

  let body: { address_id: string; items: CartItem[]; notes?: string; is_bulk?: boolean; coupon_code?: string; email?: string; gstin?: string; gst_business_name?: string; referral_code?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { address_id, items, notes, is_bulk, coupon_code, email } = body

  if (!address_id || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'address_id and items are required' }, { status: 400 })
  }

  // Optional GST invoice ("claim GST bill"). If a GSTIN is supplied it must be
  // valid, and a business name is required alongside it.
  const gstin = cleanGstin(body.gstin)
  const gstBusinessName = body.gst_business_name?.trim() || null
  if (body.gstin && body.gstin.trim() && !gstin) {
    return Response.json({ error: 'Enter a valid 15-character GSTIN, or leave it blank.' }, { status: 400 })
  }
  if (gstin && !gstBusinessName) {
    return Response.json({ error: 'Business name is required for a GST invoice.' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // PRD #3: an order requires a valid customer email on file. Enforce it here
  // server-side so it can't be bypassed even if the client gate is skipped.
  // The email the customer typed at checkout is saved to their profile so all
  // order/status emails can reach them (phone-only signups otherwise have none).
  const isRealEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/@bcrtraders\.internal$/i.test(e)
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (isRealEmail(cleanEmail)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminDb as any).from('profiles').update({ email: cleanEmail }).eq('id', profileId)
  } else {
    // No valid email supplied — fall back to whatever is already on the profile.
    // Existing customers who already have a real email are unaffected (backfill:
    // existing profiles/orders are exempt; only new orders require an email).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prof } = await (adminDb as any).from('profiles').select('email').eq('id', profileId).maybeSingle()
    if (!isRealEmail((prof?.email as string | null) ?? '')) {
      return Response.json(
        { error: 'A valid email address is required to place your order.', error_code: 'email_required' },
        { status: 400 },
      )
    }
  }

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
    .select('id, name, price, mrp, unit, images, slug, is_active, variants, pack_type, unit_type, units_per_pack, pieces_per_secondary, secondary_price, secondary_mrp')
    .in('id', productIds)

  type DbVariant = { label: string; price: number; mrp: number | null }
  type DbProduct = {
    id: string; name: string; price: number; mrp: number | null; unit: string
    images: string[] | null; slug: string; is_active: boolean; variants: DbVariant[] | null
    pack_type: string | null; unit_type: string | null; units_per_pack: number | null
    pieces_per_secondary: number | null; secondary_price: number | null; secondary_mrp: number | null
  }

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
    let stockUnits = i.quantity
    // Packaging levels (Box / Hanger / Pack / Tin): price the chosen level
    // authoritatively from the DB — never trust the client's price.
    const buyOption = findBuyOption(product, i.variant)
    if (buyOption) {
      price = buyOption.price
      mrp = buyOption.mrp
      unit = buyOption.pieces != null
        ? `${buyOption.label} · ${buyOption.pieces} pieces`
        : buyOption.label
      stockUnits = i.quantity
    } else if (i.variant) {
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
      stock_units: stockUnits,
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

  // ── Referral program ──────────────────────────────────────────────────────
  // (a) A new customer (0 prior orders) redeeming a code gets the "taker"
  //     discount on this first order; the referrer is credited afterwards.
  // (b) The buyer's own accrued referral credit auto-applies to this order.
  const referralCfg = await getReferralConfig()
  let refereeDiscount = 0
  let referrerIdToCredit: string | null = null
  let redeemedCode: string | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: priorOrderCount } = await (adminDb as any)
    .from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profileId)
  const isFirstOrder = (priorOrderCount ?? 0) === 0

  if (referralCfg.enabled && body.referral_code?.trim() && isFirstOrder) {
    const code = body.referral_code.trim().toUpperCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: refProfile } = await (adminDb as any)
      .from('profiles').select('id, referral_code').eq('referral_code', code).maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: alreadyReferred } = await (adminDb as any)
      .from('referrals').select('id').eq('referee_id', profileId).maybeSingle()
    const minOk = referralCfg.min_order_value == null || subtotal >= referralCfg.min_order_value
    if (refProfile && refProfile.id !== profileId && !alreadyReferred && minOk) {
      refereeDiscount = computeRefereeDiscount(subtotal, referralCfg)
      referrerIdToCredit = refProfile.id as string
      redeemedCode = refProfile.referral_code as string
    } else {
      return Response.json(
        { error: 'This referral code cannot be applied to your order.', error_code: 'referral_invalid' },
        { status: 400 },
      )
    }
  }

  // Buyer's own accrued credit (earned from referring others) auto-applies here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buyerProfile } = await (adminDb as any)
    .from('profiles').select('referral_code, referral_credit').eq('id', profileId).maybeSingle()
  const availableCredit = Math.max(0, Number(buyerProfile?.referral_credit ?? 0))
  const referralCreditApplied = Math.min(availableCredit, Math.max(0, subtotal - discountAmt - refereeDiscount))

  const totalDiscount = discountAmt + refereeDiscount + referralCreditApplied
  const total = Math.max(0, subtotal - totalDiscount) + deliveryFee

  const { data: order, error } = await adminDb
    .from('orders')
    .insert({
      user_id: profileId,
      items: orderItems,
      address,
      subtotal,
      delivery_fee: deliveryFee,
      discount: totalDiscount,
      coupon_code: appliedCouponCode,
      total,
      payment_method: 'cod',
      status: 'placed',
      notes: notes?.trim() || null,
      is_bulk: is_bulk ?? false,
      // Only reference the GST columns when the buyer actually asked for a GST
      // invoice. Naming a column that doesn't exist on the live table fails the
      // WHOLE insert, so a plain order must never depend on them.
      ...(gstin ? { gstin, gst_business_name: gstBusinessName } : {}),
    })
    .select('id, order_number, created_at')
    .single()

  if (error) {
    // Surface the real Postgres message — "Failed to create order" alone makes
    // schema/permission problems impossible to diagnose from the client.
    console.error('Order creation failed:', error.message)
    return Response.json({ error: 'Failed to create order', detail: error.message }, { status: 500 })
  }

  const { id: orderId, order_number: orderNumber, created_at: createdAt } =
    order as { id: string; order_number: string; created_at: string }

  // ── Referral: give the buyer their own code now that they've purchased ──
  // Done synchronously so it exists when the order-success celebration loads.
  if (referralCfg.enabled && !buyerProfile?.referral_code) {
    try {
      const newCode = await generateUniqueReferralCode(adminDb, address.name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminDb as any).from('profiles').update({ referral_code: newCode }).eq('id', profileId)
    } catch (e) { console.error('Referral code generation failed:', e) }
  }

  // Settle referral rewards after the response: spend the buyer's applied credit,
  // and (if they redeemed a code) record the referral + credit the referrer.
  if (referralCfg.enabled && (referralCreditApplied > 0 || referrerIdToCredit)) {
    after(async () => {
      try {
        const db = createAdminClient()
        if (referralCreditApplied > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('profiles').update({ referral_credit: Math.max(0, availableCredit - referralCreditApplied) }).eq('id', profileId)
        }
        if (referrerIdToCredit) {
          const reward = computeReferrerReward(subtotal, referralCfg)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('referrals').insert({ referrer_id: referrerIdToCredit, referee_id: profileId, code: redeemedCode, order_id: orderId, reward_amount: reward })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rp } = await (db as any).from('profiles').select('referral_credit').eq('id', referrerIdToCredit).maybeSingle()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('profiles').update({ referral_credit: Number(rp?.referral_credit ?? 0) + reward }).eq('id', referrerIdToCredit)
        }
      } catch (e) { console.error('Referral settlement failed:', e) }
    })
  }

  // Decrement stock immediately to prevent overselling
  void decrementStock(orderItems)

  // Record coupon usage atomically so concurrent orders can't push a coupon past
  // its max_uses (migration 014). Falls back to a plain update if the function
  // isn't present yet.
  if (appliedCoupon) {
    const cid = appliedCoupon.id
    const prevCount = appliedCoupon.uses_count ?? 0
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminDb as any).rpc('increment_coupon_use', { p_coupon_id: cid })
      if (error) {
        await adminDb.from('coupons').update({ uses_count: prevCount + 1 }).eq('id', cid)
      }
    })()
  }

  // Mark this customer's abandoned cart as recovered (best-effort).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (adminDb as any).from('abandoned_carts').update({ is_recovered: true }).eq('user_id', profileId)

  // Emails + low stock check run AFTER the response is sent. `after()` (vs a bare
  // `void`) is what makes this reliable on serverless: the platform keeps the
  // function alive until the callback finishes, so the email actually goes out
  // promptly instead of being frozen/dropped when the response returns.
  after(() => sendOrderEmails(orderId, orderNumber, createdAt, orderItems, address, subtotal, deliveryFee, discountAmt, appliedCouponCode, total, profileId))

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
    // A product may appear as several variant lines — sum the stock units per
    // product (spices consume units, not hanger/pack count; falls back to
    // quantity for normal products and legacy lines without stock_units).
    const byProduct = new Map<string, number>()
    for (const i of items) byProduct.set(i.product_id, (byProduct.get(i.product_id) ?? 0) + (i.stock_units ?? i.quantity))

    await Promise.all(
      [...byProduct].map(async ([pid, qty]) => {
        // Atomic guarded decrement (migration 014): never oversells / goes negative.
        const { error } = await db.rpc('decrement_product_stock', { p_product_id: pid, p_qty: qty })
        if (!error) return
        // Fallback if migration 014 isn't applied yet: best-effort read-then-write.
        const { data: p } = await db.from('products').select('stock_qty').eq('id', pid).maybeSingle()
        if (p) await db.from('products').update({ stock_qty: Math.max(0, p.stock_qty - qty) }).eq('id', pid)
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
