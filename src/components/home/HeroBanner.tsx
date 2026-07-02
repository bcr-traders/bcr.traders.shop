'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
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
      <section className="px-4 md:px-8 max-w-7xl mx-auto w-full py-16 md:py-28">
        <div className="flex flex-col items-start w-full">
          {/* Subtle Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 md:mb-16"
          >
            <span className="block text-[9px] font-black tracking-[0.2em] text-on-surface-variant uppercase mb-2">
              LATEST UPDATE
            </span>
            <span className="block text-sm font-black tracking-tight text-primary">
              Premium Wholesale Supply Launched
            </span>
          </motion.div>
          
          {/* Massive Typography */}
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-8xl md:text-[9rem] lg:text-[11rem] font-black text-primary leading-[0.8] tracking-tighter uppercase mb-8"
          >
            BULK<br />DEALS
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-primary text-xs md:text-sm font-bold tracking-tight max-w-md mb-12 leading-relaxed"
          >
            Secure high-volume supply for your retail business instantly. Direct from Odisha's trusted distributor.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link
              href="/search"
              className="group flex items-center gap-4 px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-primary text-white font-black text-[10px] md:text-xs uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 shadow-2xl shadow-black/20"
            >
              EXPLORE CATALOG
              <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center group-hover:-rotate-45 transition-transform duration-300">
                <ArrowRight size={14} className="text-primary" strokeWidth={3} />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>
    )
  }

  const banner = banners[index]
  const title = banner.title ? tField(banner.title, banner.title_or) : null
  const subtitle = banner.subtitle ? tField(banner.subtitle, banner.subtitle_or) : null
  const ctaText = banner.cta_text ? tField(banner.cta_text, banner.cta_text_or) : null

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full py-8 md:py-16">
      <div
        className="relative w-full h-[60vh] md:h-[75vh] min-h-[400px] overflow-hidden select-none bg-surface-container"
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
            transition={{ type: 'tween', duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-surface-variant"
          >
            {banner.image_url && (
              <Image
                src={banner.image_url}
                alt={title ?? 'Banner'}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center mix-blend-multiply opacity-50 grayscale transition-opacity duration-1000"
              />
            )}
            
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 lg:px-24 z-10">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="block text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4"
              >
                LATEST UPDATE
              </motion.span>

              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-5xl sm:text-7xl md:text-[7rem] lg:text-[9rem] font-black text-primary leading-[0.85] tracking-tighter uppercase mb-6 max-w-4xl"
                >
                  {title}
                </motion.h2>
              )}
              
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-primary/80 text-xs md:text-sm font-bold tracking-tight mt-2 max-w-md leading-relaxed"
                >
                  {subtitle}
                </motion.p>
              )}
              
              {ctaText && banner.link_url && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-10"
                >
                  <Link
                    href={banner.link_url}
                    className="group inline-flex items-center gap-4 px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-primary text-white font-black text-[10px] md:text-xs uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 shadow-xl shadow-black/10"
                  >
                    {ctaText}
                    <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center group-hover:-rotate-45 transition-transform duration-300">
                      <ArrowRight size={14} className="text-primary" strokeWidth={3} />
                    </span>
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
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-primary/20 bg-transparent hover:bg-primary hover:text-white text-primary flex items-center justify-center transition-all duration-300 active:scale-95"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={next}
              aria-label="Next"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-primary/20 bg-transparent hover:bg-primary hover:text-white text-primary flex items-center justify-center transition-all duration-300 active:scale-95"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-[2px] transition-all duration-500 ${
                    i === index ? 'w-12 bg-primary' : 'w-6 bg-primary/20 hover:bg-primary/50'
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
