'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Truck, ShieldCheck, CreditCard, Clock, Award, Package } from 'lucide-react'

const BADGES = [
  { icon: Truck, label: 'Fast Delivery', sub: 'Next-day dispatch' },
  { icon: ShieldCheck, label: 'FSSAI Certified', sub: 'Quality assured' },
  { icon: CreditCard, label: 'COD + Online', sub: 'Flexible payment' },
  { icon: Clock, label: 'Order Anytime', sub: 'Platform 24/7' },
  { icon: Award, label: '500+ Retailers', sub: 'Trusted in Odisha' },
  { icon: Package, label: 'Bulk Orders', sub: 'Wholesale prices' },
]

export default function TrustBadges() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <section ref={ref} className="px-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {BADGES.map(({ icon: Icon, label, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
            className="flex-shrink-0 flex flex-col items-center gap-2 w-[86px] bg-surface-card border border-table-border rounded-2xl py-3 px-2 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon size={20} className="text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide text-center leading-tight">
              {label}
            </span>
            <span className="text-[9px] text-on-surface-variant text-center leading-snug">{sub}</span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
