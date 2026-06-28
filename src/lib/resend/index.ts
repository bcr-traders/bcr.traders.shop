import { Resend } from 'resend'
import { render } from '@react-email/components'
import type { OrderItem, Address } from '@/types/database.types'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'BCR Traders <noreply@bcrtraders.in>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bcrtraders.in'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrderEmailData {
  orderId: string
  orderNumber: string
  items: OrderItem[]
  address: Address
  subtotal: number
  deliveryFee: number
  discount?: number
  couponCode?: string | null
  total: number
  createdAt: string
  customerEmail?: string | null
  customerName?: string
  estimatedDelivery?: string | null
  customMessage?: string | null
  confirmedByName?: string | null
  status?: string
  notes?: string | null
}

export interface AdminRecipient {
  email: string
  name: string
}

export interface UnserviceableEmailData {
  id: string
  customerName: string | null
  phone: string
  pincode: string
  city: string | null
  cartItems: OrderItem[] | null
  cartValue: number | null
}

export interface LowStockEmailData {
  products: Array<{ id: string; name: string; sku: string | null; stockQty: number; lowStockThreshold: number }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function renderTemplate(Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown>): Promise<string> {
  const React = await import('react')
  return render(React.createElement(Component as React.ComponentType, props))
}

/** Fetch all admin emails where receive_order_emails = true AND role != delivery */
export async function getOrderEmailAdmins(): Promise<AdminRecipient[]> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_profiles')
    .select('name, email, role, permissions')
    .eq('is_active', true)
    .not('email', 'is', null)

  if (!data) return []
  return (data as Array<{ name: string; email: string | null; role: string; permissions: Record<string, boolean> | null }>)
    .filter(
      (a) =>
        a.email &&
        a.role !== 'delivery' &&
        (a.role === 'super_admin' || a.permissions?.receive_order_emails === true),
    )
    .map((a) => ({ name: a.name, email: a.email! }))
}

/** Fetch super-admin + manage_products admins for low stock alerts */
export async function getLowStockAlertAdmins(): Promise<AdminRecipient[]> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_profiles')
    .select('name, email, role, permissions')
    .eq('is_active', true)
    .not('email', 'is', null)

  if (!data) return []
  return (data as Array<{ name: string; email: string | null; role: string; permissions: Record<string, boolean> }>)
    .filter(a => a.email && (a.role === 'super_admin' || a.permissions?.manage_products))
    .map(a => ({ name: a.name, email: a.email! }))
}

// ── Email Senders ──────────────────────────────────────────────────────────────

export async function sendOrderPlacedCustomer(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const { default: Template } = await import('./templates/order-placed-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `Order Received! #${data.orderNumber} — BCR TRADERS`,
    html,
  })
}

export async function sendOrderPlacedAdmin(data: OrderEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length) return
  const { default: Template } = await import('./templates/order-placed-admin')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `🛒 New Order #${data.orderNumber} | ₹${data.total.toLocaleString('en-IN')} | ${data.address.phone}`,
    html,
  })
}

export async function sendOrderConfirmedCustomer(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const { default: Template } = await import('./templates/order-confirmed-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const attachments = await buildInvoiceAttachment(data)
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `✅ Order Confirmed! #${data.orderNumber} — BCR TRADERS`,
    html,
    attachments,
  })
}

export async function sendOrderStatusUpdate(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const isDelivered = data.status === 'delivered'
  const { default: Template } = await import('./templates/order-status-update')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const attachments = isDelivered ? await buildInvoiceAttachment(data) : []
  const statusTitle = STATUS_TITLES[data.status ?? ''] ?? data.status ?? 'Updated'
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `📦 Order Update: ${statusTitle} | #${data.orderNumber}`,
    html,
    attachments,
  })
}

export async function sendUnserviceableAlert(data: UnserviceableEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length) return
  const { default: Template } = await import('./templates/unserviceable-pincode-admin')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `⚠️ Unserviceable Pincode — ${data.pincode} | ${data.phone}`,
    html,
  })
}

export async function sendLowStockAlert(data: LowStockEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length || !data.products.length) return
  const { default: Template } = await import('./templates/low-stock-alert')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const names = data.products.map(p => p.name).join(', ')
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `⚠️ Low Stock Alert: ${names.slice(0, 60)}${names.length > 60 ? '…' : ''}`,
    html,
  })
}

// ── Invoice PDF attachment ─────────────────────────────────────────────────────

async function buildInvoiceAttachment(data: OrderEmailData): Promise<Array<{ filename: string; content: string }>> {
  try {
    const { generateInvoicePdfBase64 } = await import('@/lib/pdf/invoice')
    const base64 = await generateInvoicePdfBase64(data)
    return [{ filename: `BCR-Invoice-${data.orderNumber}.pdf`, content: base64 }]
  } catch {
    return []
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_TITLES: Record<string, string> = {
  confirmed:        'Order Confirmed',
  packed:           'Order Packed',
  shipping:         'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Order Cancelled',
}
