'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ShoppingBag,
  Package,
  MapPin,
  CreditCard,
  Receipt,
  Download,
  Printer,
  RefreshCw,
  Truck,
  CalendarCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import OrderTimeline from '@/components/orders/OrderTimeline'
import ReviewPopup from '@/components/product/ReviewPopup'
import { useCartStore } from '@/store/cartStore'
import type { Order, OrderItem } from '@/types/database.types'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function estimatedDelivery(order: Order) {
  if (order.estimated_delivery) return fmtDate(order.estimated_delivery)
  // Fallback: created_at + 2 days
  const d = new Date(order.created_at)
  d.setDate(d.getDate() + 2)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusLabel(s: Order['status']) {
  return {
    placed: 'Order Placed',
    confirmed: 'Confirmed',
    packed: 'Packed',
    shipping: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    returned: 'Returned',
  }[s] ?? s
}

// ── Order item row ────────────────────────────────────────────────────────────
function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="bg-surface-card rounded-xl border border-table-border shadow-sm p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
      <div className="w-20 h-20 bg-surface-container-low rounded-xl overflow-hidden flex-shrink-0 relative border border-table-border">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover mix-blend-multiply"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={28} className="text-outline" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-on-surface text-sm leading-snug truncate">{item.name}</h4>
          <p className="font-bold text-primary text-base whitespace-nowrap flex-shrink-0">
            {fmt(item.price)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {item.unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">
            Qty: <span className="font-semibold text-on-surface">{item.quantity}</span>
          </span>
          <span className="text-sm font-bold text-on-surface">
            Total: {fmt(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Success Overlay ───────────────────────────────────────────────────────────
function SuccessOverlay({
  order,
  onDismiss,
}: {
  order: Order
  onDismiss: () => void
}) {
  const orderId = `BCR-${order.id.slice(0, 8).toUpperCase()}`

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl overflow-hidden border border-table-border flex flex-col items-center text-center relative"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

        <div className="p-8 flex flex-col items-center">
          {/* Animated checkmark */}
          <motion.div
            className="relative w-24 h-24 mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            />
            <div className="absolute inset-2 rounded-full bg-primary-container opacity-40" />
            <div className="absolute inset-0 bg-primary-container rounded-full flex items-center justify-center shadow-md z-10">
              <Check size={48} className="text-on-primary" strokeWidth={2.5} />
            </div>
          </motion.div>

          <motion.h1
            className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Order Successful!
          </motion.h1>
          <motion.p
            className="text-sm text-on-surface-variant mb-6 max-w-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Thank you! Your order has been placed and is being processed.
          </motion.p>

          {/* Receipt mini-card */}
          <motion.div
            className="w-full bg-surface-container-low border border-table-border rounded-xl p-4 flex flex-col gap-3 text-left mb-6 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-outline">
                Order ID
              </span>
              <span className="text-base font-bold text-primary">#{orderId}</span>
            </div>
            <hr className="border-table-border" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-outline block mb-2">
                Estimated Delivery
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-on-secondary-container" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">{estimatedDelivery(order)}</p>
                  <p className="text-xs text-on-surface-variant">Standard delivery</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="w-full flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/"
              className="flex-1 h-12 border border-table-border text-primary text-sm font-semibold rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> Continue Shopping
            </Link>
            <button
              onClick={onDismiss}
              className="flex-1 h-12 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
            >
              <MapPin size={18} /> View Order Details
            </button>
          </motion.div>

          <motion.p
            className="text-xs text-outline mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            A confirmation has been sent to your registered account.
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
export default function OrderDetailClient({
  order,
  isNew,
}: {
  order: Order
  isNew: boolean
}) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [showSuccess, setShowSuccess] = useState(isNew)
  const [reordering, setReordering] = useState(false)
  const [skippedItems, setSkippedItems] = useState<string[]>([])

  // Review popup queue
  const [reviewIdx, setReviewIdx] = useState(0)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    if (!isNew) return
    const t = setTimeout(() => setShowReview(true), 3000)
    return () => clearTimeout(t)
  }, [isNew])

  function handleDismissSuccess() {
    setShowSuccess(false)
    // Remove ?new=1 from URL without navigation
    router.replace(`/orders/${order.id}`, { scroll: false })
  }

  const handleReorder = useCallback(async () => {
    setReordering(true)
    setSkippedItems([])
    try {
      const productIds = order.items.map((i) => i.product_id)
      const res = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: productIds }),
      })
      const { products } = await res.json() as {
        products: Array<{ id: string; name: string; slug: string; price: number; mrp: number | null; unit: string; images: string[]; stock_qty: number; is_active: boolean }>
      }

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
      const skipped: string[] = []

      for (const item of order.items) {
        const current = productMap[item.product_id]
        if (!current || !current.is_active || current.stock_qty <= 0) {
          skipped.push(item.name)
          continue
        }
        addItem({
          id: current.id,
          name: current.name,
          slug: current.slug,
          price: current.price,
          mrp: current.mrp,
          unit: current.unit,
          image: current.images?.[0] ?? null,
        })
      }

      setSkippedItems(skipped)
      if (order.items.length - skipped.length > 0) {
        router.push('/cart')
      }
    } catch {
      // ignore
    } finally {
      setReordering(false)
    }
  }, [order.items, addItem, router])

  function handleNextReview() {
    if (reviewIdx + 1 < order.items.length) {
      setReviewIdx((i) => i + 1)
    } else {
      setShowReview(false)
    }
  }

  const currentReviewItem = order.items[reviewIdx]
  const orderId = `BCR-${order.id.slice(0, 8).toUpperCase()}`
  const discount = order.discount ?? 0
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      {/* ── Success overlay ── */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessOverlay order={order} onDismiss={handleDismissSuccess} />
        )}
      </AnimatePresence>

      {/* ── Review popup ── */}
      {showReview && currentReviewItem && (
        <ReviewPopup
          productId={currentReviewItem.product_id}
          productName={currentReviewItem.name}
          onClose={handleNextReview}
        />
      )}

      {/* ── Order detail page ── */}
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24 md:pb-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/orders')}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant flex items-center justify-center active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl text-on-surface">Order Details</h1>
            <p className="text-sm text-on-surface-variant font-mono">#{orderId}</p>
          </div>
          <span
            className={[
              'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
              order.status === 'delivered'
                ? 'bg-green-100 text-green-800'
                : order.status === 'cancelled'
                ? 'bg-error-container text-on-error-container'
                : 'bg-secondary-container text-on-secondary-container',
            ].join(' ')}
          >
            {statusLabel(order.status)}
          </span>
        </div>

        {/* Status tracker card */}
        <section className="bg-surface-card rounded-xl border border-table-border shadow-sm p-5 mb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                Order Date
              </p>
              <p className="font-semibold text-on-surface text-sm">
                {fmtDateTime(order.created_at)}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                Estimated Delivery
              </p>
              <p className="font-bold text-primary text-sm flex items-center gap-1 md:justify-end">
                <CalendarCheck size={14} />
                {estimatedDelivery(order)}
              </p>
            </div>
          </div>
          <OrderTimeline status={order.status} />
        </section>

        {/* Admin custom message */}
        {order.custom_message && (
          <div className="bg-secondary-container rounded-xl border border-table-border p-4 mb-4 flex items-start gap-3">
            <span className="text-on-secondary-container text-xs font-bold uppercase tracking-widest mt-0.5">
              Note from BCR Traders
            </span>
            <p className="text-sm text-on-secondary-container">{order.custom_message}</p>
          </div>
        )}

        {/* Items */}
        <section className="mb-4">
          <h3 className="font-bold text-on-surface text-base mb-3">
            Items Ordered ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
          </h3>
          <div className="flex flex-col gap-3">
            {order.items.map((item, idx) => (
              <OrderItemRow key={`${item.product_id}-${idx}`} item={item} />
            ))}
          </div>
        </section>

        {/* Details bento grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Delivery address */}
          <div className="bg-surface-card rounded-xl border border-table-border shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-primary flex-shrink-0" />
              <h4 className="font-bold text-on-surface text-sm">Delivery Address</h4>
            </div>
            <div className="text-sm text-on-surface-variant space-y-1 flex-1">
              <p className="font-semibold text-on-surface">{order.address.name}</p>
              <p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}</p>
              <p>{order.address.city}, {order.address.state} {order.address.pincode}</p>
              <p className="flex items-center gap-1 text-on-surface pt-1.5">
                <span className="text-outline">📞</span> {order.address.phone}
              </p>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-surface-card rounded-xl border border-table-border shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} className="text-primary flex-shrink-0" />
              <h4 className="font-bold text-on-surface text-sm">Payment Method</h4>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center py-3 bg-surface-container-low rounded-xl border border-table-border">
              <p className="text-2xl font-bold text-on-surface mb-1">C.O.D.</p>
              <p className="text-xs text-on-surface-variant text-center px-4">
                Cash on Delivery<br />
                Please have exact change ready.
              </p>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-surface-card rounded-xl border border-table-border shadow-sm p-5 flex flex-col md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={18} className="text-primary flex-shrink-0" />
              <h4 className="font-bold text-on-surface text-sm">Order Summary</h4>
            </div>
            <div className="flex flex-col gap-2 text-sm flex-1">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                <span className="font-semibold text-on-surface">{fmt(order.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span className="font-semibold text-error">-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant">
                <span>Delivery Fee</span>
                <span className={order.delivery_fee === 0 ? 'font-bold text-primary' : 'font-semibold text-on-surface'}>
                  {order.delivery_fee === 0 ? 'FREE' : fmt(order.delivery_fee)}
                </span>
              </div>
              <hr className="border-table-border my-1" />
              <div className="flex justify-between items-end">
                <span className="font-bold text-on-surface">Grand Total</span>
                <span className="font-bold text-xl text-primary">{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Skipped items warning */}
        {skippedItems.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-error-container border border-error/20 mb-3">
            <AlertTriangle size={18} className="text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-on-error-container mb-1">
                {skippedItems.length} item{skippedItems.length > 1 ? 's' : ''} skipped (out of stock)
              </p>
              <p className="text-xs text-on-error-container/80">
                {skippedItems.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-table-border">
          <button
            onClick={() => window.print()}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-on-surface bg-transparent border border-table-border hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2 print:hidden"
          >
            <Printer size={16} /> Print Invoice
          </button>
          <a
            href={`/api/orders/${order.id}/invoice`}
            download
            className="px-5 py-3 rounded-xl text-sm font-semibold text-on-surface bg-transparent border border-table-border hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2 print:hidden"
          >
            <Download size={16} /> Download PDF
          </a>
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-on-primary bg-primary hover:opacity-90 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {reordering ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Reorder Items
          </button>
        </div>
      </div>
    </>
  )
}
