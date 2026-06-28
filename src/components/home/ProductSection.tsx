'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import ProductCard from '@/components/product/ProductCard'
import type { Product } from '@/types/database.types'

interface Props {
  title: string
  titleOr?: string | null
  products: Product[]
  viewAllHref?: string
}

export default function ProductSection({ title, titleOr, products, viewAllHref }: Props) {
  const { t, tField } = useT()
  if (!products.length) return null

  const displayTitle = tField(title, titleOr)

  return (
    <section className="pl-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pr-4">
        <h3 className="text-base font-bold text-primary">{displayTitle}</h3>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm text-primary underline underline-offset-2 flex items-center gap-1"
          >
            {t('product.viewAll')}
          </Link>
        )}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 pr-4 md:hidden">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Desktop: up to 5 + "View All" tile */}
      <div className="hidden md:flex gap-4 overflow-hidden pr-4">
        {products.slice(0, 5).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {products.length > 5 && viewAllHref && (
          <Link
            href={viewAllHref}
            className="w-44 flex-shrink-0 rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            <ArrowRight size={22} />
            <span className="text-sm font-semibold">{t('product.viewAll')}</span>
          </Link>
        )}
      </div>
    </section>
  )
}
