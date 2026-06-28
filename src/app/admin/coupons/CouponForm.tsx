'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Coupon } from '@/types/database.types'

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors'

function toDateInput(iso: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

type FormState = {
  code: string
  description: string
  description_or: string
  discount_type: 'percentage' | 'flat'
  discount_value: string
  min_order_amount: string
  max_discount: string
  valid_from: string
  valid_until: string
  usage_limit: string
  is_active: boolean
}

export default function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter()
  const isEdit = !!coupon

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    description_or: coupon?.description_or ?? '',
    discount_type: coupon?.discount_type ?? 'percentage',
    discount_value: coupon?.discount_value?.toString() ?? '',
    min_order_amount: coupon?.min_order_amount?.toString() ?? '',
    max_discount: coupon?.max_discount?.toString() ?? '',
    valid_from: toDateInput(coupon?.valid_from ?? null),
    valid_until: toDateInput(coupon?.valid_until ?? null),
    usage_limit: coupon?.usage_limit?.toString() ?? '',
    is_active: coupon?.is_active ?? true,
  })

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Live discount preview
  const previewAmount = 500 // demo order amount
  function previewDiscount() {
    if (!form.discount_value) return null
    const val = parseFloat(form.discount_value)
    const minOrder = form.min_order_amount ? parseFloat(form.min_order_amount) : 0
    if (minOrder > previewAmount) return `Requires ₹${minOrder} min order`
    if (form.discount_type === 'percentage') {
      let disc = (previewAmount * val) / 100
      if (form.max_discount) disc = Math.min(disc, parseFloat(form.max_discount))
      return `-₹${disc.toFixed(2)} on ₹${previewAmount} order`
    }
    return `-₹${val.toFixed(2)} on ₹${previewAmount} order`
  }

  async function handleSave() {
    setError(null)
    if (!form.code.trim()) { setError('Coupon code is required'); return }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      setError('Discount value must be greater than 0'); return
    }
    if (form.discount_type === 'percentage' && parseFloat(form.discount_value) > 100) {
      setError('Percentage cannot exceed 100'); return
    }

    setSaving(true)

    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description.trim() || null,
      description_or: form.description_or.trim() || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      is_active: form.is_active,
    }

    const url = isEdit ? `/api/coupons/${coupon.id}` : '/api/coupons'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      if (!isEdit) {
        router.push('/admin/coupons')
      } else {
        showToast('Coupon saved!')
      }
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Failed to save coupon')
    }

    setSaving(false)
  }

  const preview = previewDiscount()

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-16 z-30 bg-surface border-b border-outline-variant/30 px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/coupons"
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary leading-tight">
              {isEdit ? `Edit: ${coupon.code}` : 'New Coupon'}
            </h1>
            {isEdit && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Used {coupon.usage_count} time{coupon.usage_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/coupons"
            className="px-4 py-2 rounded-full font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-margin-mobile md:mx-margin-desktop mt-4 flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── Form ── */}
      <div className="flex-1 p-margin-mobile md:p-margin-desktop pb-12">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Coupon code */}
          <Section title="Coupon Code">
            <Field label="Code" required hint="Auto-uppercased">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  className={cn(inputCls, 'flex-1 font-mono tracking-widest text-lg')}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
                    set('code', code)
                  }}
                  className="px-3 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-body-md text-body-md hover:bg-surface-container-highest transition-colors whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Description (English)">
                <input
                  type="text"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="20% off on all oils"
                  className={inputCls}
                />
              </Field>
              <Field label="Description (Odia)">
                <input
                  type="text"
                  value={form.description_or}
                  onChange={e => set('description_or', e.target.value)}
                  placeholder="ଓଡ଼ିଆ ବିବରଣ…"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Discount */}
          <Section title="Discount">
            <Field label="Discount Type" required>
              <div className="flex gap-3">
                {(['percentage', 'flat'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('discount_type', type)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-body-md text-body-md transition-colors',
                      form.discount_type === type
                        ? 'bg-primary-container border-primary text-on-primary-container'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {type === 'percentage' ? 'percent' : 'currency_rupee'}
                    </span>
                    {type === 'percentage' ? 'Percentage' : 'Flat Amount'}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                required
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">
                    {form.discount_type === 'percentage' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    value={form.discount_value}
                    min={0}
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    onChange={e => set('discount_value', e.target.value)}
                    placeholder="20"
                    className={cn(inputCls, 'pl-8')}
                  />
                </div>
              </Field>

              {form.discount_type === 'percentage' && (
                <Field label="Max Discount Cap (₹)" hint="Optional">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      value={form.max_discount}
                      min={0}
                      step="0.01"
                      onChange={e => set('max_discount', e.target.value)}
                      placeholder="100"
                      className={cn(inputCls, 'pl-8')}
                    />
                  </div>
                </Field>
              )}

              <Field label="Min Order Amount (₹)" hint="Optional">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">₹</span>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    min={0}
                    step="0.01"
                    onChange={e => set('min_order_amount', e.target.value)}
                    placeholder="500"
                    className={cn(inputCls, 'pl-8')}
                  />
                </div>
              </Field>
            </div>

            {/* Live discount preview */}
            {preview && (
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary-container rounded-xl">
                <span className="material-symbols-outlined text-on-secondary-container text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  info
                </span>
                <p className="font-body-md text-body-md text-on-secondary-container">
                  Preview: <strong>{preview}</strong>
                </p>
              </div>
            )}
          </Section>

          {/* Validity */}
          <Section title="Validity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Valid From" hint="Optional">
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={e => set('valid_from', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Valid Until" hint="Optional">
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={e => set('valid_until', e.target.value)}
                  min={form.valid_from || undefined}
                  className={inputCls}
                />
              </Field>
              <Field label="Usage Limit" hint="Total uses allowed — leave blank for unlimited">
                <input
                  type="number"
                  value={form.usage_limit}
                  min={1}
                  onChange={e => set('usage_limit', e.target.value)}
                  placeholder="Unlimited"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Status */}
          <Section title="Status">
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant/50">
              <div>
                <p className="font-body-md text-body-md text-on-surface font-medium">Active</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Coupon can be applied at checkout
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => set('is_active', !form.is_active)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  form.is_active ? 'bg-primary' : 'bg-surface-container-highest',
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  form.is_active ? 'translate-x-6' : 'translate-x-1',
                )} />
              </button>
            </div>
          </Section>

        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant/30 pb-2">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
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
