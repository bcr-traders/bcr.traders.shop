'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  MapPin,
  Package,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuth } from '@clerk/nextjs'
import type { CartItem } from '@/types/database.types'

// ── Coupon shape from /api/coupons ────────────────────────────────────────────
interface CouponData {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_amount: number | null
}

// ── CartItemRow ───────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem
  onQtyChange: (qty: number) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-table-border shadow-sm flex gap-4 p-4 items-center">
      {/* Image */}
      <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-surface-container-low border border-table-border flex-shrink-0 overflow-hidden relative">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover mix-blend-multiply"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={28} className="text-outline" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow flex flex-col gap-2 min-w-0">
        <div>
          <h4 className="text-sm font-bold text-on-surface leading-snug line-clamp-2">
            {item.name}
          </h4>
          <span className="inline-block mt-1 text-[11px] font-medium text-on-surface-variant bg-surface-variant rounded px-2 py-0.5">
            {item.unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {/* Price */}
          <div>
            <span className="text-base font-bold text-on-surface">₹{item.price.toLocaleString('en-IN')}</span>
            {item.mrp && item.mrp > item.price && (
              <span className="text-xs text-outline line-through ml-1.5">₹{item.mrp}</span>
            )}
          </div>

          {/* Qty stepper */}
          <div className="flex items-center h-9 bg-primary text-on-primary rounded-lg overflow-hidden shadow-sm border border-primary/20">
            <button
              onClick={() => onQtyChange(item.quantity - 1)}
              className="w-9 h-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
              aria-label="Decrease"
            >
              <Minus size={15} />
            </button>
            <span className="w-7 text-center text-sm font-bold select-none">
              {item.quantity}
            </span>
            <button
              onClick={() => onQtyChange(item.quantity + 1)}
              className="w-9 h-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
              aria-label="Increase"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 rounded-lg text-outline hover:bg-error-container hover:text-error transition-colors"
        aria-label="Remove item"
      >
        <Trash2 size={17} />
      </button>
    </div>
  )
}

