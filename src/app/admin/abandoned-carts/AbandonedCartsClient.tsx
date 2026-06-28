'use client'

import { useState } from 'react'
import { X, Download } from 'lucide-react'
import type { AbandonedCart } from './page'

interface Props { initialCarts: AbandonedCart[] }

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function AbandonedCartsClient({ initialCarts }: Props) {
  const [carts] = useState<AbandonedCart[]>(initialCarts)
  const [selected, setSelected] = useState<AbandonedCart | null>(null)
  const [minValue, setMinValue] = useState('')
  const [showRecovered, setShowRecovered] = useState<'all' | 'yes' | 'no'>('all')

  const filtered = carts.filter((c) => {
    if (minValue && c.total_value < Number(minValue)) return false
    if (showRecovered === 'yes' && !c.is_recovered) return false
    if (showRecovered === 'no' && c.is_recovered) return false
    return true
  })

  const exportCSV = () => {
    const header = 'Customer,Phone,Items,Cart Value,Last Activity,Recovered'
    const rows = filtered.map((c) =>
      `${c.customer_name ?? '—'},${c.phone ?? '—'},"${c.items.map((i) => `${i.name}×${i.quantity}`).join('; ')}",₹${c.total_value},${formatDate(c.last_activity)},${c.is_recovered ? 'Yes' : 'No'}`
    ).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'abandoned-carts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Abandoned Carts</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {carts.filter((c) => !c.is_recovered).length} active · {carts.filter((c) => c.is_recovered).length} recovered
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-surface-container rounded-full p-1">
          {(['all', 'no', 'yes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setShowRecovered(v)}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${showRecovered === v ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              {v === 'all' ? 'All' : v === 'no' ? 'Active' : 'Recovered'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Min value ₹</span>
          <input
            type="number"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="0"
            className="w-24 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/30">
              {['Customer', 'Phone', 'Items', 'Cart Value', 'Last Activity', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center font-body-md text-body-md text-on-surface-variant">No carts found.</td></tr>
            ) : filtered.map((cart) => (
              <tr key={cart.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{cart.customer_name ?? '—'}</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{cart.phone ?? '—'}</td>
                <td className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant">{cart.item_count} items</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface font-semibold">₹{cart.total_value.toFixed(0)}</td>
                <td className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">{formatDate(cart.last_activity)}</td>
                <td className="px-4 py-3">
                  {cart.is_recovered ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-label-sm text-label-sm">Recovered</span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(cart)} className="font-label-sm text-label-sm text-primary hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-on-surface">Cart Details</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-surface-container">
                <X size={18} className="text-on-surface-variant" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-on-surface-variant">Customer</span><p className="font-medium text-on-surface">{selected.customer_name ?? '—'}</p></div>
                <div><span className="text-on-surface-variant">Phone</span><p className="font-medium text-on-surface">{selected.phone ?? '—'}</p></div>
                <div><span className="text-on-surface-variant">Total Value</span><p className="font-medium text-on-surface">₹{selected.total_value.toFixed(0)}</p></div>
                <div><span className="text-on-surface-variant">Last Activity</span><p className="font-medium text-on-surface">{formatDate(selected.last_activity)}</p></div>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between bg-surface-container-low rounded-lg px-3 py-2">
                      <span className="font-body-md text-body-md text-on-surface">{item.name} ({item.unit})</span>
                      <span className="font-body-md text-body-md text-on-surface-variant">×{item.quantity} — ₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
