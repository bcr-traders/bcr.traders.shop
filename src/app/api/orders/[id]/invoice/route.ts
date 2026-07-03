import { auth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { Order } from '@/types/database.types'
import type { OrderEmailData } from '@/lib/resend'

function orderToEmailData(order: Order): OrderEmailData {
  return {
    orderId: order.id,
    orderNumber: `BCR-${order.id.slice(0, 8).toUpperCase()}`,
    items: order.items,
    address: order.address,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    couponCode: order.coupon_code,
    total: order.total,
    createdAt: order.created_at,
    status: order.status,
    notes: order.notes,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const isAdmin = meta?.role === 'super_admin' || meta?.role === 'admin'
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any, error: any

  if (isAdmin) {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;({ data, error } = await (supabase as any).from('orders').select('*').eq('id', id).maybeSingle())
  } else {
    const profileId = meta?.supabase_profile_id
    if (!profileId) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;({ data, error } = await (supabase as any).from('orders').select('*').eq('id', id).eq('user_id', profileId).maybeSingle())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const order = data as unknown as Order
  const orderNumber = `BCR-${id.slice(0, 8).toUpperCase()}`

  const { generateInvoicePdfBase64 } = await import('@/lib/pdf/invoice')
  let pdfBase64: string
  try {
    pdfBase64 = await generateInvoicePdfBase64(orderToEmailData(order))
  } catch (err) {
    console.error('[invoice] PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="BCR-Invoice-${orderNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.byteLength),
    },
  })
}
