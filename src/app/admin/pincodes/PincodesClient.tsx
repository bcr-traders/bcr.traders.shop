'use client'

import { useState, useRef } from 'react'
import { Loader2, Search, Download, Plus, Trash2, List, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PincodeRow } from './page'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors'

interface Props { initialRows: PincodeRow[] }

export default function PincodesClient({ initialRows }: Props) {
  const [rows, setRows] = useState<PincodeRow[]>(initialRows)
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ pincode: '', area_name: '', city: '', state: '', delivery_days: '2' })
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [openCities, setOpenCities] = useState<Set<string>>(new Set())
  const csvRef = useRef<HTMLInputElement>(null)

  const filtered = rows.filter((r) =>
    r.pincode.includes(search) ||
    r.city.toLowerCase().includes(search.toLowerCase()) ||
    (r.area_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  // Group filtered rows by city for map view
  const byCity = filtered.reduce<Record<string, PincodeRow[]>>((acc, r) => {
    const key = r.city || 'Unknown'
    ;(acc[key] ??= []).push(r)
    return acc
  }, {})
  const cityEntries = Object.entries(byCity).sort(([a], [b]) => a.localeCompare(b))

  const toggleCity = (city: string) =>
    setOpenCities((prev) => {
      const next = new Set(prev)
      next.has(city) ? next.delete(city) : next.add(city)
      return next
    })

  const expandAll = () => setOpenCities(new Set(cityEntries.map(([c]) => c)))
  const collapseAll = () => setOpenCities(new Set())

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) { setError('Enter a valid 6-digit pincode.'); return }
    if (!form.city.trim()) { setError('City is required.'); return }
    setError('')
    setIsSaving(true)
    try {
      const res = await fetch('/api/pincodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, delivery_days: Number(form.delivery_days) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows((prev) => [data, ...prev])
      setForm({ pincode: '', area_name: '', city: '', state: '', delivery_days: '2' })
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pincode')
    } finally { setIsSaving(false) }
  }

  const handleToggle = async (row: PincodeRow) => {
    const res = await fetch(`/api/pincodes/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    })
    if (res.ok) setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, is_active: !r.is_active } : r))
  }

  const handleDelete = async (row: PincodeRow) => {
    if (!confirm(`Delete pincode ${row.pincode}?`)) return
    const res = await fetch(`/api/pincodes/${row.id}`, { method: 'DELETE' })
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  const handleBulkCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').slice(1).filter(Boolean)
    const toInsert = lines.map((line) => {
      const [pincode, area_name, city, state, delivery_days] = line.split(',').map((s) => s.trim())
      return { pincode, area_name: area_name || null, city, state: state || 'Odisha', delivery_days: Number(delivery_days) || 2 }
    }).filter((r) => /^\d{6}$/.test(r.pincode) && r.city)

    if (!toInsert.length) { alert('No valid rows found. CSV format: pincode,area_name,city,state,delivery_days'); return }

    const res = await fetch('/api/pincodes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: toInsert }),
    })
    if (res.ok) { const data = await res.json(); setRows((prev) => [...data.inserted, ...prev]) }
    e.target.value = ''
  }

  const exportCSV = () => {
    const header = 'pincode,area_name,city,state,delivery_days,is_active'
    const csvData = rows.map((r) =>
      `${r.pincode},${r.area_name ?? ''},${r.city},${r.state},${r.delivery_days},${r.is_active}`
    ).join('\n')
    const blob = new Blob([header + '\n' + csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pincodes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Serviceable Pincodes</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{rows.length} pincodes configured</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-full border border-outline-variant overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-4 py-2 font-label-sm text-label-sm transition-colors', view === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container')}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={cn('flex items-center gap-1.5 px-4 py-2 font-label-sm text-label-sm transition-colors border-l border-outline-variant', view === 'map' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container')}
            >
              <Map size={13} /> By City
            </button>
          </div>
          <button onClick={() => csvRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[16px]">upload</span> Import CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleBulkCSV} />
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={15} /> Add Pincode
          </button>
        </div>
      </div>

      {/* Add form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-5 space-y-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Add Pincode</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Pincode *</label>
              <input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="751001" maxLength={6} className={inputCls} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Area Name</label>
              <input value={form.area_name} onChange={(e) => setForm((f) => ({ ...f, area_name: e.target.value }))} placeholder="Bhubaneswar Central" className={inputCls} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">City *</label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bhubaneswar" className={inputCls} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">State</label>
              <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Odisha" className={inputCls} />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Delivery Days</label>
              <input type="number" min={1} max={7} value={form.delivery_days} onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))} className={inputCls} />
            </div>
          </div>
          {error && <p className="font-label-sm text-label-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-60">
              {isSaving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => { setIsAdding(false); setError('') }} className="px-5 py-2.5 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pincode, city, or area…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/30">
                {['Pincode', 'Area', 'City', 'State', 'Days', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center font-body-md text-body-md text-on-surface-variant">No pincodes found.</td></tr>
              ) : (
                filtered.map((row) => (
                  <PincodeTableRow key={row.id} row={row} onToggle={handleToggle} onDelete={handleDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* City-grouped (map) view */}
      {view === 'map' && (
        <div className="space-y-3">
          {cityEntries.length === 0 ? (
            <p className="text-center font-body-md text-body-md text-on-surface-variant py-12">No pincodes found.</p>
          ) : (
            <>
              <div className="flex gap-3 justify-end">
                <button onClick={expandAll} className="font-label-sm text-label-sm text-primary hover:underline">Expand all</button>
                <button onClick={collapseAll} className="font-label-sm text-label-sm text-on-surface-variant hover:underline">Collapse all</button>
              </div>
              {cityEntries.map(([city, cityRows]) => {
                const active = cityRows.filter((r) => r.is_active).length
                const isOpen = openCities.has(city)
                return (
                  <div key={city} className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Map size={16} className="text-primary shrink-0" />
                        <span className="font-headline-md text-headline-md text-on-surface">{city}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                          {cityRows.length} pincode{cityRows.length !== 1 ? 's' : ''}
                        </span>
                        {active < cityRows.length && (
                          <span className="font-label-sm text-label-sm text-error bg-error/10 px-2 py-0.5 rounded-full">
                            {cityRows.length - active} inactive
                          </span>
                        )}
                      </div>
                      <span className={cn('text-on-surface-variant transition-transform', isOpen ? 'rotate-180' : '')}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-outline-variant/30">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-surface-container-low">
                              {['Pincode', 'Area', 'Days', 'Active', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {cityRows.map((row) => (
                              <tr key={row.id} className="hover:bg-surface-container-low transition-colors">
                                <td className="px-4 py-3 font-label-sm text-label-sm text-primary">{row.pincode}</td>
                                <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{row.area_name ?? '—'}</td>
                                <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{row.delivery_days}d</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleToggle(row)}
                                    className={cn('relative w-9 h-5 rounded-full transition-colors', row.is_active ? 'bg-primary' : 'bg-outline-variant')}
                                  >
                                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', row.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => handleDelete(row)} className="text-error hover:opacity-70 transition-opacity">
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* CSV format hint */}
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        CSV import format: <code className="bg-surface-container px-1 rounded">pincode,area_name,city,state,delivery_days</code>
      </p>
    </div>
  )
}

function PincodeTableRow({
  row,
  onToggle,
  onDelete,
}: {
  row: PincodeRow
  onToggle: (row: PincodeRow) => void
  onDelete: (row: PincodeRow) => void
}) {
  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="px-4 py-3 font-label-sm text-label-sm text-primary">{row.pincode}</td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{row.area_name ?? '—'}</td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{row.city}</td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{row.state}</td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{row.delivery_days}d</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(row)}
          className={cn('relative w-9 h-5 rounded-full transition-colors', row.is_active ? 'bg-primary' : 'bg-outline-variant')}
        >
          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', row.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
        </button>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onDelete(row)} className="text-error hover:opacity-70 transition-opacity">
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  )
}
