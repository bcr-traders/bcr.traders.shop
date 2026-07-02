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
      <section className="px-4 max-w-7xl mx-auto w-full">
        <div className="relative w-full h-56 md:h-72 rounded-3xl overflow-hidden bg-surface-container-low border border-white/20 flex items-center justify-center shadow-lg group">
          {/* Animated Ambient Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-card via-surface-container-low to-primary-container/40 overflow-hidden">
            <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[150%] bg-gradient-to-r from-primary/20 to-secondary/20 blur-[100px] rounded-full group-hover:rotate-12 transition-transform duration-[3s] pointer-events-none" />
            <div className="absolute -bottom-[40%] -right-[10%] w-[70%] h-[150%] bg-gradient-to-l from-primary/10 to-primary-container/30 blur-[120px] rounded-full group-hover:-rotate-12 transition-transform duration-[3s] pointer-events-none" />
          </div>
          
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 text-center px-6 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-sm mb-5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mt-0.5">
                Premium Quality
              </span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/60 leading-tight mb-2 tracking-tight drop-shadow-sm"
            >
              Bulk Deals Available
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-on-surface-variant/80 text-sm md:text-base font-semibold max-w-sm mx-auto"
            >
              Secure high-volume supply for your retail business instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                href="/search"
                className="mt-6 inline-block px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-black text-xs uppercase tracking-widest hover:to-primary hover:shadow-[0_8px_30px_rgba(38,23,12,0.25)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group/btn shadow-md"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out" />
                Explore Catalog
              </Link>
            </motion.div>
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
    <section className="px-4 max-w-7xl mx-auto w-full">
      <div
        className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden select-none border border-table-border/60 shadow-[0_3px_8px_rgba(38,23,12,0.02)]"
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
              <div className="absolute inset-0 bg-gradient-to-r from-primary-container to-primary/80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/45 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10 z-10">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="inline-block text-[9px] font-black uppercase tracking-wider bg-primary-fixed text-on-primary-fixed-variant px-2.5 py-1 rounded-full w-max mb-2.5 shadow-3xs"
              >
                Premium Quality
              </motion.span>

              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                  className="text-lg md:text-3xl font-black text-primary max-w-xs md:max-w-md leading-tight"
                >
                  {title}
                </motion.h2>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.35 }}
                  className="text-xs md:text-sm text-secondary/80 font-medium mt-1 max-w-[70%] leading-snug"
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
                    className="inline-block px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary/95 transition-all shadow-3xs active:scale-95 hover:shadow-2xs"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/75 backdrop-blur-xs hover:bg-white text-primary flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/75 backdrop-blur-xs hover:bg-white text-primary flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95"
            >
              <ChevronRight size={16} />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-5 bg-primary' : 'w-1.5 bg-primary/25'
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
