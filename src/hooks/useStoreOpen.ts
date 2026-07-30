'use client'

import { useEffect, useState } from 'react'
import { isOrderingOpen } from '@/lib/store-hours'

/**
 * Whether ordering is currently open (IST business hours). Re-checks every 30s
 * so a customer sitting on the cart/checkout across the open/close boundary
 * sees it flip without a reload.
 *
 * Starts `true` and corrects on mount: the server and first client render agree
 * (no hydration mismatch), and the order route enforces the real rule anyway,
 * so a brief optimistic "open" can never let a late order through.
 */
export function useStoreOpen(): boolean {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const check = () => setOpen(isOrderingOpen())
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return open
}
