'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import type { Product, ProductVariant } from '@/types/database.types'

/**
 * Client purchase panel: pricing box + weight/size variant selector + add-to-cart
 * / buy-now (desktop inline + mobile sticky). Price, MRP and unit all follow the
 * selected variant; the cart line is keyed per variant so 5kg and 10kg are
 * separate lines.
 */
export default function ProductBuyPanel({ product }: { product: Product }) {
  const variants: ProductVariant[] = product.variants ?? []
  const hasVariants = variants.length > 0
  const [selIdx, setSelIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const active: ProductVariant | null = hasVariants ? variants[Math.min(selIdx, variants.length - 1)] : null

  const price = active?.price ?? product.price
  const mrp = active?.mrp ?? product.mrp
  const unit = active?.label ?? product.unit
  const discount = mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : null
  const outOfStock = product.stock_qty === 0

  // Box-sold products (PRD #1/#2): reuse the existing pack fields — no new schema.
  const soldByBox = product.pack_type === 'Box' && !!product.units_per_pack
  const unitsPerBox = product.units_per_pack ?? null
  // Clamp any typed quantity to available stock (never accept an invalid amount).
  const clampQty = (n: number) => {
    if (!Number.isFinite(n) || n < 1) return 1
    return product.stock_qty > 0 ? Math.min(Math.floor(n), product.stock_qty) : 1
  }

  const { tField } = useT()
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const showAuthPrompt = useAuthPromptStore((s) => s.show)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  const lineId = active ? `${product.id}::${active.label}` : product.id
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === lineId))

  const buildItem = () => ({
    id: lineId,
    product_id: product.id,
    variant: active?.label ?? null,
    name: product.name,
    price,
    mrp,
    unit,
    image: product.images?.[0] ?? null,
    slug: product.slug,
  })

  const requireAuth = () => {
    if (isLoaded && !isSignedIn) { showAuthPrompt(); return false }
    return true
  }
  // Add the typed quantity in one action (PRD #1) — respects the stock clamp.
  const handleAdd = () => {
    if (outOfStock || !requireAuth()) return
    addItem(buildItem())
    const n = clampQty(qty)
    if (n > 1) updateQuantity(lineId, n)
  }
  const handleBuyNow = () => {
    if (outOfStock || !requireAuth()) return
    if (!cartItem) {
      addItem(buildItem())
      const n = clampQty(qty)
      if (n > 1) updateQuantity(lineId, n)
    }
    router.push('/checkout')
  }

  // Shared add / stepper control.
  const AddControl = ({ full }: { full?: boolean }) =>
    cartItem ? (
      <div className={cn('flex items-center justify-between bg-primary text-white rounded-full h-12 px-1', full && 'flex-1')}>
        <button onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)} className="w-11 h-full flex items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition" aria-label="Remove one">
          <Minus size={16} strokeWidth={3} />
        </button>
        {/* Typed quantity — enter e.g. 100 boxes in one action instead of tapping +1 (PRD #1). */}
        <input
          type="number"
          min={1}
          max={product.stock_qty || undefined}
          value={cartItem.quantity}
          onChange={(e) => { const n = parseInt(e.target.value, 10); updateQuantity(cartItem.id, clampQty(Number.isNaN(n) ? 1 : n)) }}
          aria-label={soldByBox ? 'Number of boxes' : 'Quantity'}
          className="w-14 bg-transparent text-center font-black text-sm tracking-widest outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={() => updateQuantity(cartItem.id, clampQty(cartItem.quantity + 1))} className="w-11 h-full flex items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition" aria-label="Add one more">
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
    ) : (
      <button
        onClick={handleAdd}
        disabled={outOfStock}
        className={cn(
          'h-12 px-6 rounded-full border-2 border-primary text-primary font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          full && 'flex-1',
        )}
      >
        <ShoppingCart size={16} /> Add
      </button>
    )

  return (
    <>
      {/* ── Pricing box ── */}
      <div className="bg-gradient-to-br from-surface-container-low to-surface-container border border-table-border/70 rounded-2xl p-5 mb-5 relative overflow-hidden shadow-[0_2px_14px_rgba(38,23,12,0.06)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,#000_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50 mb-2">
            Price per {unit}
          </p>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-primary tracking-tight">₹{price}</span>
              {mrp && mrp > price && (
                <span className="text-base font-medium text-on-surface-variant/40 line-through">₹{mrp}</span>
              )}
            </div>
            {discount && (
              <div className="bg-primary text-white font-black text-sm px-3 py-1.5 rounded-xl flex-shrink-0">Save {discount}%</div>
            )}
          </div>

          {/* Units per box + per-box price — only for box-sold products, bilingual (PRD #2). */}
          {soldByBox && unitsPerBox && (
            <p className="mt-2 text-[12px] font-bold text-on-surface-variant/75">
              {tField(`${unitsPerBox} units per box`, `ବାକ୍ସ ପିଛା ${unitsPerBox} ୟୁନିଟ୍`)}
              {product.price_per_pack ? (
                <span className="text-primary">
                  {' · '}
                  {tField(`₹${product.price_per_pack}/box`, `₹${product.price_per_pack}/ବାକ୍ସ`)}
                </span>
              ) : null}
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-table-border">
            {outOfStock ? (
              <p className="text-[11px] font-black uppercase tracking-widest text-error flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error" /> Out of Stock
              </p>
            ) : (
              <p className="text-[11px] font-black uppercase tracking-widest text-success flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" /> In Stock
                {product.stock_qty <= 10 && <span className="text-error font-black ml-1">— only {product.stock_qty} left</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Variant selector (pack-size cards with discount badge) ── */}
      {hasVariants && (
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">Select pack size</p>
          <div className="flex flex-wrap gap-3">
            {variants.map((v, i) => {
              const isSel = i === selIdx
              const vDiscount = v.mrp && v.mrp > v.price ? Math.round((1 - v.price / v.mrp) * 100) : null
              return (
                <button
                  key={`${v.label}-${i}`}
                  onClick={() => setSelIdx(i)}
                  aria-pressed={isSel}
                  className={cn(
                    'relative flex flex-col items-center gap-1 min-w-[108px] px-4 pt-4 pb-3 rounded-2xl border-2 transition-all duration-200 active:scale-95',
                    isSel
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(28,19,10,0.06)]'
                      : 'border-table-border hover:border-primary/40',
                  )}
                >
                  {vDiscount && (
                    <span
                      className={cn(
                        'absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shadow-sm',
                        isSel ? 'bg-primary text-white' : 'bg-secondary text-on-secondary',
                      )}
                    >
                      {vDiscount}% OFF
                    </span>
                  )}

                  {/* Selected tick */}
                  {isSel && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-black">✓</span>
                  )}

                  <span className={cn('font-black text-sm', isSel ? 'text-primary' : 'text-on-surface')}>{v.label}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn('font-black text-base', isSel ? 'text-primary' : 'text-on-surface')}>₹{v.price}</span>
                    {v.mrp && v.mrp > v.price && (
                      <span className="text-xs text-on-surface-variant/40 line-through">₹{v.mrp}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quantity / Boxes selector — type the number directly (PRD #1) ── */}
      {!outOfStock && (
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-2">
            {soldByBox ? tField('Boxes required', 'ଆବଶ୍ୟକ ବାକ୍ସ') : tField('Quantity', 'ପରିମାଣ')}
          </p>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center h-12 rounded-full border-2 border-table-border overflow-hidden">
              <button
                type="button"
                onClick={() => (cartItem ? updateQuantity(lineId, cartItem.quantity - 1) : setQty((q) => Math.max(1, q - 1)))}
                className="w-12 h-full flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition"
                aria-label="Decrease"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <input
                type="number"
                min={1}
                max={product.stock_qty || undefined}
                value={cartItem ? cartItem.quantity : qty}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10)
                  const v = clampQty(Number.isNaN(parsed) ? 1 : parsed)
                  if (cartItem) updateQuantity(lineId, v)
                  else setQty(v)
                }}
                aria-label={soldByBox ? 'Number of boxes' : 'Quantity'}
                className="w-16 h-full bg-transparent text-center font-black text-base text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => (cartItem ? updateQuantity(lineId, clampQty(cartItem.quantity + 1)) : setQty((q) => clampQty(q + 1)))}
                className="w-12 h-full flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition"
                aria-label="Increase"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            {soldByBox && unitsPerBox && (
              <span className="text-xs font-bold text-on-surface-variant/60">
                {tField(`= ${(cartItem?.quantity ?? qty) * unitsPerBox} units`, `= ${(cartItem?.quantity ?? qty) * unitsPerBox} ୟୁନିଟ୍`)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Badges ── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {!hasVariants && (
          <span className="px-3 py-1.5 border border-table-border rounded-xl font-black text-[11px] uppercase tracking-wider text-on-surface-variant">
            {product.unit}{product.unit_or && ` / ${product.unit_or}`}
          </span>
        )}
        {product.is_featured && (
          <span className="px-3 py-1.5 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-wider">Featured</span>
        )}
        {product.units_per_pack && product.pack_type && (
          <span className="px-3 py-1.5 border border-table-border rounded-xl font-black text-[11px] uppercase tracking-wider text-on-surface-variant">
            {product.pack_type} of {product.units_per_pack} {product.unit_type ?? 'Units'}
            {product.price_per_pack && ` — ₹${product.price_per_pack}/pack`}
          </span>
        )}
      </div>

      {/* ── Desktop actions ── */}
      <div className="hidden lg:flex gap-3">
        <AddControl full />
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 h-12 px-6 rounded-full bg-primary text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buy Now
        </button>
      </div>

      {/* ── Mobile sticky bar ── */}
      <div
        className="fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3 z-40 lg:hidden border-t border-outline-variant/30"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">{unit}</span>
          <span className="text-lg font-black text-primary">₹{price}</span>
        </div>
        <div className="flex-1 flex gap-2">
          <AddControl full />
          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="flex-1 h-12 rounded-full bg-primary text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform shadow-sm disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </>
  )
}
