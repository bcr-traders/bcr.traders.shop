'use client'

import { useState } from 'react'
import { Download, Check, MessageSquare } from 'lucide-react'
import type { UnserviceableAttempt } from './page'

interface Props { initialRows: UnserviceableAttempt[] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function UnserviceableClient({ initialRows }: Props) {
  const [rows, setRows] = useState<UnserviceableAttempt[]>(initialRows)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [filterContacted, setFilterContacted] = useState<'all' | 'yes' | 'no'>('all')

  const filtered = rows.filter((r) => {
    if (filterContacted === 'yes' && !r.is_contacted) return false
    if (filterContacted === 'no' && r.is_contacted) return false
    return true
  })

  const markContacted = async (row: UnserviceableAttempt) => {
    const res = await fetch(`/api/unserviceable/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_contacted: true }),
    })
    if (res.ok) setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, is_contacted: true } : r))
  }

  const saveNote = async (id: string) => {
    const res = await fetch(`/api/unserviceable/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: noteText }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, notes: noteText } : r))
      setEditingNote(null)
    }
  }

  const exportCSV = () => {
    const header = 'Date,Customer,Phone,Pincode,City,Cart Value,Contacted,Notes'
    const csvRows = rows.map((r) =>
      `${formatDate(r.created_at)},${r.customer_name ?? '—'},${r.phone ?? '—'},${r.pincode},${r.city ?? '—'},₹${r.cart_value ?? 0},${r.is_contacted ? 'Yes' : 'No'},"${r.notes ?? ''}"`
    ).join('\n')
    const blob = new Blob([header + '\n' + csvRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'unserviceable.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Unserviceable Attempts</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {rows.filter((r) => !r.is_contacted).length} pending contact · {rows.length} total
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-surface-container rounded-full p-1 w-fit">
        {(['all', 'no', 'yes'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterContacted(v)}
            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${filterContacted === v ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {v === 'all' ? 'All' : v === 'no' ? 'Pending' : 'Contacted'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/30">
              {['Date', 'Customer', 'Phone', 'Pincode', 'City', 'Cart Value', 'Status', 'Notes', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center font-body-md text-body-md text-on-surface-variant">No records found.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{row.customer_name ?? '—'}</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{row.phone ?? '—'}</td>
                <td className="px-4 py-3 font-label-sm text-label-sm text-primary">{row.pincode}</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">{row.city ?? '—'}</td>
                <td className="px-4 py-3 font-body-md text-body-md text-on-surface">₹{row.cart_value?.toFixed(0) ?? '0'}</td>
                <td className="px-4 py-3">
                  {row.is_contacted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-label-sm text-label-sm">
                      <Check size={11} /> Contacted
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  {editingNote === row.id ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-outline-variant rounded focus:outline-none focus:border-primary"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNote(row.id); if (e.key === 'Escape') setEditingNote(null) }}
                      />
                      <button onClick={() => saveNote(row.id)} className="text-primary text-xs font-medium">Save</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNote(row.id); setNoteText(row.notes ?? '') }}
                      className="text-left font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors line-clamp-1 w-full"
                    >
                      {row.notes ? row.notes : <span className="flex items-center gap-1 opacity-50"><MessageSquare size={12} />Add note</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!row.is_contacted && (
                    <button
                      onClick={() => markContacted(row)}
                      className="font-label-sm text-label-sm text-primary hover:underline whitespace-nowrap"
                    >
                      Mark contacted
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
