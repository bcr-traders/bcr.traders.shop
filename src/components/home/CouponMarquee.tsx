'use client'

import { Tag } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

type CouponItem = Pick<
  Coupon,
  | 'id' | 'code' | 'description' | 'description_or' | 'discount_type' | 'discount_value'
  | 'marquee_message' | 'marquee_message_or'
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
          // An admin-written line for THIS coupon (migration 030). When present
          // it replaces the auto-composed "20% OFF · description" half; the code
          // still leads, since that's what the customer has to copy.
          const custom = c.marquee_message
            ? tField(c.marquee_message, c.marquee_message_or ?? null)
            : null

          return (
            <span key={`${c.id}-${i}`} className="inline-flex items-center gap-2 px-6">
              {/* White throughout: the original text-primary-fixed (#2E2011) was
                  the same brown as this bar (1.16:1). */}
              <Tag size={12} className="text-white flex-shrink-0 animate-pulse" />
              <span className="tracking-wider uppercase text-white">{c.code}</span>
              <span className="text-white/40">—</span>
              {custom ? (
                <span className="text-white font-medium">{custom}</span>
              ) : (
                <>
                  <span className="text-white">{label}</span>
                  {desc && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="text-white/80 font-medium">{desc}</span>
                    </>
                  )}
                </>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
