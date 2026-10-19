import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import SettingsClient from './SettingsClient'
import type { Json } from '@/types/database.types'

export const metadata: Metadata = { title: 'Settings | BCR Admin' }
export const revalidate = 0

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function num(v: unknown, fallback: number): string {
  return typeof v === 'number' ? String(v) : fallback > 0 ? String(fallback) : ''
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

export default async function SettingsPage() {
  // Resolve the role HERE, on the server, exactly as the admin layout does.
  // Deriving it in the client from a browser-side session lookup left a real
  // super_admin with the COD toggle locked, because that lookup reads
  // app_metadata off the client session and can come back without the role
  // even though this request is already authenticated. Same bug the sidebar
  // hit and fixed the same way.
  const { sessionClaims } = await auth()
  const isSuperAdmin = sessionClaims?.publicMetadata?.role === 'super_admin'

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cms_content')
    .select('value')
    .eq('key', 'settings')
    .maybeSingle()

  const raw = (data?.value ?? {}) as Record<string, Json>

  const initialSettings = {
    store_name:               str(raw.store_name, 'BCR Traders'),
    store_tagline:            str(raw.store_tagline, ''),
    store_tagline_or:         str(raw.store_tagline_or, ''),
    min_order_value:          num(raw.min_order_value, 0),
    bulk_order_minimum:       num(raw.bulk_order_minimum, 0),
    // Order timings — default to the shipped 4:00 AM–8:30 PM window, enabled.
    order_hours_enabled:      bool(raw.order_hours_enabled, true),
    order_open_time:          str(raw.order_open_time, '04:00'),
    order_close_time:         str(raw.order_close_time, '20:30'),
    free_delivery_min:        num(raw.free_delivery_min, 1000),
    flat_delivery_fee:        num(raw.flat_delivery_fee, 50),
    low_stock_threshold:      num(raw.low_stock_threshold, 10),
    admin_notification_email: str(raw.admin_notification_email, ''),
    otp_expiry_minutes:       num(raw.otp_expiry_minutes, 10),
    razorpay_enabled:         bool(raw.razorpay_enabled, false),
    // Delivery panel is off by default — it's re-enabled from this page.
    delivery_enabled:         bool(raw.delivery_enabled, false),
    // COD defaults ON: an absent key must never leave the store unable to
    // take cash. Mirrors parseDeliveryConfig() in lib/cart/delivery.ts.
    cod_enabled:              bool(raw.cod_enabled, true),
    cod_online_percent:       num(raw.cod_online_percent, 100),
  }

  return <SettingsClient initialSettings={initialSettings} isSuperAdmin={isSuperAdmin} />
}
