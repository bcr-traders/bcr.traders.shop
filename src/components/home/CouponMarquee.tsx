'use client'

import { Tag } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

type CouponItem = Pick<
  Coupon,
  'id' | 'code' | 'description' | 'description_or' | 'discount_type' | 'discount_value'
>

interface Props {
  coupons: CouponItem[]
}

export default function CouponMarquee({ coupons }: Props) {
  const { tField } = useT()
  if (!coupons.length) return null

  const items = [...coupons, ...coupons]

  return (
    <div className="bg-gradient-to-r from-primary via-primary-container to-primary text-on-primary text-[11px] font-bold py-2.5 overflow-hidden shadow-3xs">
      <div className="flex whitespace-nowrap animate-marquee">
        {items.map((c, i) => {
          const label =
            c.discount_type === 'percentage'
              ? `${c.discount_value}% OFF`
              : `₹${c.discount_value} OFF`
          const desc = c.description ? tField(c.description, c.description_or) : null

          return (
            <span key={`${c.id}-${i}`} className="inline-flex items-center gap-2 px-6">
              <Tag size={12} className="text-primary-fixed flex-shrink-0 animate-pulse" />
              <span className="tracking-wider uppercase">{c.code}</span>
              <span className="text-on-primary/35">—</span>
              <span className="text-primary-fixed">{label}</span>
              {desc && (
                <>
                  <span className="text-on-primary/25">·</span>
                  <span className="text-on-primary/75 font-medium">{desc}</span>
                </>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
