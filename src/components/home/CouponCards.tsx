'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Tag, Copy, Check } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

interface Props {
  coupons: Coupon[]
}

export default function CouponCards({ coupons }: Props) {
  const { tField } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [copied, setCopied] = useState<string | null>(null)

  if (!coupons.length) return null

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="px-4">
      <h3 className="text-base font-bold text-primary mb-3">Active Offers</h3>
      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {coupons.map((coupon, i) => {
          const discount =
            coupon.discount_type === 'percentage'
              ? `${coupon.discount_value}% OFF`
              : `₹${coupon.discount_value} OFF`
          const desc = coupon.description
            ? tField(coupon.description, coupon.description_or)
            : null
          const isCopied = copied === coupon.code

          return (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, x: 24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
              className="flex-shrink-0 w-64"
            >
              <div className="relative bg-primary rounded-2xl overflow-hidden shadow-md">
                {/* Decorative circles */}
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute -bottom-8 -left-5 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

                <div className="relative flex items-stretch min-h-[80px]">
                  {/* Left — discount info */}
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-1 mb-1">
                      <Tag size={11} className="text-primary-fixed" />
                      <span className="text-[9px] font-bold text-primary-fixed uppercase tracking-widest">
                        Coupon
                      </span>
                    </div>
                    <div className="text-2xl font-black text-white leading-tight tracking-tight">
                      {discount}
                    </div>
                    {desc && (
                      <div className="text-[11px] text-white/70 mt-1 leading-snug line-clamp-2">
                        {desc}
                      </div>
                    )}
                  </div>

                  {/* Separator with punch-holes */}
                  <div className="relative flex flex-col items-center justify-center w-4">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-surface-card rounded-full" />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-surface-card rounded-full" />
                    <div className="h-full border-l-2 border-dashed border-white/25" />
                  </div>

                  {/* Right — code + copy */}
                  <div className="w-24 flex flex-col items-center justify-center gap-2 py-4 pr-4 pl-2">
                    <span className="text-[11px] font-black text-white tracking-widest text-center break-all leading-tight">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => copy(coupon.code)}
                      className="flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/35 active:bg-white/10 text-white px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {isCopied ? <Check size={11} /> : <Copy size={11} />}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
