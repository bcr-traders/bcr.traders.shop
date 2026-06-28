import { auth } from '@clerk/nextjs/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ClerkPublicMetadata } from '@/types'
import type { CartItem, Address, OrderItem } from '@/types/database.types'
import type { OrderEmailData } from '@/lib/resend'

export async function GET() {
  return Response.json({})
}

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return Response.json({ error: 'Profile not configured' }, { status: 400 })

  let body: { address_id: string; items: CartItem[]; notes?: string; is_bulk?: boolean; coupon_code?: string; discount?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { address_id, items, notes, is_bulk, coupon_code, discount } = body

  if (!address_id || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'address_id and items are required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify address belongs to this user
  const { data: rawAddress } = await supabase
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

  // Fetch authoritative prices from DB — never trust client-submitted prices
  const productIds = [...new Set(items.map((i) => i.id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: dbProducts } = await db
    .from('products')
    .select('id, name, price, mrp, unit, images, slug, is_active')
    .in('id', productIds)

  type DbProduct = { id: string; name: string; price: number; mrp: number | null; unit: string; images: string[] | null; slug: string; is_active: boolean }

  if (!dbProducts || (dbProducts as DbProduct[]).length < productIds.length) {
    return Response.json({ error: 'One or more products not found' }, { status: 400 })
  }

  const inactiveProducts = (dbProducts as DbProduct[]).filter((p) => !p.is_active)
  if (inactiveProducts.length > 0) {
    return Response.json({ error: 'One or more products are no longer available' }, { status: 400 })
  }

  const productMap = new Map<string, DbProduct>(
    (dbProducts as DbProduct[]).map((p) => [p.id, p]),
  )

  const orderItems: OrderItem[] = items.map((i) => {
    const product = productMap.get(i.id)!
    return {
      product_id: i.id,
      name: product.name,
      price: product.price,   // authoritative DB price
      mrp: product.mrp ?? null,
      quantity: i.quantity,
      unit: product.unit,
      image: product.images?.[0] ?? null,
    }
  })

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const deliveryFee = 0
  const discountAmt = discount ?? 0
  const total = subtotal + deliveryFee - discountAmt

  const { data: order, error } = await db
    .from('orders')
    .insert({
      user_id: profileId,
      items: orderItems,
      address,
      subtotal,
      delivery_fee: deliveryFee,
      discount: discountAmt,
      coupon_code: coupon_code ?? null,
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

  // Fire-and-forget: emails + low stock check
  void sendOrderEmails(orderId, orderNumber, createdAt, orderItems, address, subtotal, deliveryFee, discountAmt, coupon_code ?? null, total, profileId)

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
