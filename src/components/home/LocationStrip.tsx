'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  MapPin, ChevronDown, ChevronUp, Search,
  CheckCircle2, XCircle, Loader2, X,
} from 'lucide-react'
import { useT } from '@/hooks/useT'

interface PincodeResult {
  serviceable: boolean
  area?: string | null
  city?: string | null
  state?: string | null
}

const STORAGE_KEY = 'bcr_pincode'

function useSavedPincode() {
  const [saved, setSaved] = useState<{ pincode: string; result: PincodeResult } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])
  const save = (pincode: string, result: PincodeResult) => {
    const entry = { pincode, result }
    setSaved(entry)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)) } catch {}
  }
  const clear = () => {
    setSaved(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }
  return { saved, save, clear }
}

export default function LocationStrip() {
  const { t } = useT()
  const { saved, save, clear } = useSavedPincode()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'done'>('idle')
  const [result, setResult] = useState<PincodeResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // auto-focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
    else { setInput(''); setStatus('idle'); setResult(null) }
  }, [open])

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const checkPincode = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return
    setStatus('checking')
    setResult(null)
    try {
      const res = await fetch(`/api/pincodes/check?pincode=${pin}`)
      const data: PincodeResult = await res.json()
      setResult(data)
      setStatus('done')
      save(pin, data)
      if (!data.serviceable) {
        void fetch('/api/unserviceable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode: pin }),
        })
      }
    } catch {
      setStatus('idle')
    }
  }, [save])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setInput(val)
    setStatus('idle')
    setResult(null)
    if (val.length === 6) checkPincode(val)
  }

  const handleClearSaved = (e: React.MouseEvent) => {
    e.stopPropagation()
    clear()
    setOpen(false)
  }

  // What to show in the strip
  const stripLabel = saved?.result.serviceable
    ? `${saved.result.city ?? saved.result.area ?? 'Your location'} — ${saved.pincode}`
    : saved
    ? `Pincode ${saved.pincode} — not serviceable`
    : 'Cuttack Godown — 753001'

  const stripColor = saved?.result.serviceable === false
    ? 'text-error'
    : 'text-primary'

  return (
    <div ref={panelRef} className="px-4 pt-3 flex flex-col gap-3">
      {/* ── Location strip row ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-on-surface-variant w-full text-left"
        aria-expanded={open}
      >
        <MapPin size={16} className="text-outline flex-shrink-0" />
        <span>
          Delivering to:{' '}
          <span className={`font-bold ${stripColor}`}>{stripLabel}</span>
        </span>
        <span className="ml-auto flex-shrink-0 text-outline">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* ── Pincode panel ── */}
      {open && (
        <div className="bg-surface-card border border-table-border rounded-2xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-on-surface">Enter your pincode</span>
            <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={input}
              onChange={handleChange}
              placeholder="e.g. 753001"
              className="w-full px-4 py-3 pr-12 border border-table-border rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors bg-surface-container-low"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {status === 'checking' && (
                <Loader2 size={18} className="animate-spin text-primary" />
              )}
              {status === 'done' && result?.serviceable && (
                <CheckCircle2 size={18} className="text-[#0C831F]" />
              )}
              {status === 'done' && !result?.serviceable && (
                <XCircle size={18} className="text-error" />
              )}
            </div>
          </div>

          {/* Result feedback */}
          {status === 'done' && result && (
            <div
              className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                result.serviceable
                  ? 'bg-[#0C831F]/10 border border-[#0C831F]/30'
                  : 'bg-error/10 border border-error/30'
              }`}
            >
              {result.serviceable ? (
                <>
                  <CheckCircle2 size={16} className="text-[#0C831F] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0C831F]">Delivery available!</p>
                    <p className="text-xs text-[#0C831F]/80 mt-0.5">
                      We deliver to{' '}
                      {[result.area, result.city, result.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-error">Not serviceable yet</p>
                    <p className="text-xs text-error/80 mt-0.5">
                      We don&apos;t deliver to pincode {input} currently. You can place a bulk order and we&apos;ll contact you.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Helper text */}
          {status === 'idle' && (
            <p className="text-xs text-on-surface-variant">
              Enter your 6-digit pincode to check delivery availability in your area.
            </p>
          )}

          {/* Clear saved pincode */}
          {saved && (
            <button
              onClick={handleClearSaved}
              className="text-xs text-on-surface-variant underline underline-offset-2 hover:text-primary transition-colors self-start"
            >
              Reset saved location
            </button>
          )}
        </div>
      )}

      {/* ── Inline search bar ── */}
      <Link
        href="/search"
        className="flex items-center gap-3 px-4 py-3 bg-surface-card border border-table-border rounded-xl text-on-surface-variant text-sm hover:border-outline transition-colors shadow-sm"
      >
        <Search size={16} className="text-outline flex-shrink-0" />
        <span>{t('nav.searchPlaceholder')}</span>
      </Link>
    </div>
  )
}
