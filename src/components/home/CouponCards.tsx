'use client'

import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

interface Props {
  coupons: Coupon[]
}

export default function CouponCards({ coupons }: Props) {
  const { tField } = useT()
  if (!coupons.length) return null

  return (
    <section className="px-4">
      <h3 className="text-base font-bold text-primary mb-3">Active Offers</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {coupons.map((coupon) => {
          const discount =
            coupon.discount_type === 'percentage'
              ? `${coupon.discount_value}% OFF`
              : `₹${coupon.discount_value} OFF`
          const desc = coupon.description
            ? tField(coupon.description, coupon.description_or)
            : null

          return (
            <div
              key={coupon.id}
              className="flex-shrink-0 w-60 bg-surface-container border border-table-border rounded-xl p-4 flex items-center justify-between shadow-sm"
            >
              <div className="min-w-0">
                <div className="text-lg font-bold text-primary leading-tight">{discount}</div>
                {desc && (
                  <div className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{desc}</div>
                )}
              </div>
              <div className="border-l-2 border-dashed border-outline-variant pl-4 py-1 ml-3 flex-shrink-0">
                <span className="text-xs font-bold text-on-primary-fixed-variant bg-primary-fixed px-2 py-1 rounded-md tracking-wide">
                  {coupon.code}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
