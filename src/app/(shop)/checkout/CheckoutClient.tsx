'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Loader2, Package, MapPin, Truck, Wallet, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'
import PincodeChecker from '@/components/checkout/PincodeChecker'
import AddressForm from '@/components/checkout/AddressForm'
import type { Address } from '@/types/database.types'

interface Props {
  profileId: string
}

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
}

export default function CheckoutClient({ profileId }: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const totalItems = useCartStore((s) => s.totalItems)
  const totalPrice = useCartStore((s) => s.totalPrice)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null)
  const [isBulk, setIsBulk] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null
  const subtotal = totalPrice()
  const canPlace =
    !!selectedId &&
    (pincodeResult?.serviceable === true || isBulk)

  // ── Load addresses ──────────────────────────────────────────────────────

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

  // Reset pincode state when address changes
  useEffect(() => {
    setPincodeResult(null)
    setIsBulk(false)
  }, [selectedId])

  // ── Place order ──────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingAddresses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-12 lg:h-16 bg-surface shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-primary hover:bg-surface-container-low rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-headline-md text-headline-md text-primary font-bold absolute left-1/2 -translate-x-1/2">
          BCR Traders
        </h1>
      </header>

      {/* ── Main ── */}
      <main className="pt-16 max-w-[1280px] mx-auto px-4 md:px-6 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 mt-4">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-background">
            Checkout
          </h1>

          {/* ── Delivery Address ── */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <MapPin size={20} className="text-primary fill-primary" />
                Delivery Address
              </h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-primary font-label-sm text-label-sm hover:underline"
              >
                <Plus size={14} />
                Add New
              </button>
            </div>

            {addresses.length === 0 ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-10 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center gap-2 text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <MapPin size={28} />
                <span className="font-body-md text-body-md">Add a delivery address</span>
              </button>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedId
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedId(addr.id)}
                      className={cn(
                        'relative rounded-xl border-2 p-4 text-left cursor-pointer transition-colors',
                        isSelected
                          ? 'border-primary bg-primary-container/5'
                          : 'border-outline-variant hover:bg-surface-container-low',
                      )}
                    >
                      {isSelected && (
                        <span
                          className="material-symbols-outlined text-primary absolute top-3 right-3 text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      )}
                      {addr.label && (
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">
                          {addr.label}
                        </p>
                      )}
                      <p className="font-body-lg text-body-lg text-on-surface font-semibold mb-1">
                        {addr.name}
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        {addr.line1}
                        {addr.line2 && `, ${addr.line2}`}
                        <br />
                        {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                        {addr.phone}
                      </p>

                      {/* Pincode check for selected address */}
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
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 md:p-6">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-4">
              <Truck size={20} className="text-primary" />
              Delivery Method
            </h2>
            <div className="rounded-xl border border-primary bg-primary-container/5 p-4 flex items-start gap-4">
              <span
                className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">
                  Manual Delivery by BCR Traders
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Our dedicated fleet delivers your order directly to your premises.
                </p>
                {isBulk && (
                  <p className="font-label-sm text-label-sm text-secondary mt-2">
                    ★ Bulk order — our team will call you to confirm delivery logistics.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Payment Method ── */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 md:p-6">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-4">
              <Wallet size={20} className="text-primary" />
              Payment Method
            </h2>
            <div className="rounded-xl border border-primary bg-primary-container/5 p-4 flex items-start gap-4">
              <span
                className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                radio_button_checked
              </span>
              <div>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">
                  Cash on Delivery (COD)
                </p>
                <p className="font-body-md text-body-md text-secondary font-medium mt-1">
                  Pay when your order is delivered.
                </p>
              </div>
            </div>
          </section>

          {/* ── Order Notes ── */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 md:p-6 lg:hidden">
            <label
              htmlFor="checkout-notes"
              className="font-headline-md text-headline-md text-on-surface block mb-3"
            >
              Order Notes <span className="font-body-md text-body-md text-on-surface-variant">(optional)</span>
            </label>
            <textarea
              id="checkout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Special instructions, preferred delivery time…"
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-background font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </section>
        </div>

        {/* ── Order Summary (right column) ── */}
        <div className="lg:col-span-5 xl:col-span-4 mt-6 lg:mt-4 lg:sticky lg:top-24 pb-28 lg:pb-0">
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 md:p-6">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 pb-2 border-b border-outline-variant/30">
              Order Summary
            </h2>

            {/* Item list */}
            <div className="space-y-3 mb-4 pb-4 border-b border-outline-variant/30">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Package size={20} className="text-outline" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body-md text-body-md text-on-surface line-clamp-1">
                        {item.name}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {item.unit} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-body-md text-body-md text-on-surface font-semibold flex-shrink-0">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                <span>Subtotal ({totalItems()} items)</span>
                <span>₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                <span>Delivery Fee</span>
                <span className="text-primary font-medium">Free</span>
              </div>
            </div>

            <div className="flex items-end justify-between border-t border-outline-variant/30 pt-4 mb-6">
              <span className="font-body-lg text-body-lg text-on-surface font-semibold">Total</span>
              <span className="font-headline-md text-headline-md text-primary">₹{subtotal.toFixed(0)}</span>
            </div>

            {/* Notes (desktop) */}
            <div className="hidden lg:block mb-6">
              <label
                htmlFor="checkout-notes-desktop"
                className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2"
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
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-background font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="font-label-sm text-label-sm text-error mb-3">{error}</p>
            )}

            {/* Desktop place order button */}
            <button
              onClick={placeOrder}
              disabled={!canPlace || isPlacing}
              className="hidden md:flex w-full items-center justify-center gap-2 bg-primary text-on-primary font-body-lg text-body-lg font-bold py-3 px-4 rounded-full hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacing && <Loader2 size={18} className="animate-spin" />}
              {isPlacing ? 'Placing Order…' : 'Place Order'}
            </button>

            {!canPlace && selectedId && pincodeResult?.serviceable === false && !isBulk && (
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-2">
                Select bulk order above to proceed with this address
              </p>
            )}
          </section>
        </div>
      </main>

      {/* ── Mobile sticky bottom bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/30 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-body-lg text-body-lg text-on-surface font-semibold">Total</span>
          <span className="font-headline-md text-headline-md text-primary">₹{subtotal.toFixed(0)}</span>
        </div>
        {error && <p className="font-label-sm text-label-sm text-error mb-2">{error}</p>}
        <button
          onClick={placeOrder}
          disabled={!canPlace || isPlacing}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-body-lg text-body-lg font-bold py-3 px-4 rounded-full active:scale-95 transition-transform shadow-sm disabled:opacity-50"
        >
          {isPlacing && <Loader2 size={18} className="animate-spin" />}
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
