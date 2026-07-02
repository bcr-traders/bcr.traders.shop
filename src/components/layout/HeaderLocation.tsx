'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, ChevronDown, CheckCircle2, XCircle, Loader2, X,
} from 'lucide-react'
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

export default function HeaderLocation({ className = '' }: { className?: string }) {
  const { saved, save, clear } = useSavedPincode()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'done'>('idle')
  const [result, setResult] = useState<PincodeResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
    else { setInput(''); setStatus('idle'); setResult(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
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

  const titleLine = saved?.result.serviceable
    ? `Delivering to ${saved.result.city ?? saved.result.area ?? 'your area'}`
    : saved
    ? 'Not serviceable here'
    : 'Select delivery location'

  const subLine = saved
    ? `${[saved.result.area, saved.result.city, saved.result.state].filter(Boolean).join(', ') || 'Pincode'} — ${saved.pincode}`
    : 'Tap to check your pincode'

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left group"
        aria-expanded={open}
      >
        <MapPin size={20} strokeWidth={2.5} className="text-primary flex-shrink-0" />
        <span className="flex flex-col leading-tight max-w-[220px]">
          <span className="text-sm font-black text-primary truncate">{titleLine}</span>
          <span className="text-xs font-medium text-on-surface-variant/70 truncate">{subLine}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-on-surface-variant/60 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-3 bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xl flex flex-col gap-4 z-50 w-[320px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Enter your pincode</span>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

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
                className="w-full px-4 py-3 pr-12 border border-table-border/80 rounded-xl text-sm font-bold text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors bg-surface-container-low"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 size={18} className="animate-spin text-primary" />}
                {status === 'done' && result?.serviceable && <CheckCircle2 size={18} className="text-emerald-500" />}
                {status === 'done' && !result?.serviceable && <XCircle size={18} className="text-error" />}
              </div>
            </div>

            {status === 'done' && result && (
              <div
                className={`flex items-start gap-3 rounded-xl px-4 py-3 text-xs ${
                  result.serviceable
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-error/10 border border-error/20'
                }`}
              >
                {result.serviceable ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-600 text-[13px]">Delivery available!</p>
                      <p className="text-[11px] font-medium text-emerald-600/80 mt-1">
                        We deliver to <span className="font-bold">{[result.area, result.city, result.state].filter(Boolean).join(', ')}</span>
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
              </div>
            )}

            {status === 'idle' && (
              <p className="text-[11px] font-medium text-on-surface-variant/70 leading-relaxed px-1">
                Enter your 6-digit pincode to check delivery availability in your area.
              </p>
            )}

            {saved && (
              <button
                onClick={handleClearSaved}
                className="text-[11px] font-black tracking-wide text-primary hover:text-secondary underline underline-offset-4 self-start px-1 transition-colors"
              >
                Reset saved location
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
