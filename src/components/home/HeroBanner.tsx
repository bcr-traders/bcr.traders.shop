'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Banner } from '@/types/database.types'

const INTERVAL_MS = 5000
const DEFAULT_BG = '#1C130A'

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

interface Props {
  banners: Banner[]
}

export default function HeroBanner({ banners }: Props) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const touchStartX = useRef(0)
  const { tField } = useT()

  const go = useCallback(
    (newIndex: number, direction: number) => {
      setDir(direction)
      setIndex((newIndex + banners.length) % banners.length)
    },
    [banners.length]
  )

  const next = useCallback(() => go(index + 1, 1), [go, index])
  const prev = useCallback(() => go(index - 1, -1), [go, index])

  useEffect(() => {
    if (banners.length <= 1) return
    const id = setInterval(next, INTERVAL_MS)
    return () => clearInterval(id)
  }, [next, banners.length])

  if (!banners.length) {
    return (
      <section className="px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div
          className="relative w-full rounded-3xl overflow-hidden min-h-[200px] sm:min-h-[260px] md:min-h-[320px] flex items-center px-6 sm:px-10 md:px-16"
          style={{ backgroundColor: DEFAULT_BG }}
        >
          <div className="relative z-10 py-8 md:py-0 max-w-xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.05] tracking-tight">
              Stock up on wholesale essentials
            </h2>
            <p className="text-sm md:text-base text-white/85 font-medium mt-3 leading-relaxed max-w-md">
              Bulk oil, pulses, atta, spices, sugar &amp; water — direct from Odisha&apos;s trusted distributor.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center mt-6 px-6 py-3 rounded-xl bg-secondary text-on-secondary font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-lg"
            >
              Shop Now
            </Link>
          </div>
          <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-secondary/10 pointer-events-none" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-32 h-32 rounded-full bg-secondary/5 pointer-events-none hidden sm:block" />
        </div>
      </section>
    )
  }

  const banner = banners[index]
  const title = banner.title ? tField(banner.title, banner.title_or) : null
  const subtitle = banner.subtitle ? tField(banner.subtitle, banner.subtitle_or) : null
  const ctaText = banner.cta_text ? tField(banner.cta_text, banner.cta_text_or) : null
  const bg = banner.background_color || DEFAULT_BG

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full">
      <div
        className="relative w-full rounded-3xl overflow-hidden select-none min-h-[220px] sm:min-h-[280px] md:min-h-[360px]"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX
          if (diff > 50) next()
          else if (diff < -50) prev()
        }}
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center"
            style={{ backgroundColor: bg }}
          >
            <div className="relative z-10 flex flex-col justify-center px-6 sm:px-10 md:px-16 py-8 md:py-0 max-w-xl">
              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.05] tracking-tight"
                  style={{ color: banner.text_color }}
                >
                  {title}
                </motion.h2>
              )}

              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-sm md:text-base font-medium mt-3 leading-relaxed max-w-md opacity-85"
                  style={{ color: banner.text_color }}
                >
                  {subtitle}
                </motion.p>
              )}

              {ctaText && banner.link_url && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={banner.link_url}
                    className="inline-flex items-center mt-6 px-6 py-3 rounded-xl bg-white text-primary font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-lg"
                  >
                    {ctaText}
                  </Link>
                </motion.div>
              )}
            </div>

            {banner.image_url && (
              <div className="absolute inset-y-0 right-0 w-1/2 hidden sm:block">
                <Image
                  src={banner.image_url}
                  alt={title ?? 'Banner'}
                  fill
                  priority={index === 0}
                  sizes="50vw"
                  className="object-contain object-right"
                />
              </div>
            )}

            <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-300 active:scale-95"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <button
              onClick={next}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-300 active:scale-95"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    i === index ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
