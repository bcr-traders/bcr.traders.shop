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

  const tiles = categories.slice(0, 7)

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full py-12 md:py-20">
      <div className="flex flex-col mb-12">
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-primary">
          {t('category.sectionTitle')}
        </h3>
        <Link href="/search" className="mt-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-primary hover:text-primary/70 underline underline-offset-4 transition-colors w-max">
          {t('product.viewAll')}
        </Link>
      </div>

      <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {tiles.map((cat, i) => {
          const name = tField(cat.name, cat.name_or)
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/category/${cat.slug}`} className="block h-full">
                <div className="relative h-48 md:h-56 bg-surface-container border-2 border-primary group hover:-translate-y-1 hover:translate-x-1 hover:shadow-[-8px_8px_0px_#000000] transition-all duration-300 flex flex-col overflow-hidden">
                  <div className="relative flex-1 w-full overflow-hidden border-b-2 border-primary">
                    {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={name}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-surface-variant" />
                    )}
                  </div>
                  
                  <div className="p-4 md:p-5 bg-background group-hover:bg-primary transition-colors duration-300 flex items-center justify-between">
                    <div className="flex flex-col overflow-hidden">
                      {language === 'od' && cat.name_or ? (
                         <span className="font-odia text-xs text-on-surface-variant group-hover:text-white/70 block leading-tight mb-1 truncate">{cat.name_or}</span>
                      ) : null}
                      <span className="text-sm md:text-base font-black uppercase tracking-wider text-primary group-hover:text-white truncate">
                        {cat.name}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}

        {/* Shop All tile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: tiles.length * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/search" className="block h-full">
            <div className="relative h-48 md:h-56 border-2 border-dashed border-primary hover:border-solid hover:border-primary bg-background hover:bg-primary flex flex-col items-center justify-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:translate-x-1 hover:shadow-[-8px_8px_0px_#000000]">
              <div className="w-12 h-12 rounded-full border-2 border-primary bg-transparent group-hover:bg-white flex items-center justify-center transition-colors duration-300">
                <LayoutGrid size={20} className="text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black tracking-widest uppercase text-primary group-hover:text-white transition-colors">
                {t('category.shopAll')}
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
