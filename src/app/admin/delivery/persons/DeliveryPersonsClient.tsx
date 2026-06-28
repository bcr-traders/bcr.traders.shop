'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type DeliveryPerson = {
  id: string
  name: string
  phone: string
  clerk_user_id: string
  role: string
  created_at: string
}

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DeliveryPersonsClient({
  initialPersons,
}: {
  initialPersons: DeliveryPerson[]
}) {
  const [persons, setPersons] = useState(initialPersons)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: 'delivery',
        permissions: [],
      }),
    })
    if (res.ok) {
      const d = await res.json() as DeliveryPerson
      setPersons(prev => [d, ...prev])
      setForm({ name: '', phone: '' })
      setShowAdd(false)
      showToast('Delivery person added')
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'Failed to add delivery person')
    }
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from delivery team?`)) return
    const res = await fetch(`/api/admin-profiles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPersons(prev => prev.filter(p => p.id !== id))
      showToast(`${name} removed`)
    }
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-3xl mx-auto w-full pb-12 space-y-gutter">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Delivery Team
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {persons.length} delivery {persons.length === 1 ? 'person' : 'persons'} registered
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/delivery/assignments"
            className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-full font-body-md text-body-md hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">assignment</span>
            Assignments
          </Link>
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Person
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface rounded-2xl border border-primary/20 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-primary">New Delivery Person</h3>
            <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ravi Kumar"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">
                Phone <span className="text-error">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
                className={inputCls}
              />
            </div>
          </div>
          {error && (
            <p className="font-label-sm text-label-sm text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-outline-variant rounded-full font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {saving ? 'Adding…' : 'Add Person'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {persons.length === 0 && !showAdd ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 0" }}>delivery_dining</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">No delivery persons yet.</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            Add delivery persons to enable order assignments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {persons.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-outline-variant/50 hover:shadow-sm transition-shadow"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  {p.name[0]?.toUpperCase() ?? '?'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface font-medium truncate">{p.name}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{p.phone}</p>
              </div>

              {/* Joined */}
              <p className="font-label-sm text-label-sm text-on-surface-variant hidden md:block flex-shrink-0">
                Joined {fmtDate(p.created_at)}
              </p>

              {/* Role badge */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex-shrink-0">
                <span className="material-symbols-outlined text-[12px]">delivery_dining</span>
                Delivery
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/admin/profiles/${p.id}`}
                  className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                  title="Edit profile"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </Link>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="flex items-start gap-3 px-4 py-4 bg-surface-container rounded-2xl border border-outline-variant/30">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px] flex-shrink-0 mt-0.5">info</span>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Delivery persons can log in at{' '}
          <code className="bg-surface px-1 py-0.5 rounded text-sm">/delivery/dashboard</code>
          {' '}to view and manage their assigned orders.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
