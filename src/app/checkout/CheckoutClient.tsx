'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Package, MapPin,
  Truck, Wallet, Plus, ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'
import PincodeChecker from '@/components/checkout/PincodeChecker'
import AddressForm from '@/components/checkout/AddressForm'
import Logo from '@/components/layout/Logo'
import type { Address } from '@/types/database.types'

interface Props { profileId: string }

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
}

export default function CheckoutClient({ profileId }: Props) {
  const router = useRouter()
  const items     = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const totalItems = useCartStore((s) => s.totalItems)
  const totalPrice = useCartStore((s) => s.totalPrice)
  const couponCode = useCartStore((s) => s.couponCode)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null)
  const [isBulk, setIsBulk] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [validCouponCode, setValidCouponCode] = useState<string | null>(null)

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null
  const subtotal = totalPrice()
  const grandTotal = Math.max(0, subtotal - couponDiscount)
  const canPlace = !!selectedId && (pincodeResult?.serviceable === true || isBulk)

  // Re-validate the applied coupon here and compute the discount authoritatively
  // for display (the order API re-checks it server-side too).
  useEffect(() => {
    if (!couponCode || subtotal <= 0) { setCouponDiscount(0); setValidCouponCode(null); return }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/coupons')
        if (!res.ok) return
        const data: Array<{
          code: string; discount_type: 'percentage' | 'flat'; discount_value: number
          min_order_value: number | null; max_discount: number | null
          max_uses: number | null; uses_count: number | null; valid_until: string | null
        }> = await res.json()
        const c = data.find((x) => x.code.toUpperCase() === couponCode.toUpperCase())
        const expired = !!c?.valid_until && new Date(c.valid_until) < new Date()
        const usedUp = c?.max_uses != null && (c.uses_count ?? 0) >= c.max_uses
        const belowMin = c?.min_order_value != null && subtotal < c.min_order_value
        if (!c || expired || usedUp || belowMin) {
          if (!cancelled) { setCouponDiscount(0); setValidCouponCode(null) }
          return
        }
        let d = c.discount_type === 'percentage'
          ? Math.round((subtotal * c.discount_value) / 100)
          : c.discount_value
        if (c.max_discount != null && d > c.max_discount) d = c.max_discount
        d = Math.min(d, subtotal)
        if (!cancelled) { setCouponDiscount(d); setValidCouponCode(c.code) }
      } catch {
        if (!cancelled) { setCouponDiscount(0); setValidCouponCode(null) }
      }
    })()
    return () => { cancelled = true }
  }, [couponCode, subtotal])

  // Load addresses
  useEffect(() => {
    if (items.length === 0) { router.replace('/'); return }
    const supabase = createClient()
    void (async () => {
      try {
        const { data } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', profileId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
        const rows = (data ?? []) as unknown as Address[]
        setAddresses(rows)
        const def = rows.find((a) => a.is_default) ?? rows[0]
        if (def) setSelectedId(def.id)
      } finally {
        setLoadingAddresses(false)
      }
    })()
  }, [profileId, items.length, router])

  useEffect(() => {
    setPincodeResult(null)
    setIsBulk(false)
  }, [selectedId])

  const placeOrder = async () => {
    if (!canPlace) return
    setError('')
    setIsPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: selectedId,
          items,
          notes: notes.trim() || undefined,
          is_bulk: isBulk,
          coupon_code: validCouponCode || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to place order')
      clearCart()
      router.push(`/orders/${json.order_id}?new=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setIsPlacing(false)
    }
  }

  if (loadingAddresses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/40">
            Loading…
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-14 lg:h-16 bg-primary border-b-2 border-primary shadow-sm">
        {/* Dot texture */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <button
          onClick={() => router.back()}
          className="relative z-10 p-2 -ml-1 text-white/70 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Link href="/">
            <Logo className="h-9 w-auto" />
          </Link>
        </div>
        <div className="relative z-10 ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/35">
          <ShieldCheck size={12} strokeWidth={2.5} /> Secure
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="pt-14 lg:pt-16 max-w-[1200px] mx-auto px-4 md:px-6 lg:grid lg:grid-cols-12 lg:gap-8 items-start">

        {/* LEFT — Checkout steps */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 mt-6">

          {/* Page title */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">
              Step 1 of 1
            </p>
            <h1 className="text-2xl font-black text-primary tracking-tight uppercase">
              Checkout
            </h1>
          </div>

          {/* ── Delivery Address ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <MapPin size={14} className="text-white" />
                </div>
                Delivery Address
              </h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-on-surface-variant border-2 border-table-border rounded-xl px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-all duration-200"
              >
                <Plus size={12} strokeWidth={2.5} /> Add New
              </button>
            </div>

            {addresses.length === 0 ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-10 border-2 border-dashed border-table-border rounded-2xl flex flex-col items-center gap-3 text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all duration-200"
              >
                <MapPin size={28} strokeWidth={1.5} />
                <span className="text-[11px] font-black uppercase tracking-wider">Add a delivery address</span>
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedId
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedId(addr.id)}
                      className={cn(
                        'relative rounded-2xl border-2 p-4 text-left transition-all duration-200',
                        isSelected
                          ? 'border-primary bg-primary/3 shadow-[0_0_0_4px_rgba(0,0,0,0.04)]'
                          : 'border-table-border hover:border-primary/30',
                      )}
                    >
                      {/* Selected tick */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      )}

                      {addr.label && (
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/40 mb-1">
                          {addr.label}
                        </p>
                      )}
                      <p className="font-black text-sm text-primary mb-1">{addr.name}</p>
                      <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">
                        {addr.line1}
                        {addr.line2 && `, ${addr.line2}`}
                        <br />
                        {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                      <p className="text-xs font-medium text-on-surface-variant/50 mt-1.5">{addr.phone}</p>

                      {/* Pincode checker */}
                      {isSelected && (
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <PincodeChecker
                            pincode={addr.pincode}
                            onResult={setPincodeResult}
                            isBulkSelected={isBulk}
                            onBulkToggle={setIsBulk}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Delivery Method ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Truck size={14} className="text-white" />
              </div>
              Delivery Method
            </h2>
            <div className="rounded-2xl border-2 border-primary bg-primary/3 p-4 flex items-start gap-4">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-black">✓</span>
              </div>
              <div>
                <p className="font-black text-sm text-primary uppercase tracking-wide">
                  BCR Traders Direct Delivery
                </p>
                <p className="text-xs font-medium text-on-surface-variant/60 mt-1 leading-relaxed">
                  Our dedicated fleet delivers your order directly to your premises.
                </p>
                {isBulk && (
                  <p className="text-[11px] font-black text-primary/70 mt-2 uppercase tracking-wider">
                    ★ Bulk order — our team will call you to confirm delivery.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Payment Method ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Wallet size={14} className="text-white" />
              </div>
              Payment Method
            </h2>
            <div className="rounded-2xl border-2 border-primary bg-primary/3 p-4 flex items-start gap-4">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-black">✓</span>
              </div>
              <div>
                <p className="font-black text-sm text-primary uppercase tracking-wide">
                  Cash on Delivery (COD)
                </p>
                <p className="text-xs font-medium text-on-surface-variant/60 mt-1">
                  Pay when your order is delivered.
                </p>
              </div>
            </div>
          </section>

          {/* ── Order Notes (mobile) ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 lg:hidden">
            <label
              htmlFor="checkout-notes"
              className="block font-black text-sm uppercase tracking-widest text-primary mb-3"
            >
              Order Notes{' '}
              <span className="text-[10px] normal-case tracking-normal text-on-surface-variant/50 font-medium">
                (optional)
              </span>
            </label>
            <textarea
              id="checkout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Special instructions, preferred delivery time…"
              className="w-full px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none transition-colors resize-none"
            />
          </section>
        </div>

        {/* ── RIGHT — Order Summary ── */}
        <div className="lg:col-span-5 xl:col-span-4 mt-5 lg:mt-6 lg:sticky lg:top-24 pb-28 lg:pb-0">
          <section className="relative bg-primary rounded-2xl overflow-hidden p-5">
            {/* Dot texture */}
            <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-4">
                Order Summary
              </p>

              {/* Item list */}
              <div className="space-y-3 mb-4 pb-4 border-b border-white/15">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full mix-blend-luminosity opacity-70"
                          />
                        ) : (
                          <Package size={16} className="text-white/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-white/40 font-medium">{item.unit} × {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-white flex-shrink-0">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="space-y-2.5 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50 font-medium">Subtotal ({totalItems()} items)</span>
                  <span className="text-white font-black">₹{subtotal.toFixed(0)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50 font-medium">
                      Coupon {validCouponCode ? `(${validCouponCode})` : 'Discount'}
                    </span>
                    <span className="text-emerald-300 font-black">−₹{couponDiscount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pb-3 border-b border-white/15">
                  <span className="text-white/50 font-medium">Delivery</span>
                  <span className="text-white font-black text-xs uppercase tracking-wider">Free</span>
                </div>
              </div>

              <div className="flex items-end justify-between mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total</span>
                <span className="text-2xl font-black text-white">₹{grandTotal.toFixed(0)}</span>
              </div>

              {/* Notes — desktop */}
              <div className="hidden lg:block mb-5">
                <label
                  htmlFor="checkout-notes-desktop"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/35 mb-2"
                >
                  Order Notes (optional)
                </label>
                <textarea
                  id="checkout-notes-desktop"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Special instructions…"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-white/15 bg-white/8 text-sm font-medium text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-error bg-white/10 rounded-xl px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              {/* Desktop CTA */}
              <button
                onClick={placeOrder}
                disabled={!canPlace || isPlacing}
                className="hidden md:flex w-full items-center justify-center gap-2 bg-white text-primary font-black text-sm uppercase tracking-widest py-4 px-4 rounded-xl hover:bg-white/90 transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlacing && <Loader2 size={16} className="animate-spin" />}
                {isPlacing ? 'Placing Order…' : 'Place Order'}
              </button>

              {!canPlace && selectedId && pincodeResult?.serviceable === false && !isBulk && (
                <p className="text-[11px] font-medium text-white/40 text-center mt-3">
                  Select bulk order above to proceed with this address
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── Mobile sticky bottom bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 w-full bg-primary border-t-2 border-primary/50 px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)] z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/35">
            Total{couponDiscount > 0 ? ` · −₹${couponDiscount.toFixed(0)}` : ''}
          </span>
          <span className="text-xl font-black text-white">₹{grandTotal.toFixed(0)}</span>
        </div>
        {error && <p className="text-xs font-bold text-error mb-2">{error}</p>}
        <button
          onClick={placeOrder}
          disabled={!canPlace || isPlacing}
          className="w-full flex items-center justify-center gap-2 bg-white text-primary font-black text-sm uppercase tracking-widest py-3.5 px-4 rounded-xl active:scale-95 transition-all duration-200 disabled:opacity-40"
        >
          {isPlacing && <Loader2 size={16} className="animate-spin" />}
          {isPlacing ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>

      {/* ── Address form modal ── */}
      {showForm && (
        <AddressForm
          profileId={profileId}
          onSaved={(addr) => {
            setAddresses((prev) => [addr, ...prev])
            setSelectedId(addr.id)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}
