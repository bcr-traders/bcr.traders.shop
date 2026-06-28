import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
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
    low_stock_threshold:      num(raw.low_stock_threshold, 10),
    admin_notification_email: str(raw.admin_notification_email, ''),
    otp_expiry_minutes:       num(raw.otp_expiry_minutes, 10),
    razorpay_enabled:         bool(raw.razorpay_enabled, false),
  }

  return <SettingsClient initialSettings={initialSettings} />
}
