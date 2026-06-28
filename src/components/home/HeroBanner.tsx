'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Banner } from '@/types/database.types'

const INTERVAL_MS = 4000

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
      <section className="px-4">
        <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-surface-container-high border border-table-border flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-container to-primary/60" />
          <div className="relative z-10 text-center px-6">
            <span className="text-xs font-bold uppercase tracking-wider bg-primary-fixed text-on-primary-fixed-variant px-2 py-1 rounded mb-3 inline-block">
              Premium Quality
            </span>
            <h2 className="text-2xl font-bold text-on-primary">Bulk Deals Available</h2>
            <p className="text-on-primary/80 text-sm mt-1">
              Secure supply for your retail business
            </p>
          </div>
        </div>
      </section>
    )
  }

  const banner = banners[index]
  const title = banner.title ? tField(banner.title, banner.title_or) : null
  const subtitle = banner.subtitle ? tField(banner.subtitle, banner.subtitle_or) : null
  const ctaText = banner.cta_text ? tField(banner.cta_text, banner.cta_text_or) : null

  return (
    <section className="px-4">
      <div
        className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden select-none border border-table-border shadow-sm"
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
            transition={{ type: 'tween', duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {banner.image_url ? (
              <Image
                src={banner.image_url}
                alt={title ?? 'Banner'}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center mix-blend-multiply opacity-80"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-primary-container to-primary/60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="inline-block text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-on-primary-fixed-variant px-2 py-1 rounded w-max mb-2"
              >
                Premium Quality
              </motion.span>

              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                  className="text-xl md:text-3xl font-bold text-primary max-w-xs leading-tight"
                >
                  {title}
                </motion.h2>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.35 }}
                  className="text-sm text-on-surface-variant mt-1 max-w-[70%] leading-snug"
                >
                  {subtitle}
                </motion.p>
              )}
              {ctaText && banner.link_url && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34, duration: 0.35 }}
                  className="mt-4"
                >
                  <Link
                    href={banner.link_url}
                    className="inline-block px-5 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow"
                  >
                    {ctaText}
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface-card/70 hover:bg-surface-card text-primary flex items-center justify-center transition-colors shadow"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface-card/70 hover:bg-surface-card text-primary flex items-center justify-center transition-colors shadow"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-5 bg-primary' : 'w-1.5 bg-primary/30'
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
