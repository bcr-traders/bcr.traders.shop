'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/database.types'

type SortField = 'name' | 'price' | 'stock_quantity' | 'created_at'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'
type StockFilter = 'all' | 'in_stock' | 'out_of_stock'

export default function ProductsClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[]
  categories: { id: string; name: string }[]
}) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockDraft, setStockDraft] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c.name])),
    [categories],
  )

  const filtered = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q),
      )
    }
    if (categoryFilter !== 'all') list = list.filter(p => p.category_id === categoryFilter)
    if (statusFilter === 'active') list = list.filter(p => p.is_active)
    if (statusFilter === 'inactive') list = list.filter(p => !p.is_active)
    if (stockFilter === 'in_stock') list = list.filter(p => p.stock_quantity > 0)
    if (stockFilter === 'out_of_stock') list = list.filter(p => p.stock_quantity === 0)
    if (featuredOnly) list = list.filter(p => p.is_featured)

    list.sort((a, b) => {
      const av = a[sortField] as string | number
      const bv = b[sortField] as string | number
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [products, search, categoryFilter, statusFilter, stockFilter, featuredOnly, sortField, sortDir])

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(p => p.id)))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function patchProduct(id: string, data: Partial<Product>) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function saveStock(id: string) {
    const qty = parseInt(stockDraft, 10)
    if (!isNaN(qty) && qty >= 0) await patchProduct(id, { stock_quantity: qty })
    setEditingStockId(null)
  }

  async function bulkAction(action: 'activate' | 'deactivate' | 'delete') {
    const ids = [...selectedIds]
    if (action === 'delete' && !confirm(`Permanently delete ${ids.length} product(s)?`)) return

    const res = await fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids }),
    })

    if (res.ok) {
      if (action === 'delete') {
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)))
      } else {
        const isActive = action === 'activate'
        setProducts(prev =>
          prev.map(p => selectedIds.has(p.id) ? { ...p, is_active: isActive } : p),
        )
      }
      setSelectedIds(new Set())
    }
  }

  function exportCSV() {
    const headers = ['SKU', 'Name', 'Category', 'Price', 'MRP', 'Unit', 'Stock', 'Featured', 'Active', 'Created']
    const rows = filtered.map(p => [
      p.sku ?? '',
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(categoryMap[p.category_id ?? ''] ?? '').replace(/"/g, '""')}"`,
      p.price,
      p.mrp ?? '',
      p.unit,
      p.stock_quantity,
      p.is_featured ? 'Yes' : 'No',
      p.is_active ? 'Yes' : 'No',
      new Date(p.created_at).toLocaleDateString('en-IN'),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `bcr-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/products/bulk-import', { method: 'POST', body: form })
    if (res.ok) window.location.reload()
    setImporting(false)
    if (importRef.current) importRef.current.value = ''
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Products
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {products.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[220px] flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-full border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-surface-container rounded-full border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2 bg-surface-container rounded-full border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value as StockFilter)}
          className="px-4 py-2 bg-surface-container rounded-full border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
        >
          <option value="all">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        <button
          onClick={() => setFeaturedOnly(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full font-body-md text-body-md transition-colors',
            featuredOnly
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high',
          )}
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: featuredOnly ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
          Featured
        </button>
      </div>

      {/* ── Bulk Actions Bar ── */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary-container rounded-xl">
          <p className="font-body-md text-body-md text-on-primary-container flex-1">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => bulkAction('activate')}
            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-label-sm text-label-sm hover:bg-green-200 transition-colors"
          >
            Activate
          </button>
          <button
            onClick={() => bulkAction('deactivate')}
            className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
          >
            Deactivate
          </button>
          <button
            onClick={() => bulkAction('delete')}
            className="px-3 py-1.5 bg-error/10 text-error rounded-full font-label-sm text-label-sm hover:bg-error/20 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-full hover:bg-on-primary-container/10 transition-colors"
            aria-label="Clear selection"
          >
            <span className="material-symbols-outlined text-on-primary-container text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.08)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary rounded"
                  />
                </th>
                <th className="py-3 px-4 w-14 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Image
                </th>
                <th className="py-3 px-4">
                  <SortBtn label="SKU" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-3 px-4">
                  <SortBtn label="Name" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Category
                </th>
                <th className="py-3 px-4">
                  <SortBtn label="Price" field="price" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  MRP
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Unit
                </th>
                <th className="py-3 px-4">
                  <SortBtn label="Stock" field="stock_quantity" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Featured
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Active
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center font-body-md text-body-md text-on-surface-variant">
                    No products match your filters.
                  </td>
                </tr>
              ) : filtered.map(product => (
                <tr
                  key={product.id}
                  className={cn(
                    'border-b border-outline-variant/20 last:border-0 transition-colors',
                    selectedIds.has(product.id)
                      ? 'bg-primary-container/20'
                      : 'hover:bg-surface-container-low',
                  )}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </td>

                  {/* Image */}
                  <td className="py-3 px-4">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-[16px]">image</span>
                      </div>
                    )}
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant">
                    {product.sku ?? '—'}
                  </td>

                  {/* Name */}
                  <td className="py-3 px-4 max-w-[180px]">
                    <p className="font-body-md text-body-md text-on-surface font-medium truncate">
                      {product.name}
                    </p>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                    {categoryMap[product.category_id ?? ''] ?? '—'}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-semibold">
                    ₹{product.price.toLocaleString('en-IN')}
                  </td>

                  {/* MRP */}
                  <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                    {product.mrp ? `₹${product.mrp}` : '—'}
                  </td>

                  {/* Unit */}
                  <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">
                    {product.unit}
                  </td>

                  {/* Stock (inline edit) */}
                  <td className="py-3 px-4">
                    {editingStockId === product.id ? (
                      <input
                        type="number"
                        value={stockDraft}
                        autoFocus
                        min={0}
                        onChange={e => setStockDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveStock(product.id)
                          if (e.key === 'Escape') setEditingStockId(null)
                        }}
                        onBlur={() => saveStock(product.id)}
                        className="w-16 px-2 py-1 border border-primary rounded-lg font-body-md text-body-md text-on-surface focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStockId(product.id)
                          setStockDraft(product.stock_quantity.toString())
                        }}
                        title="Click to edit stock"
                        className={cn(
                          'font-body-md text-body-md px-2 py-0.5 rounded-lg hover:bg-surface-container-high transition-colors',
                          product.stock_quantity === 0
                            ? 'text-error font-semibold'
                            : product.stock_quantity < 10
                              ? 'text-amber-600 font-semibold'
                              : 'text-on-surface',
                        )}
                      >
                        {saving[product.id] ? '…' : product.stock_quantity}
                      </button>
                    )}
                  </td>

                  {/* Featured toggle */}
                  <td className="py-3 px-4">
                    <Toggle
                      checked={product.is_featured}
                      disabled={!!saving[product.id]}
                      onChange={() => patchProduct(product.id, { is_featured: !product.is_featured })}
                    />
                  </td>

                  {/* Active toggle */}
                  <td className="py-3 px-4">
                    <Toggle
                      checked={product.is_active}
                      disabled={!!saving[product.id]}
                      onChange={() => patchProduct(product.id, { is_active: !product.is_active })}
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={`/admin/products/${product.id}`}
                        title="Edit product"
                        className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/faq`}
                        title="Manage FAQs"
                        className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">quiz</span>
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/reviews`}
                        title="Manage reviews"
                        className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">reviews</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked, disabled, onChange,
}: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-surface-container-highest',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1',
        )}
      />
    </button>
  )
}

// ── Sort button ───────────────────────────────────────────────────────────────

function SortBtn({
  label, field, current, dir, onSort,
}: {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = current === field
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 font-label-sm text-label-sm uppercase tracking-wider hover:text-primary transition-colors',
        active ? 'text-primary' : 'text-on-surface-variant',
      )}
    >
      {label}
      <span className="material-symbols-outlined text-[13px]">
        {active ? (dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
  )
}
