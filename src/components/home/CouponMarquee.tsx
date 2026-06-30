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
    <div className="bg-primary text-on-primary text-xs py-2 overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee">
        {items.map((c, i) => {
          const label =
            c.discount_type === 'percentage'
              ? `${c.discount_value}% OFF`
              : `₹${c.discount_value} OFF`
          const desc = c.description ? tField(c.description, c.description_or) : null

          return (
            <span key={`${c.id}-${i}`} className="inline-flex items-center gap-2 px-5">
              <Tag size={13} className="text-primary-fixed flex-shrink-0" />
              <span className="font-bold tracking-wide">{c.code}</span>
              <span className="text-on-primary/60">—</span>
              <span className="text-on-primary/90">{label}</span>
              {desc && (
                <>
                  <span className="text-on-primary/40">·</span>
                  <span className="text-on-primary/80">{desc}</span>
                </>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
