'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Package, MapPin,
  Truck, Wallet, Plus, Pencil, ShieldCheck, Mail, Receipt, Gift,
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'
import PincodeChecker from '@/components/checkout/PincodeChecker'
import AddressForm from '@/components/checkout/AddressForm'
import { Skeleton, AddressCardSkeleton } from '@/components/ui/Skeleton'
import { isValidGstin } from '@/lib/validations/gst'
import Logo from '@/components/layout/Logo'
import type { Address } from '@/types/database.types'

interface Props { profileId: string; initialEmail?: string }

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
}

export default function CheckoutClient({ profileId, initialEmail = '' }: Props) {
  const router = useRouter()
  const items     = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const totalItems = useCartStore((s) => s.totalItems)
  const totalPrice = useCartStore((s) => s.totalPrice)
  const couponCode = useCartStore((s) => s.couponCode)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null)
  const [isBulk, setIsBulk] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstin, setGstin] = useState('')
  const [gstBusinessName, setGstBusinessName] = useState('')
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [validCouponCode, setValidCouponCode] = useState<string | null>(null)
  // Referral: field the referee enters + the buyer's own auto-applied credit.
  const [referralInput, setReferralInput] = useState('')
  const [referralApplied, setReferralApplied] = useState<{ code: string; type: 'percentage' | 'flat'; value: number; max: number | null } | null>(null)
  const [referralError, setReferralError] = useState('')
  const [referralChecking, setReferralChecking] = useState(false)
  const [referralEligible, setReferralEligible] = useState(false)
  const [myCredit, setMyCredit] = useState(0)

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null
  const subtotal = totalPrice()
  const referralDiscount = referralApplied
    ? Math.max(0, Math.min(
        referralApplied.type === 'percentage'
          ? (referralApplied.max != null
              ? Math.min(Math.round(subtotal * referralApplied.value / 100), referralApplied.max)
              : Math.round(subtotal * referralApplied.value / 100))
          : referralApplied.value,
        subtotal,
      ))
    : 0
  const creditApplied = Math.min(myCredit, Math.max(0, subtotal - couponDiscount - referralDiscount))
  const grandTotal = Math.max(0, subtotal - couponDiscount - referralDiscount - creditApplied)
  // Address + serviceability gate the button. The email is captured in a popup
  // at "Place Order" (PRD #3/#4) — every order/status update is sent to it.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  // A GST invoice is optional, but if requested the GSTIN + business name must be valid.
  const gstOk = !gstEnabled || (isValidGstin(gstin) && gstBusinessName.trim().length >= 2)
  const canPlace = !!selectedId && (pincodeResult?.serviceable === true || isBulk) && gstOk

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

  // Load addresses via the server API — the `addresses` table is service-role
  // only, so the browser client can't read it (permission denied).
  useEffect(() => {
    if (items.length === 0) { router.replace('/'); return }
    void (async () => {
      try {
        const res = await fetch('/api/addresses')
        const rows = (res.ok ? await res.json() : []) as Address[]
        setAddresses(rows)
        const def = rows.find((a) => a.is_default) ?? rows[0]
        if (def) setSelectedId(def.id)
      } finally {
        setLoadingAddresses(false)
      }
    })()
  }, [items.length, router])

  // Referral status: the buyer's own accrued credit + whether they can still
  // redeem someone's code (new customers, first order).
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/referral/me')
        if (!res.ok) return
        const d = await res.json() as { credit?: number; eligibleForReferee?: boolean; enabled?: boolean }
        setMyCredit(Number(d.credit ?? 0))
        setReferralEligible(!!d.enabled && !!d.eligibleForReferee)
      } catch { /* ignore */ }
    })()
  }, [])

  const applyReferral = async () => {
    const code = referralInput.trim()
    if (!code) return
    setReferralChecking(true); setReferralError('')
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`)
      const d = await res.json() as { valid: boolean; message?: string; code?: string; referee_type?: 'percentage' | 'flat'; referee_value?: number; max_discount?: number | null }
      if (!d.valid) { setReferralApplied(null); setReferralError(d.message ?? 'Invalid referral code.'); return }
      setReferralApplied({ code: d.code!, type: d.referee_type ?? 'flat', value: d.referee_value ?? 0, max: d.max_discount ?? null })
      setReferralError('')
    } catch {
      setReferralError('Could not check the code. Try again.')
    } finally {
      setReferralChecking(false)
    }
  }

  useEffect(() => {
    setPincodeResult(null)
    setIsBulk(false)
  }, [selectedId])

  // Clicking "Place Order" opens the email popup first — the customer must enter
  // an active email that all order/status update emails will be delivered to.
  const requestPlaceOrder = () => {
    if (!canPlace || isPlacing) return
    setError('')
    setShowEmailModal(true)
  }

  const placeOrder = async () => {
    if (!canPlace || !emailValid) return
    setShowEmailModal(false)
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
          email: email.trim() || undefined,
          gstin: gstEnabled ? gstin.trim().toUpperCase() || undefined : undefined,
          gst_business_name: gstEnabled ? gstBusinessName.trim() || undefined : undefined,
          referral_code: referralApplied?.code || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        // Stale cart — a product was deleted/deactivated. Drop those items so
        // the customer can retry with what's still available.
        if (json.error_code === 'items_unavailable' && Array.isArray(json.unavailable_ids)) {
          const names = items.filter((i) => json.unavailable_ids.includes(i.id)).map((i) => i.name)
          json.unavailable_ids.forEach((id: string) => removeItem(id))
          setError(
            names.length
              ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available and ${names.length === 1 ? 'was' : 'were'} removed from your cart. Please review your order and try again.`
              : (json.error ?? 'Some items are no longer available.'),
          )
          setIsPlacing(false)
          return
        }
        // Referral no longer valid — clear it so they can place the order without it.
        if (json.error_code === 'referral_invalid') {
          setReferralApplied(null)
          setReferralError(json.error ?? 'Referral code could not be applied.')
          setError('Your referral code could not be applied. It has been removed — please place your order again.')
          setIsPlacing(false)
          return
        }
        throw new Error(json.detail ? `${json.error}: ${json.detail}` : (json.error ?? 'Failed to place order'))
      }
      clearCart()
      router.push(`/orders/${json.order_id}?new=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setIsPlacing(false)
    }
  }

  if (loadingAddresses) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-4 pt-8 pb-16">
        <Skeleton className="h-8 w-40 mb-6" />
        <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AddressCardSkeleton />
            <AddressCardSkeleton />
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-16 lg:h-[68px] bg-surface border-b-2 border-table-border shadow-sm">
        {/* Dot texture */}
        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,#1C130A_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <button
          onClick={() => router.back()}
          className="relative z-10 p-2 -ml-1 text-primary/70 hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Link href="/">
            <Logo className="h-12 lg:h-[52px] w-auto" />
          </Link>
        </div>
        <div className="relative z-10 ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
          <ShieldCheck size={12} strokeWidth={2.5} /> Secure
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="pt-16 lg:pt-[68px] max-w-[1200px] mx-auto px-4 md:px-6 lg:grid lg:grid-cols-12 lg:gap-8 items-start">

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

                      {/* Edit + pincode checker */}
                      {isSelected && (
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditing(addr)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(addr) } }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer mb-3"
                          >
                            <Pencil size={12} strokeWidth={2.5} /> Edit address
                          </span>
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

          {/* ── GST Invoice (optional) ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Receipt size={14} className="text-white" />
              </div>
              GST Invoice
              <span className="text-[10px] normal-case tracking-normal text-on-surface-variant/50 font-medium">
                (optional)
              </span>
            </h2>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0',
                  gstEnabled ? 'bg-primary' : 'bg-outline-variant',
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                    gstEnabled ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </div>
              <span className="text-sm font-bold text-on-surface-variant leading-snug">
                I&apos;m buying for my business — add my GST details so I can claim input tax credit.
              </span>
            </label>

            {gstEnabled && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="gst-business" className="text-[11px] font-black text-on-surface-variant/70 uppercase tracking-[0.1em] block mb-1.5">
                    Registered Business Name *
                  </label>
                  <input
                    id="gst-business"
                    value={gstBusinessName}
                    onChange={(e) => setGstBusinessName(e.target.value)}
                    placeholder="e.g. Ramesh Kirana Stores"
                    className="w-full px-4 py-3 rounded-xl border-2 border-table-border bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="gst-number" className="text-[11px] font-black text-on-surface-variant/70 uppercase tracking-[0.1em] block mb-1.5">
                    GSTIN *
                  </label>
                  <input
                    id="gst-number"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="21GBUPR9356D1Z3"
                    maxLength={15}
                    autoCapitalize="characters"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border-2 bg-background text-sm font-bold tracking-wider uppercase text-on-surface placeholder:text-on-surface-variant/40 placeholder:font-medium placeholder:tracking-normal focus:outline-none transition-colors',
                      gstin.length === 0 || isValidGstin(gstin)
                        ? 'border-table-border focus:border-primary'
                        : 'border-error focus:border-error',
                    )}
                  />
                  {gstin.length > 0 && !isValidGstin(gstin) && (
                    <p className="text-[11px] font-bold text-error mt-1">Enter a valid 15-character GSTIN.</p>
                  )}
                </div>
                <p className="sm:col-span-2 text-[11px] font-medium text-on-surface-variant/60 leading-relaxed">
                  Your invoice will show these GST details so you can claim input tax credit.
                  <strong className="text-primary"> Note: GST invoice orders can&apos;t be cancelled once placed.</strong>
                </p>
              </div>
            )}
          </section>

          {/* ── Referral code (new customers) ── */}
          {referralEligible && (
            <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
              <h2 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Gift size={14} className="text-white" />
                </div>
                Referral Code
                <span className="text-[10px] normal-case tracking-normal text-on-surface-variant/50 font-medium">(optional)</span>
              </h2>
              {referralApplied ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-primary uppercase tracking-wider">{referralApplied.code} applied</p>
                    <p className="text-xs font-bold text-on-surface-variant/60 mt-0.5">−₹{referralDiscount.toFixed(0)} off your first order</p>
                  </div>
                  <button
                    onClick={() => { setReferralApplied(null); setReferralInput(''); setReferralError('') }}
                    className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant border-2 border-table-border rounded-xl px-3 py-1.5 hover:border-error/40 hover:text-error transition-colors"
                  >Remove</button>
                </div>
              ) : (
                <>
                  <div className="flex items-stretch gap-2">
                    <input
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyReferral() }}
                      placeholder="FRIEND'S CODE"
                      className="flex-1 min-w-0 border-2 border-table-border focus:border-primary rounded-xl px-4 py-2.5 text-sm bg-background placeholder:text-on-surface-variant/30 focus:outline-none transition-colors font-black tracking-widest uppercase"
                    />
                    <button
                      onClick={applyReferral}
                      disabled={!referralInput.trim() || referralChecking}
                      className="shrink-0 px-5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 active:scale-95 flex items-center gap-1.5"
                    >
                      {referralChecking ? <Loader2 size={13} className="animate-spin" /> : null} Apply
                    </button>
                  </div>
                  {referralError && <p className="text-xs font-bold text-error mt-2">{referralError}</p>}
                  <p className="text-[11px] font-medium text-on-surface-variant/50 mt-2">Have a friend&apos;s referral code? Apply it for a discount on your first order.</p>
                </>
              )}
            </section>
          )}

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
                {referralDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50 font-medium">Referral ({referralApplied?.code})</span>
                    <span className="text-emerald-300 font-black">−₹{referralDiscount.toFixed(0)}</span>
                  </div>
                )}
                {creditApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50 font-medium">Referral reward</span>
                    <span className="text-emerald-300 font-black">−₹{creditApplied.toFixed(0)}</span>
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
                onClick={requestPlaceOrder}
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
              {gstEnabled && !gstOk && (
                <p className="text-[11px] font-medium text-white/40 text-center mt-3">
                  Enter a valid GSTIN and business name to continue
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
          onClick={requestPlaceOrder}
          disabled={!canPlace || isPlacing}
          className="w-full flex items-center justify-center gap-2 bg-white text-primary font-black text-sm uppercase tracking-widest py-3.5 px-4 rounded-xl active:scale-95 transition-all duration-200 disabled:opacity-40"
        >
          {isPlacing && <Loader2 size={16} className="animate-spin" />}
          {isPlacing ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>

      {/* ── Email prompt modal — active email for all order/status updates ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
          <div className="w-full max-w-md bg-surface rounded-3xl border-2 border-table-border shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-white" />
              </div>
              <div>
                <h3 id="email-modal-title" className="font-black text-lg text-primary leading-tight">Your email for order updates</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/50">Required</p>
              </div>
            </div>
            <p className="text-sm font-medium text-on-surface-variant/80 mb-4">
              Enter an active email address. We&apos;ll send your order confirmation and every status update — <strong className="text-primary">processing, shipped, out for delivery</strong> and <strong className="text-primary">delivered</strong> — to this email.
            </p>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && emailValid && !isPlacing) placeOrder() }}
              placeholder="you@example.com"
              aria-invalid={email.trim().length > 0 && !emailValid}
              className={cn(
                'w-full px-4 py-3 rounded-xl border-2 bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none transition-colors',
                email.trim().length > 0 && !emailValid ? 'border-error focus:border-error' : 'border-table-border focus:border-primary',
              )}
            />
            {email.trim().length > 0 && !emailValid && (
              <p className="mt-2 text-xs font-bold text-error">Please enter a valid email address.</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={isPlacing}
                className="flex-1 py-3 rounded-xl border-2 border-table-border font-black text-xs uppercase tracking-widest text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                disabled={!emailValid || isPlacing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlacing && <Loader2 size={16} className="animate-spin" />}
                {isPlacing ? 'Placing…' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {editing && (
        <AddressForm
          profileId={profileId}
          address={editing}
          onSaved={(addr) => {
            setAddresses((prev) => prev.map((x) => (x.id === addr.id ? addr : x)))
            setSelectedId(addr.id)
            // Re-check serviceability against the edited pincode.
            setPincodeResult(null)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
