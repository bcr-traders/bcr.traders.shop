'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database.types'

export default function CategoriesClient({
  initialCategories,
  productCounts,
}: {
  initialCategories: Category[]
  productCounts: Record<string, number>
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [orderDraft, setOrderDraft] = useState('')

  async function patchCategory(id: string, data: Partial<Category>) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteCategory(id: string, name: string) {
    const count = productCounts[id] ?? 0
    const msg = count > 0
      ? `"${name}" has ${count} product(s). Delete anyway?`
      : `Delete category "${name}"?`
    if (!confirm(msg)) return

    setDeleting(id)
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== id))
    }
    setDeleting(null)
  }

  async function saveOrder(id: string) {
    const order = parseInt(orderDraft, 10)
    if (!isNaN(order)) await patchCategory(id, { display_order: order })
    setEditOrderId(null)
  }

  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Categories
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {categories.length} categories
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Category
        </Link>
      </div>

      {/* ── Table ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.08)' }}
      >
        {sorted.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>category</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">No categories yet.</p>
            <Link
              href="/admin/categories/new"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create first category
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-5 w-16">Image</th>
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Slug</th>
                  <th className="py-3 px-5 text-center">Products</th>
                  <th className="py-3 px-5 text-center">Order</th>
                  <th className="py-3 px-5 text-center">Active</th>
                  <th className="py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(cat => (
                  <tr
                    key={cat.id}
                    className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low transition-colors"
                  >
                    {/* Image */}
                    <td className="py-3 px-5">
                      {cat.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.image_url}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                            {cat.icon ?? 'category'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-5">
                      <p className="font-body-md text-body-md text-on-surface font-medium">{cat.name}</p>
                      {cat.name_or && (
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{cat.name_or}</p>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant">
                      {cat.slug}
                    </td>

                    {/* Product count */}
                    <td className="py-3 px-5 text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full font-label-sm text-label-sm',
                        (productCounts[cat.id] ?? 0) > 0
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container text-on-surface-variant',
                      )}>
                        {productCounts[cat.id] ?? 0}
                      </span>
                    </td>

                    {/* Display order (inline edit) */}
                    <td className="py-3 px-5 text-center">
                      {editOrderId === cat.id ? (
                        <input
                          type="number"
                          value={orderDraft}
                          autoFocus
                          min={0}
                          className="w-14 px-2 py-1 border border-primary rounded-lg font-body-md text-body-md text-center focus:outline-none"
                          onChange={e => setOrderDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveOrder(cat.id)
                            if (e.key === 'Escape') setEditOrderId(null)
                          }}
                          onBlur={() => saveOrder(cat.id)}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditOrderId(cat.id); setOrderDraft(cat.display_order.toString()) }}
                          title="Click to edit order"
                          className="font-body-md text-body-md text-on-surface px-2 py-0.5 rounded-lg hover:bg-surface-container-high transition-colors"
                        >
                          {saving[cat.id] ? '…' : cat.display_order}
                        </button>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="py-3 px-5 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cat.is_active}
                        disabled={!!saving[cat.id]}
                        onClick={() => patchCategory(cat.id, { is_active: !cat.is_active })}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
                          cat.is_active ? 'bg-primary' : 'bg-surface-container-highest',
                        )}
                      >
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                          cat.is_active ? 'translate-x-4' : 'translate-x-1',
                        )} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/categories/${cat.id}`}
                          title="Edit"
                          className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        <button
                          onClick={() => deleteCategory(cat.id, cat.name)}
                          disabled={deleting === cat.id}
                          title="Delete"
                          className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {deleting === cat.id ? 'progress_activity' : 'delete'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
