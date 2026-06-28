'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors'

type Settings = {
  store_name: string
  store_tagline: string
  store_tagline_or: string
  min_order_value: string
  bulk_order_minimum: string
  low_stock_threshold: string
  admin_notification_email: string
  otp_expiry_minutes: string
  razorpay_enabled: boolean
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-2xl border border-outline-variant/50 p-6 space-y-5" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
      <div className="border-b border-outline-variant/30 pb-3">
        <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
        {sub && <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-label-md text-label-md text-on-surface font-medium">
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {hint && <span className="font-label-sm text-label-sm text-on-surface-variant ml-2 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub: string
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
      <div>
        <p className="font-body-md text-body-md text-on-surface font-medium">{label}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-container-highest',
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )} />
      </button>
    </div>
  )
}

export default function SettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  async function handleSave() {
    setError(null)

    // Validate
    if (!settings.store_name.trim()) { setError('Store name is required'); return }
    const minOrder = parseFloat(settings.min_order_value)
    if (settings.min_order_value && isNaN(minOrder)) { setError('Min order value must be a number'); return }
    const otp = parseInt(settings.otp_expiry_minutes, 10)
    if (settings.otp_expiry_minutes && (isNaN(otp) || otp < 1 || otp > 60)) {
      setError('OTP expiry must be between 1 and 60 minutes'); return
    }

    setSaving(true)

    const payload = {
      store_name: settings.store_name.trim(),
      store_tagline: settings.store_tagline.trim(),
      store_tagline_or: settings.store_tagline_or.trim(),
      min_order_value: settings.min_order_value ? parseFloat(settings.min_order_value) : 0,
      bulk_order_minimum: settings.bulk_order_minimum ? parseFloat(settings.bulk_order_minimum) : 0,
      low_stock_threshold: settings.low_stock_threshold ? parseInt(settings.low_stock_threshold, 10) : 10,
      admin_notification_email: settings.admin_notification_email.trim(),
      otp_expiry_minutes: settings.otp_expiry_minutes ? parseInt(settings.otp_expiry_minutes, 10) : 10,
      razorpay_enabled: settings.razorpay_enabled,
    }

    const res = await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'settings', value: payload }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'Failed to save settings')
    }

    setSaving(false)
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-2xl mx-auto w-full pb-12 space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Settings
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Store configuration — super admin only
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── Store Info ── */}
      <Section title="Store Info" sub="Displayed across the site and synced with CMS footer">
        <Field label="Store Name" required>
          <input
            type="text"
            value={settings.store_name}
            onChange={e => set('store_name', e.target.value)}
            placeholder="BCR Traders"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tagline (English)">
            <input
              type="text"
              value={settings.store_tagline}
              onChange={e => set('store_tagline', e.target.value)}
              placeholder="Your wholesale partner"
              className={inputCls}
            />
          </Field>
          <Field label="Tagline (Odia)">
            <input
              type="text"
              value={settings.store_tagline_or}
              onChange={e => set('store_tagline_or', e.target.value)}
              placeholder="ଆପଣ ଙ୍କ ଥୋକ ସାଥୀ"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* ── Order Settings ── */}
      <Section title="Order Settings" sub="Control minimum thresholds for checkout">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Minimum Order Value (₹)" hint="0 = no minimum">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">₹</span>
              <input
                type="number"
                value={settings.min_order_value}
                min={0}
                step={1}
                onChange={e => set('min_order_value', e.target.value)}
                placeholder="500"
                className={cn(inputCls, 'pl-8')}
              />
            </div>
          </Field>
          <Field label="Bulk Order Minimum (₹)" hint="Qualifies as bulk order">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">₹</span>
              <input
                type="number"
                value={settings.bulk_order_minimum}
                min={0}
                step={1}
                onChange={e => set('bulk_order_minimum', e.target.value)}
                placeholder="5000"
                className={cn(inputCls, 'pl-8')}
              />
            </div>
          </Field>
        </div>

        {/* Preview */}
        {(settings.min_order_value || settings.bulk_order_minimum) && (
          <div className="flex flex-wrap gap-3">
            {settings.min_order_value && parseFloat(settings.min_order_value) > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary-container rounded-xl">
                <span className="material-symbols-outlined text-on-secondary-container text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="font-label-sm text-label-sm text-on-secondary-container">
                  Customers must spend at least <strong>₹{settings.min_order_value}</strong> to checkout
                </p>
              </div>
            )}
            {settings.bulk_order_minimum && parseFloat(settings.bulk_order_minimum) > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary-container rounded-xl">
                <span className="material-symbols-outlined text-on-secondary-container text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="font-label-sm text-label-sm text-on-secondary-container">
                  Orders above <strong>₹{settings.bulk_order_minimum}</strong> are flagged as bulk
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Inventory ── */}
      <Section title="Inventory" sub="Controls when low-stock alerts appear on the admin dashboard">
        <Field label="Low Stock Alert Threshold" hint="Products with stock ≤ this value trigger an alert">
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={settings.low_stock_threshold}
              min={1}
              max={999}
              onChange={e => set('low_stock_threshold', e.target.value)}
              placeholder="10"
              className={cn(inputCls, 'max-w-[140px]')}
            />
            <p className="font-body-md text-body-md text-on-surface-variant">
              units remaining
            </p>
          </div>
        </Field>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" sub="Where admin order alerts are sent — separate from your Clerk login email">
        <Field label="Admin Notification Email">
          <input
            type="email"
            value={settings.admin_notification_email}
            onChange={e => set('admin_notification_email', e.target.value)}
            placeholder="orders@bcrtraders.com"
            className={inputCls}
          />
        </Field>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          New order notifications, low stock alerts, and unserviceable pincode reports are sent here.
        </p>
      </Section>

      {/* ── OTP ── */}
      <Section title="OTP Settings" sub="Controls delivery verification OTP behaviour">
        <Field label="OTP Expiry" hint="1–60 minutes">
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={settings.otp_expiry_minutes}
              min={1}
              max={60}
              onChange={e => set('otp_expiry_minutes', e.target.value)}
              placeholder="10"
              className={cn(inputCls, 'max-w-[140px]')}
            />
            <p className="font-body-md text-body-md text-on-surface-variant">minutes</p>
          </div>
        </Field>
      </Section>

      {/* ── Payments ── */}
      <Section title="Payments" sub="Configure payment gateway availability at checkout">
        <Toggle
          checked={settings.razorpay_enabled}
          onChange={v => set('razorpay_enabled', v)}
          label="Razorpay Online Payments"
          sub="Enable UPI / card / net banking at checkout alongside COD"
        />
        {settings.razorpay_enabled && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <p className="font-body-md text-body-md text-amber-800">
              Ensure <code className="bg-amber-100 px-1 rounded text-sm">RAZORPAY_KEY_ID</code> and <code className="bg-amber-100 px-1 rounded text-sm">RAZORPAY_KEY_SECRET</code> are set in your environment variables before enabling.
            </p>
          </div>
        )}
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          COD (Cash on Delivery) is always available regardless of this toggle.
        </p>
      </Section>

      {/* ── Bottom save ── */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
          {saving ? 'Saving…' : saved ? '✓ All Settings Saved' : 'Save All Settings'}
        </button>
      </div>

    </div>
  )
}
