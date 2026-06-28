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
        'w-40 md:w-44 flex-shrink-0 bg-surface-card border border-table-border rounded-[var(--radius-card)] overflow-hidden flex flex-col group',
        'shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="block flex-1">
        {/* ── Square image ── */}
        <div className="relative aspect-square w-full bg-surface-container-low overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 160px, 176px"
              className="object-cover p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-on-surface-variant/30" size={36} />
            </div>
          )}

          {/* Discount badge */}
          {discount && !outOfStock && (
            <span className="absolute top-2 left-2 bg-success text-on-success text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-surface-card/70 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-card px-2 py-0.5 rounded-full border border-outline-variant">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3 pt-3 pb-2">
          {/* Product name — 600 weight, 14px, 2-line clamp */}
          <h4 className="text-[14px] font-semibold text-on-surface leading-snug line-clamp-2 mb-0.5">
            {name}
          </h4>

          {/* Unit — 12px muted */}
          <p className="text-[12px] text-on-surface-variant mb-2">{unit}</p>

          {/* Price row: ₹price · MRP strikethrough · discount% badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-primary">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[11px] text-on-surface-variant line-through">₹{product.mrp}</span>
            )}
            {discount && (
              <span className="text-[10px] font-bold text-success">
                {discount}% off
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Add to cart — always at bottom ── */}
      <div className="px-3 pb-3 mt-auto">
        <AddToCartButton
          product={product}
          variant="full"
          disabled={outOfStock}
        />
      </div>
    </div>
  )
}
