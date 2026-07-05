'use client'

import { useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  length?: number
  autoFocus?: boolean
  /** Called when all boxes are filled (e.g. to auto-submit). */
  onComplete?: (val: string) => void
}

/**
 * OTP input rendered as segmented boxes but backed by a SINGLE hidden
 * `autocomplete="one-time-code"` field. A single field is what makes OS/keyboard
 * SMS auto-fill (iOS + Android Gboard) and the Web OTP API actually populate the
 * whole code — segmented boxes with `maxLength={1}` truncate the autofill to one
 * digit, so the code "arrives but doesn't fill". Paste and typing flow through
 * the same field, and the value is fully controlled so programmatic fills work.
 */
export default function OtpInput({ value, onChange, length = 4, autoFocus, onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')
  const activeIndex = Math.min(value.length, length - 1)

  const commit = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      {/* The real, single input — receives SMS auto-fill / paste / typing. */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => commit(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        aria-label="One-time code"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer text-transparent bg-transparent caret-transparent outline-none opacity-0"
      />

      {/* Visual segmented boxes (mirror the input value). */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
        {digits.map((d, i) => {
          const isActive = focused && i === activeIndex
          return (
            <div
              key={i}
              className={`flex w-full aspect-square min-w-0 items-center justify-center rounded-2xl border-2 bg-surface-card text-2xl font-black text-primary transition-all duration-200 ${
                d ? 'border-primary/60' : 'border-table-border'
              } ${isActive ? 'border-primary shadow-[0_0_0_4px_rgba(28,19,10,0.08)] -translate-y-0.5' : ''}`}
            >
              {d || (isActive ? <span className="h-6 w-0.5 animate-pulse rounded-full bg-primary" /> : '')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
