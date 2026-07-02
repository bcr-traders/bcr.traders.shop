'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import AddToCartButton from './AddToCartButton'
import type { Product } from '@/types/database.types'

interface ProductCardProps {
  product: Product
  className?: string
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { tField } = useT()
  const name = tField(product.name, product.name_or)
  const unit = tField(product.unit, product.unit_or)

  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : null

  const outOfStock = product.stock_quantity === 0

  return (
    <div
      className={cn(
        'w-40 md:w-44 flex-shrink-0 bg-gradient-to-b from-surface-card to-surface-container-low/30 border border-table-border/60 hover:border-primary/30 rounded-2xl overflow-hidden flex flex-col group relative',
        'shadow-[0_4px_12px_rgba(38,23,12,0.03)] hover:shadow-[0_16px_40px_rgba(38,23,12,0.12)] hover:-translate-y-1.5 transition-all duration-500',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay z-20" />
      <Link href={`/product/${product.slug}`} className="block flex-1 relative z-10">
        {/* ── Square image ── */}
        <div className="relative aspect-square w-full bg-surface-container-low/50 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 160px, 176px"
              className="object-cover p-3 mix-blend-multiply group-hover:scale-103 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-on-surface-variant/30" size={32} />
            </div>
          )}

          {/* Discount badge */}
          {discount && !outOfStock && (
            <span className="absolute top-2 left-2 bg-gradient-to-r from-success to-success/90 text-on-success text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs">
              -{discount}%
            </span>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-surface-card/65 backdrop-blur-2xs flex items-center justify-center">
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-card px-2.5 py-1 rounded-full border border-outline-variant/60 shadow-3xs">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3 pt-3 pb-1.5 flex flex-col gap-0.5">
          {/* Product name — bold weight, 13px, 2-line clamp */}
          <h4 className="text-[13px] font-bold text-primary leading-snug line-clamp-2 min-h-[36px]">
            {name}
          </h4>

          {/* Unit — 11px muted */}
          <p className="text-[11px] font-medium text-secondary/60">{unit}</p>

          {/* Price row: ₹price · MRP strikethrough · discount% badge */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="text-[14px] font-black text-primary">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[11px] text-secondary/45 line-through">₹{product.mrp}</span>
            )}
            {discount && (
              <span className="text-[9px] font-black text-success uppercase tracking-wider">
                {discount}% off
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Add to cart — always at bottom ── */}
      <div className="px-3 pb-3 mt-auto pt-1">
        <AddToCartButton
          product={product}
          variant="full"
          disabled={outOfStock}
        />
      </div>
    </div>
  )
}
