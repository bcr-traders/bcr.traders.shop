'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useT } from '@/hooks/useT'
import type { Category } from '@/types/database.types'

interface Props {
  categories: Category[]
}

export default function CategoryGrid({ categories }: Props) {
  const { t, tField, language } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  if (!categories.length) return null

  const tiles = categories.slice(0, 8)

  return (
    <section className="px-4 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-primary">{t('category.sectionTitle')}</h3>
        <Link href="/search" className="text-xs font-bold text-primary hover:text-secondary underline underline-offset-3 transition-colors">
          {t('product.viewAll')}
        </Link>
      </div>

      <div ref={ref} className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4 px-1 py-1">
        {tiles.map((cat, i) => {
          const name = tField(cat.name, cat.name_or)
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
            >
              <Link href={`/category/${cat.slug}`}>
                <div className="relative h-32 rounded-3xl overflow-hidden bg-surface-container-high border border-white/10 group cursor-pointer shadow-[0_4px_12px_rgba(38,23,12,0.03)] hover:shadow-[0_16px_32px_rgba(38,23,12,0.15)] hover:-translate-y-1.5 transition-all duration-500">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={name}
                      fill
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-container to-primary/40" />
                  )}

                  {/* Gradient Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply" />
                  
                  {/* Subtle Glass Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                  <div className="absolute bottom-4 left-4 text-on-primary z-10">
                    {language === 'od' && cat.name_or ? (
                      <span className="font-odia text-base block leading-tight mb-0.5">{cat.name_or}</span>
                    ) : null}
                    <span
                      className={`text-[11px] font-black uppercase tracking-widest leading-none block drop-shadow-sm ${
                        language === 'od' && cat.name_or
                          ? 'opacity-85'
                          : 'text-sm font-extrabold tracking-tight opacity-100'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}

        {/* Shop All tile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: tiles.length * 0.05, duration: 0.35, ease: 'easeOut' }}
        >
          <Link href="/search">
            <div className="relative h-32 rounded-3xl border-2 border-dashed border-outline-variant/60 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-card flex flex-col items-center justify-center gap-3 group transition-all duration-500 shadow-none hover:shadow-[0_12px_32px_rgba(38,23,12,0.08)] hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-500 ring-4 ring-transparent group-hover:ring-primary/5">
                <LayoutGrid size={22} className="text-primary transition-transform duration-500 group-hover:scale-110" />
              </div>
              <span className="text-sm font-black tracking-wide text-on-surface-variant group-hover:text-primary transition-colors">
                {t('category.shopAll')}
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
