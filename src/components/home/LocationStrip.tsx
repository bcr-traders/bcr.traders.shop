'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  MapPin, ChevronDown, ChevronUp, Search,
  CheckCircle2, XCircle, Loader2, X,
} from 'lucide-react'
import { useT } from '@/hooks/useT'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div ref={panelRef} className="px-4 max-w-7xl mx-auto w-full flex flex-col gap-3 relative z-30">
      {/* ── Location strip row ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-surface-container-low/40 hover:bg-surface border border-table-border/60 hover:border-primary/40 text-[11px] sm:text-xs text-on-surface-variant transition-all duration-300 active:scale-95 shadow-3xs hover:shadow-[0_4px_16px_rgba(38,23,12,0.08)] relative overflow-hidden"
          aria-expanded={open}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
          
          {/* Active status pulse dot */}
          <span className="relative flex h-2.5 w-2.5 z-10">
            {saved?.result.serviceable === false ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              </>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </>
            )}
          </span>
          
          <MapPin size={14} className="text-secondary/80 group-hover:text-primary transition-colors z-10" />
          <span className="font-medium tracking-wide z-10">
            Delivering to:{' '}
            <span className={`font-black ${stripColor}`}>{stripLabel}</span>
          </span>
          <span className="text-secondary/55 group-hover:text-primary/70 transition-colors z-10 ml-1">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
      </div>

      {/* ── Pincode panel with Framer Motion ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute left-4 top-12 bg-surface/85 backdrop-blur-3xl border border-white/20 rounded-3xl p-5 shadow-[0_12px_40px_rgba(38,23,12,0.12)] flex flex-col gap-4 z-40 max-w-sm w-[calc(100%-2rem)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Enter your pincode</span>
              <button 
                onClick={() => setOpen(false)} 
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all duration-200 shadow-3xs"
              >
                <X size={14} strokeWidth={2.5} />
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
                className="w-full px-4 py-3 pr-12 border border-table-border/80 rounded-2xl text-sm font-bold text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors bg-surface-container-low shadow-inner"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {status === 'checking' && (
                  <Loader2 size={18} className="animate-spin text-primary" />
                )}
                {status === 'done' && result?.serviceable && (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                )}
                {status === 'done' && !result?.serviceable && (
                  <XCircle size={18} className="text-error" />
                )}
              </div>
            </div>

            {/* Result feedback */}
            {status === 'done' && result && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-xs shadow-sm ${
                  result.serviceable
                    ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20'
                    : 'bg-gradient-to-br from-error/10 to-error/5 border border-error/20'
                }`}
              >
                {result.serviceable ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-600 text-[13px]">Delivery available!</p>
                      <p className="text-[11px] font-medium text-emerald-600/80 mt-1">
                        We deliver to{' '}
                        <span className="font-bold">{[result.area, result.city, result.state].filter(Boolean).join(', ')}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-error text-[13px]">Not serviceable yet</p>
                      <p className="text-[11px] font-medium text-error/80 mt-1">
                        We don&apos;t deliver to pincode {input} currently. You can place a bulk order and we&apos;ll contact you.
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Helper text */}
            {status === 'idle' && (
              <p className="text-[11px] font-medium text-on-surface-variant/70 leading-relaxed px-1">
                Enter your 6-digit pincode to check delivery availability in your area.
              </p>
            )}

            {/* Clear saved pincode */}
            {saved && (
              <button
                onClick={handleClearSaved}
                className="text-[11px] font-black tracking-wide text-primary hover:text-secondary underline underline-offset-4 self-start px-1 mt-1 transition-colors"
              >
                Reset saved location
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline search bar (MD: hidden because header has it, show on mobile for quick access) ── */}
      <Link
        href="/search"
        className="group relative flex md:hidden items-center gap-3 px-5 py-3.5 bg-surface-container-low/40 hover:bg-surface border border-table-border/60 hover:border-primary/40 rounded-2xl text-on-surface-variant/80 text-sm transition-all duration-300 shadow-3xs hover:shadow-md overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        <Search size={16} className="text-primary/70 group-hover:text-primary transition-colors duration-300 relative z-10" />
        <span className="font-medium group-hover:text-primary transition-colors duration-300 relative z-10">
          {t('nav.searchPlaceholder')}
        </span>
      </Link>
    </div>
  )
}
