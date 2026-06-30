'use client'

import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'

const STATS = [
  { end: 500, suffix: '+', label: 'Retailers', subLabel: 'Served' },
  { end: 67, suffix: '+', label: 'Pincodes', subLabel: 'Covered' },
  { end: 6, suffix: '', label: 'Categories', subLabel: 'Available' },
  { end: 5, suffix: '+', label: 'Years', subLabel: 'in Business' },
]

function useCountUp(end: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, active])
  return count
}

function StatItem({
  end,
  suffix,
  label,
  subLabel,
  active,
}: {
  end: number
  suffix: string
  label: string
  subLabel: string
  active: boolean
}) {
  const count = useCountUp(end, 1400, active)
  return (
    <div className="flex flex-col items-center text-center flex-1 px-2 first:pl-0 last:pr-0">
      <span className="text-2xl md:text-3xl font-black text-primary leading-none tabular-nums">
        {count}
        {suffix}
      </span>
      <span className="text-[11px] font-bold text-on-surface mt-1 leading-tight">{label}</span>
      <span className="text-[10px] text-on-surface-variant leading-tight">{subLabel}</span>
    </div>
  )
}

export default function AnimatedStats() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4">
      <div className="bg-primary-fixed border border-table-border rounded-2xl py-5 px-4">
        <div className="flex divide-x divide-table-border">
          {STATS.map((stat) => (
            <StatItem key={stat.label} {...stat} active={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}
