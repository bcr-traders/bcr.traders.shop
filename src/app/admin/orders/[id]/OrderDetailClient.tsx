'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus, OrderItem, Address } from '@/types/database.types'

type DeliveryPerson = { id: string; name: string; phone: string }

type OrderDetail = {
  id: string
  status: OrderStatus
  total: number
  subtotal: number
  delivery_fee: number
  discount?: number | null
  coupon_code?: string | null
  created_at: string
  updated_at: string
  address: Address | null
  items: OrderItem[]
  payment_method: string
  notes: string | null
  is_bulk: boolean
  estimated_delivery?: string | null
}

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container text-on-surface-variant',
  confirmed: 'bg-blue-100 text-blue-700',
  packed:    'bg-amber-100 text-amber-700',
  shipping:  'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned:  'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed:    'Placed',
  confirmed: 'Confirmed',
  packed:    'Packed',
  shipping:  'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned:  'Returned',
}

const ALL_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function OrderDetailClient({
  order: initialOrder,
  deliveryPersons,
}: {
  order: OrderDetail
  deliveryPersons: DeliveryPerson[]
}) {
  const [order, setOrder] = useState(initialOrder)
  const [newStatus, setNewStatus] = useState<OrderStatus>(initialOrder.status)
  const [assignedTo, setAssignedTo] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [notes, setNotes] = useState(initialOrder.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function updateStatus() {
    if (newStatus === order.status && !assignedTo) return
    setUpdatingStatus(true)
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setOrder(prev => ({ ...prev, status: newStatus }))
      showToast(`Status updated to ${STATUS_LABEL[newStatus]}`)
    } else {
      showToast('Failed to update status')
    }
    setUpdatingStatus(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      setOrder(prev => ({ ...prev, notes }))
      showToast('Notes saved')
    }
    setSavingNotes(false)
  }

  const addr = order.address
  const showAssign = newStatus === 'shipping' && deliveryPersons.length > 0

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {new Date(order.created_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {order.is_bulk && (
                <span className="ml-2 px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm">
                  Bulk Order
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Invoice
          </Link>
          <Link
            href={`/admin/orders/${order.id}/timeline`}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            Timeline
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* ── Left column: Customer + Items ── */}
        <div className="lg:col-span-2 space-y-gutter">

          {/* Customer info */}
          <Card title="Customer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Name</p>
                <p className="font-body-lg text-body-lg text-on-surface font-medium">{addr?.name ?? '—'}</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Phone</p>
                {addr?.phone ? (
                  <a
                    href={`tel:${addr.phone}`}
                    className="font-body-lg text-body-lg text-secondary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    {addr.phone}
                  </a>
                ) : <p className="font-body-lg text-body-lg text-on-surface">—</p>}
              </div>
            </div>
          </Card>

          {/* Delivery address */}
          <Card title="Delivery Address">
            {addr ? (
              <div className="space-y-1">
                <p className="font-body-md text-body-md text-on-surface font-medium">{addr.name}</p>
                <p className="font-body-md text-body-md text-on-surface">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                <p className="font-body-md text-body-md text-on-surface">{addr.city}, {addr.state} — {addr.pincode}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">{addr.phone}</p>
                {addr.label && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm">
                    {addr.label}
                  </span>
                )}
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant">No address on file</p>
            )}
          </Card>

          {/* Order items */}
          <Card title={`Items (${order.items.length})`}>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-outline-variant/30"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">inventory_2</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-medium">{item.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{item.unit}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {fmt(item.price)} × {item.quantity}
                      </p>
                      <p className="font-body-md text-body-md text-on-surface font-semibold">
                        {fmt(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="mt-6 pt-4 border-t border-outline-variant/30 space-y-2">
              <Row label="Subtotal" value={fmt(order.subtotal)} />
              {(order.discount ?? 0) > 0 && (
                <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} value={`-${fmt(order.discount!)}`} valueClass="text-green-600" />
              )}
              <Row label="Delivery" value={order.delivery_fee === 0 ? 'FREE' : fmt(order.delivery_fee)} />
              <div className="flex justify-between pt-2 border-t border-outline-variant/30">
                <span className="font-headline-sm text-headline-sm text-primary">Total</span>
                <span className="font-headline-sm text-headline-sm text-primary">{fmt(order.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column: Status + Payment + Notes ── */}
        <div className="space-y-gutter">

          {/* Current status */}
          <Card title="Order Status">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn('px-3 py-1.5 rounded-full font-body-md text-body-md capitalize', STATUS_CHIP[order.status])}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="space-y-3">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Update Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>

                {showAssign && (
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Select delivery person…</option>
                    {deliveryPersons.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={updateStatus}
                  disabled={updatingStatus || newStatus === order.status}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {updatingStatus && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  )}
                  {updatingStatus ? 'Updating…' : 'Update Status'}
                </button>
              </div>

              {/* Timeline link */}
              <Link
                href={`/admin/orders/${order.id}/timeline`}
                className="flex items-center gap-2 text-secondary font-body-md text-body-md hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Add timeline update
              </Link>
            </div>
          </Card>

          {/* Payment */}
          <Card title="Payment">
            <div className="space-y-3">
              <Row label="Method" value={order.payment_method.toUpperCase()} />
              <Row label="Amount" value={fmt(order.total)} />
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface-variant">Status</span>
                <span className={cn(
                  'px-3 py-1 rounded-full font-label-sm text-label-sm',
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                )}>
                  {order.status === 'delivered' ? 'Collected' : 'Pending'}
                </span>
              </div>
            </div>
          </Card>

          {/* Admin Notes */}
          <Card title="Admin Notes">
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes (not visible to customer)…"
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <button
                onClick={saveNotes}
                disabled={savingNotes || notes === (order.notes ?? '')}
                className="w-full py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest disabled:opacity-50 transition-colors"
              >
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-surface rounded-2xl border border-outline-variant/50 p-6 space-y-4"
      style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.06)' }}
    >
      <h3 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant/20 pb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className={cn('font-body-md text-body-md text-on-surface', valueClass)}>{value}</span>
    </div>
  )
}
