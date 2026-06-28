'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'

const ALL_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container text-on-surface-variant',
  confirmed: 'bg-blue-100 text-blue-700',
  packed:    'bg-amber-100 text-amber-700',
  shipping:  'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned:  'bg-gray-100 text-gray-600',
}

export type RecentOrderRow = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
  address: { name?: string; phone?: string } | null
  items: { product_id: string; quantity: number }[] | null
}

export default function RecentOrdersTable({ initialOrders }: { initialOrders: RecentOrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [updating, setUpdating] = useState<string | null>(null)

  async function changeStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId)
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    }
    setUpdating(null)
  }

  return (
    <section
      className="bg-surface rounded-2xl border border-outline-variant/50"
      style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.08)' }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
        <h4 className="font-headline-md text-headline-md text-primary">Recent Orders</h4>
        <Link href="/admin/orders" className="font-body-md text-body-md text-secondary hover:underline">
          View all →
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="py-12 text-center font-body-md text-body-md text-on-surface-variant">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                {['Order #', 'Customer', 'Items', 'Total', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="py-3 px-4 border-b border-outline-variant/20 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const addr = order.address
                const itemCount = order.items?.length ?? 0
                return (
                  <tr
                    key={order.id}
                    className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors last:border-0"
                  >
                    <td className="py-3 px-4 font-bold font-label-sm text-label-sm text-primary">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-body-md text-body-md text-on-surface">{addr?.name ?? '—'}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{addr?.phone ?? ''}</p>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-semibold">
                      ₹{order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                        className={cn(
                          'font-label-sm text-label-sm rounded-full px-3 py-1.5 border-0 outline-none cursor-pointer capitalize appearance-none disabled:opacity-50 transition-colors',
                          STATUS_CHIP[order.status],
                        )}
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s} className="bg-surface text-on-surface capitalize">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-secondary font-body-md text-body-md hover:underline whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