// ── CouponInputSection ────────────────────────────────────────────────────────
function CouponInputSection({
  couponInput,
  setCouponInput,
  appliedCoupon,
  onApply,
  onRemove,
  error,
  loading,
}: {
  couponInput: string
  setCouponInput: (v: string) => void
  appliedCoupon: CouponData | null
  onApply: () => void
  onRemove: () => void
  error: string
  loading: boolean
}) {
  if (appliedCoupon) {
    return (
      <div className="bg-secondary-container rounded-xl border border-table-border p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-on-secondary-container/10 flex items-center justify-center flex-shrink-0">
            <BadgeCheck size={18} className="text-on-secondary-container" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-secondary-container">
              {appliedCoupon.code} applied
            </p>
            {appliedCoupon.description && (
              <p className="text-xs text-on-secondary-container/70 mt-0.5">
                {appliedCoupon.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-xs font-semibold text-on-secondary-container border border-on-secondary-container/30 rounded-full px-3 py-1 hover:bg-on-secondary-container/10 transition-colors flex items-center gap-1"
        >
          <X size={12} /> Remove
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface-card rounded-xl border border-table-border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-primary" />
        <span className="text-sm font-bold text-on-surface">Apply Coupon</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          placeholder="Enter coupon code"
          className="flex-1 border border-table-border rounded-xl px-4 py-2.5 text-sm bg-surface-container-low placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-medium tracking-widest uppercase"
        />
        <button
          onClick={onApply}
          disabled={!couponInput.trim() || loading}
          className="px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-error mt-2 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  )
}

// ── OrderSummaryCard ──────────────────────────────────────────────────────────
function OrderSummaryCard({
  subtotal,
  discount,
  deliveryFee,
  total,
  totalQty,
  itemCount,
  couponCode,
}: {
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  totalQty: number
  itemCount: number
  couponCode?: string
}) {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <section className="bg-surface-card rounded-xl border border-table-border shadow-sm p-4">
      <h3 className="font-bold text-on-surface text-base mb-4">Order Summary</h3>

      <div className="flex flex-col gap-3 text-sm text-on-surface-variant">
        <div className="flex justify-between items-center">
          <span>
            Item Total ({itemCount} {itemCount === 1 ? 'item' : 'items'}, {totalQty} qty)
          </span>
          <span className="text-on-surface font-semibold">{fmt(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span>
              Coupon {couponCode ? `(${couponCode})` : 'Discount'}
            </span>
            <span className="text-primary font-bold">-{fmt(discount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pb-3 border-b border-table-border">
          <span>Delivery Charge</span>
          <div className="flex items-center gap-2">
            {deliveryFee === 0 ? (
              <>
                <span className="line-through text-outline text-xs">₹50.00</span>
                <span className="text-primary font-bold">FREE</span>
              </>
            ) : (
              <span className="text-on-surface font-semibold">{fmt(deliveryFee)}</span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-end pt-1">
          <span className="font-bold text-on-surface text-base">Grand Total</span>
          <span className="font-bold text-on-surface text-xl">{fmt(total)}</span>
        </div>
      </div>

      {/* COD badge */}
      <div className="mt-4 flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2">
        <span className="text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">COD</span>
        <span className="text-xs text-on-surface-variant">Cash on Delivery available</span>
      </div>
    </section>
  )
}

// ── Empty Cart State ──────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-5">
        <ShoppingBag size={48} className="text-outline" strokeWidth={1.2} />
      </div>
      <h2 className="text-xl font-bold text-primary mb-2">Your cart is empty</h2>
      <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
        Add products from the catalogue to start your bulk order
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:opacity-90 transition-opacity shadow"
      >
        Browse Products <ArrowRight size={16} />
      </Link>
    </div>
  )
}

// ── Main CartPage ─────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCartStore()
  const { isSignedIn } = useAuth()
  const router = useRouter()

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Calculations
  const subtotal = totalPrice()
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.round((subtotal * appliedCoupon.discount_value) / 100)
      : appliedCoupon.discount_value
    : 0
  const FREE_DELIVERY_MIN = 1000
  const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : 50
  const total = Math.max(0, subtotal - discount) + deliveryFee
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  // Abandoned cart debounced sync
  const syncRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!isSignedIn || items.length === 0) return
    clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      fetch('/api/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {})
    }, 2000)
    return () => clearTimeout(syncRef.current)
  }, [items, isSignedIn])

  const handleApplyCoupon = useCallback(async () => {
    const code = couponInput.trim()
    if (!code) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch('/api/coupons')
      if (!res.ok) throw new Error('fetch failed')
      const data: CouponData[] = await res.json()
      const found = data.find((c) => c.code.toUpperCase() === code.toUpperCase())
      if (!found) {
        setCouponError('Invalid coupon code')
      } else if (found.min_order_amount && subtotal < found.min_order_amount) {
        setCouponError(`Min. order ₹${found.min_order_amount} required for this coupon`)
      } else {
        setAppliedCoupon(found)
        setCouponInput('')
      }
    } catch {
      setCouponError('Could not validate coupon. Try again.')
    } finally {
      setCouponLoading(false)
    }
  }, [couponInput, subtotal])

  if (items.length === 0) return <EmptyCart />

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-36 lg:pb-8 lg:flex lg:gap-6">
      {/* ── LEFT column ── */}
      <div className="lg:flex-1 flex flex-col gap-4">
        {/* Free delivery notification */}
        {deliveryFee === 0 && (
          <div className="bg-secondary-container rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
              <Truck size={16} />
            </div>
            <p className="text-sm text-on-secondary-container">
              <span className="font-bold">Free Delivery</span> unlocked! You qualify for free delivery on this order.
            </p>
          </div>
        )}
        {deliveryFee > 0 && (
          <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3 border border-table-border text-sm text-on-surface-variant">
            <Truck size={16} className="text-primary flex-shrink-0" />
            <span>
              Add <span className="font-bold text-primary">₹{(FREE_DELIVERY_MIN - subtotal).toLocaleString('en-IN')}</span> more for Free Delivery
            </span>
          </div>
        )}

        {/* Delivery address */}
        <section className="bg-surface-card rounded-xl border border-table-border shadow-sm p-4 flex items-start justify-between gap-4">
          <div className="flex gap-3 items-start">
            <MapPin size={20} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-on-surface text-sm">Delivering to Main Warehouse</h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Malgodown, Cuttack, Odisha 753003
              </p>
            </div>
          </div>
          <button className="text-xs font-semibold text-primary border border-table-border rounded-full px-3 py-1 hover:bg-surface-container-low transition-colors flex-shrink-0">
            Change
          </button>
        </section>

        {/* Items list */}
        <section>
          <h3 className="font-bold text-on-surface text-base mb-3">
            Review Items ({items.length})
          </h3>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQtyChange={(qty) => updateQuantity(item.id, qty)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        </section>

        {/* Coupon */}
        <CouponInputSection
          couponInput={couponInput}
          setCouponInput={setCouponInput}
          appliedCoupon={appliedCoupon}
          onApply={handleApplyCoupon}
          onRemove={() => { setAppliedCoupon(null); setCouponError('') }}
          error={couponError}
          loading={couponLoading}
        />
      </div>

      {/* ── RIGHT column ── */}
      <div className="lg:w-72 mt-4 lg:mt-0">
        <div className="lg:sticky lg:top-20 flex flex-col gap-4">
          <OrderSummaryCard
            subtotal={subtotal}
            discount={discount}
            deliveryFee={deliveryFee}
            total={total}
            totalQty={totalQty}
            itemCount={items.length}
            couponCode={appliedCoupon?.code}
          />

          {/* Desktop checkout CTA */}
          <button
            onClick={() => router.push('/checkout')}
            className="hidden lg:flex w-full bg-primary text-on-primary font-bold text-base py-4 rounded-xl items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity active:scale-95"
          >
            Proceed To Checkout
            <ArrowRight size={20} />
          </button>

          {/* Trust badges (desktop) */}
          <div className="hidden lg:flex justify-center gap-5 text-outline mt-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldCheck size={14} /> Secure Checkout
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <ShoppingBag size={14} /> Wholesale Guarantee
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      {/* Sits above BottomNav (bottom-16 = 64px = BottomNav height) */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 bg-surface-card border-t border-table-border px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)] z-40">
        <div className="flex justify-between items-center max-w-lg mx-auto gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline block">
              Total to pay
            </span>
            <span className="text-lg font-bold text-on-surface">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => router.push('/checkout')}
            className="flex-shrink-0 bg-primary text-on-primary font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity active:scale-95"
          >
            Checkout
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
