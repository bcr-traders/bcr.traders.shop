'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'

type OrderRow = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
  address: { name?: string; phone?: string } | null
  items: unknown[] | null
  payment_method: string
}

const STATUS_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'placed',    label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed',    label: 'Packed' },
  { key: 'shipping',  label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container text-on-surface-variant',
  confirmed: 'bg-blue-100 text-blue-700',
  packed:    'bg-amber-100 text-amber-700',
  shipping:  'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned:  'bg-gray-100 text-gray-600',
}

export default function OrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    let list = [...initialOrders]

    if (activeTab !== 'all') list = list.filter(o => o.status === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.address as { phone?: string } | null)?.phone?.includes(q) ||
        (o.address as { name?: string } | null)?.name?.toLowerCase().includes(q),
      )
    }

    if (dateFrom) list = list.filter(o => new Date(o.created_at) >= new Date(dateFrom))
    if (dateTo)   list = list.filter(o => new Date(o.created_at) <= new Date(dateTo + 'T23:59:59'))

    return list
  }, [initialOrders, activeTab, search, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initialOrders.length }
    for (const o of initialOrders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [initialOrders])

  function exportCSV() {
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Items', 'Total', 'Payment', 'Status']
    const rows = filtered.map(o => {
      const addr = o.address as { name?: string; phone?: string } | null
      return [
        `BCR-${o.id.slice(-8).toUpperCase()}`,
        new Date(o.created_at).toLocaleDateString('en-IN'),
        `"${(addr?.name ?? '').replace(/"/g, '""')}"`,
        addr?.phone ?? '',
        o.items?.length ?? 0,
        o.total,
        o.payment_method.toUpperCase(),
        o.status,
      ]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `bcr-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Orders
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {filtered.length} orders shown
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export CSV
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full font-body-md text-body-md transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {tab.label}
              {counts[tab.key] !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full font-label-sm text-label-sm text-[11px]',
                  activeTab === tab.key
                    ? 'bg-on-primary/20 text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant',
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search order # or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-full border border-outline-variant font-body-md text-body-md focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
          <span className="font-label-sm text-label-sm text-on-surface-variant">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.08)' }}
      >
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">receipt_long</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  {['Order #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Status', ''].map(h => (
                    <th key={h} className="py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const addr = order.address as { name?: string; phone?: string } | null
                  const itemCount = order.items?.length ?? 0
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="py-3 px-4 font-bold font-label-sm text-label-sm text-primary">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-body-md text-body-md text-on-surface">{addr?.name ?? '—'}</p>
                        {addr?.phone && (
                          <a
                            href={`tel:${addr.phone}`}
                            className="font-label-sm text-label-sm text-secondary hover:underline"
                          >
                            {addr.phone}
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-semibold">
                        ₹{order.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm uppercase">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('px-3 py-1 rounded-full font-label-sm text-label-sm capitalize', STATUS_CHIP[order.status])}>
                          {order.status === 'shipping' ? 'Out for Delivery' : order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="flex items-center gap-1 font-body-md text-body-md text-secondary hover:underline"
                        >
                          View
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
