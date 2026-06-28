'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Coupon } from '@/types/database.types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(coupon: Coupon) {
  if (!coupon.valid_until) return false
  return new Date(coupon.valid_until) < new Date()
}

function usagePercent(coupon: Coupon) {
  if (!coupon.usage_limit) return null
  return Math.min(100, Math.round((coupon.usage_count / coupon.usage_limit) * 100))
}

export default function CouponsClient({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  async function toggleActive(id: string, current: boolean) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    if (res.ok) setCoupons(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Coupons
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Coupon
        </Link>
      </div>

      {/* ── Table ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.08)' }}
      >
        {coupons.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_offer
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">No coupons yet.</p>
            <Link
              href="/admin/coupons/new"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create first coupon
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  {['Code', 'Type', 'Value', 'Min Order', 'Cap', 'Usage', 'Valid Until', 'Active', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const pct = usagePercent(coupon)
                  const expired = isExpired(coupon)
                  return (
                    <tr
                      key={coupon.id}
                      className={cn(
                        'border-b border-outline-variant/20 last:border-0 transition-colors',
                        expired ? 'bg-surface-container-low/40' : 'hover:bg-surface-container-low',
                      )}
                    >
                      {/* Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-primary-container text-on-primary-container rounded-lg font-mono font-bold text-sm tracking-wide">
                            {coupon.code}
                          </span>
                          {expired && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-label-sm text-label-sm text-[10px]">
                              Expired
                            </span>
                          )}
                        </div>
                        {coupon.description && (
                          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 max-w-[180px] truncate">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full font-label-sm text-label-sm',
                          coupon.discount_type === 'percentage'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700',
                        )}>
                          {coupon.discount_type === 'percentage' ? 'Percentage' : 'Flat'}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-semibold">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `₹${coupon.discount_value}`}
                      </td>

                      {/* Min order */}
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                        {coupon.min_order_amount ? `₹${coupon.min_order_amount}` : '—'}
                      </td>

                      {/* Cap */}
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                        {coupon.max_discount ? `₹${coupon.max_discount}` : '—'}
                      </td>

                      {/* Usage */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <p className="font-body-md text-body-md text-on-surface">
                            {coupon.usage_count}
                            {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                          </p>
                          {pct !== null && (
                            <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', pct >= 90 ? 'bg-error' : pct >= 70 ? 'bg-amber-500' : 'bg-primary')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Valid until */}
                      <td className={cn('py-3 px-4 font-body-md text-body-md', expired ? 'text-error' : 'text-on-surface-variant')}>
                        {formatDate(coupon.valid_until)}
                      </td>

                      {/* Active toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={coupon.is_active}
                          disabled={!!saving[coupon.id]}
                          onClick={() => toggleActive(coupon.id, coupon.is_active)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
                            coupon.is_active ? 'bg-primary' : 'bg-surface-container-highest',
                          )}
                        >
                          <span className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                            coupon.is_active ? 'translate-x-4' : 'translate-x-1',
                          )} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/coupons/${coupon.id}`}
                            title="Edit"
                            className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          <button
                            onClick={() => deleteCoupon(coupon.id, coupon.code)}
                            disabled={deleting === coupon.id}
                            title="Delete"
                            className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {deleting === coupon.id ? 'progress_activity' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
