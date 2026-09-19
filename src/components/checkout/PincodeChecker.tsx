'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useAuthPromptStore } from '@/store/authPromptStore'

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
}

interface Props {
  pincode: string
  onResult?: (result: PincodeResult | null) => void
  isBulkSelected?: boolean
  onBulkToggle?: (v: boolean) => void
}

export default function PincodeChecker({ pincode, onResult, isBulkSelected, onBulkToggle }: Props) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'done' | 'gated'>('idle')
  const [result, setResult] = useState<PincodeResult | null>(null)
  const lastPincode = useRef('')
  const { isSignedIn, isLoaded } = useSupabaseUser()
  const showAuthPrompt = useAuthPromptStore((s) => s.show)

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setStatus('idle')
      setResult(null)
      onResult?.(null)
      return
    }
    // Session still resolving — wait rather than gate a signed-in user by mistake.
    if (!isLoaded) return
    // Same gate as the header: no verdict for signed-out visitors. Checkout is
    // already auth-gated, so this mainly guards reuse of this component
    // elsewhere and the brief window before the session resolves.
    if (!isSignedIn) {
      lastPincode.current = ''
      setStatus('gated')
      setResult(null)
      onResult?.(null)
      return
    }
    if (pincode === lastPincode.current) return
    lastPincode.current = pincode

    setStatus('checking')
    fetch(`/api/pincodes/check?pincode=${pincode}`)
      .then((r) => r.json())
      .then((data: PincodeResult) => {
        setResult(data)
        setStatus('done')
        onResult?.(data)
        if (!data.serviceable) {
          // Fire-and-forget: log unserviceable attempt for admin visibility
          void fetch('/api/unserviceable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pincode, source: 'checkout' }),
          })
        }
      })
      .catch(() => {
        setStatus('idle')
        onResult?.(null)
      })
  }, [pincode, onResult, isLoaded, isSignedIn])

  if (status === 'idle') return null

  if (status === 'gated') {
    return (
      <button
        type="button"
        onClick={() => showAuthPrompt('pincode')}
        className="flex items-center gap-2 mt-2 text-left"
      >
        <LogIn size={14} className="text-primary flex-shrink-0" strokeWidth={2.5} />
        <span className="font-label-sm text-label-sm text-primary underline underline-offset-4">
          Log in to check delivery availability
        </span>
      </button>
    )
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Loader2 size={14} className="animate-spin text-on-surface-variant" />
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Checking delivery availability…
        </span>
      </div>
    )
  }

  if (!result) return null

  if (result.serviceable) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <CheckCircle2 size={15} className="text-success flex-shrink-0" />
        <span className="font-label-sm text-label-sm text-success">
          Delivery available
          {result.city ? ` to ${result.city}${result.state ? `, ${result.state}` : ''}` : ''}
          {result.delivery_days ? ` (${result.delivery_days} day${result.delivery_days > 1 ? 's' : ''})` : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <XCircle size={15} className="text-error flex-shrink-0" />
        <span className="font-label-sm text-label-sm text-error">
          Delivery not available to this pincode
        </span>
      </div>

      {/* Bulk order option */}
      <div className="bg-secondary-container/40 border border-secondary/30 rounded-lg p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            className={cn(
              'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              isBulkSelected ? 'bg-primary border-primary' : 'border-outline',
            )}
            onClick={() => onBulkToggle?.(!isBulkSelected)}
          >
            {isBulkSelected && (
              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-on-primary">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div onClick={() => onBulkToggle?.(!isBulkSelected)}>
            <p className="font-label-sm text-label-sm text-on-surface">Place as Bulk Order</p>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Our team will contact you to arrange delivery for bulk orders to unserviceable areas.
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}
