'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Category } from '@/types/database.types'

interface Props {
  categories: Category[]
}

export default function CategoryGrid({ categories }: Props) {
  const { t, tField, language } = useT()
  if (!categories.length) return null

  return (
    <section className="px-4">
      <div className="flex items-end justify-between mb-4">
        <h3 className="text-base font-bold text-primary">{t('category.sectionTitle')}</h3>
        <Link href="/search" className="text-sm text-primary underline underline-offset-2">
          {t('product.viewAll')}
        </Link>
      </div>

      {/* Bento 2-col grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {categories.slice(0, 8).map((cat) => {
          const name = tField(cat.name, cat.name_or)
          return (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <div className="relative h-28 rounded-xl overflow-hidden bg-surface-container-high border border-table-border group cursor-pointer">
                {/* Background image */}
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/30" />
                )}

                {/* Bottom gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/20 to-transparent" />

                {/* Text */}
                <div className="absolute bottom-3 left-3 text-on-primary">
                  {language === 'od' && cat.name_or ? (
                    <span className="font-odia text-base block leading-tight">{cat.name_or}</span>
                  ) : null}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      language === 'od' && cat.name_or ? 'opacity-75' : 'text-sm font-semibold tracking-normal opacity-100'
                    }`}
                  >
                    {cat.name}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}

        {/* Shop All tile */}
        <Link href="/search">
          <div className="relative h-28 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low flex flex-col items-center justify-center gap-2 group hover:border-primary hover:bg-primary-fixed transition-colors">
            <LayoutGrid size={24} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold text-on-surface-variant group-hover:text-primary uppercase tracking-wide transition-colors">
              {t('category.shopAll')}
            </span>
          </div>
        </Link>
      </div>
    </section>
  )
}
