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
        'w-40 md:w-48 flex-shrink-0 bg-background border-2 border-primary flex flex-col group relative',
        'hover:-translate-y-1 hover:translate-x-1 hover:shadow-[-6px_6px_0px_#000000] transition-all duration-300',
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="block flex-1 relative z-10">
        {/* ── Square image ── */}
        <div className="relative aspect-square w-full bg-surface-container-low overflow-hidden border-b-2 border-primary p-4">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 160px, 192px"
              className="object-contain p-4 mix-blend-multiply grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-on-surface-variant/30" size={32} />
            </div>
          )}

          {/* Discount badge */}
          {discount && !outOfStock && (
            <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 shadow-sm uppercase tracking-widest">
              -{discount}%
            </span>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-white px-3 py-1.5 border-2 border-primary shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-1 bg-background group-hover:bg-primary transition-colors duration-300">
          {/* Product name — bold weight, 13px, 2-line clamp */}
          <h4 className="text-[13px] md:text-sm font-black text-primary group-hover:text-white leading-snug line-clamp-2 min-h-[38px] uppercase tracking-wider">
            {name}
          </h4>

          {/* Unit — 11px muted */}
          <p className="text-[11px] font-bold text-on-surface-variant group-hover:text-white/70 tracking-widest">{unit}</p>

          {/* Price row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-base font-black text-primary group-hover:text-white">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[11px] text-on-surface-variant group-hover:text-white/50 line-through font-bold">₹{product.mrp}</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Add to cart — always at bottom ── */}
      <div className="p-3 pt-0 bg-background group-hover:bg-primary transition-colors duration-300 mt-auto border-t-2 border-transparent group-hover:border-white/10">
        <AddToCartButton
          product={product}
          variant="full"
          disabled={outOfStock}
        />
      </div>
    </div>
  )
}
