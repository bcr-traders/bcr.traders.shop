'use client'

import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  length?: number
  autoFocus?: boolean
  /** Called when all boxes are filled (e.g. to auto-submit). */
  onComplete?: (val: string) => void
}

/**
 * Segmented OTP input — one box per digit with auto-advance, backspace,
 * arrow-key navigation and paste support. Fully controlled via `value`, so
 * programmatic fills (e.g. Web OTP API) flow in automatically.
 */
export default function OtpInput({ value, onChange, length = 4, autoFocus, onComplete }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return
    // Multi-char (autofill / paste into one box) → fill from this index.
    if (typed.length > 1) {
      const merged = (value.slice(0, i) + typed).slice(0, length)
      commit(merged)
      refs.current[Math.min(i + typed.length, length - 1)]?.focus()
      return
    }
    const arr = [...digits]
    arr[i] = typed
    commit(arr.join(''))
    if (i < length - 1) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = [...digits]
      if (arr[i]) {
        arr[i] = ''
        commit(arr.join(''))
      } else if (i > 0) {
        arr[i - 1] = ''
        commit(arr.join(''))
        refs.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      commit(pasted)
      refs.current[Math.min(pasted.length, length - 1)]?.focus()
    }
  }

  return (
    <div className="flex items-center justify-between gap-2.5 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className={`w-full aspect-square min-w-0 rounded-2xl border-2 bg-surface-card text-center text-2xl font-black text-primary outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(28,19,10,0.08)] focus:-translate-y-0.5 ${
            d ? 'border-primary/60' : 'border-table-border'
          }`}
        />
      ))}
    </div>
  )
}
