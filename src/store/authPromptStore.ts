'use client'

import { create } from 'zustand'

/**
 * Reason the login prompt was raised. Drives the copy shown in the modal so a
 * pincode gate doesn't say "log in to add to cart".
 */
export type AuthPromptReason = 'cart' | 'wishlist' | 'pincode'

/** Controls the "please log in" popup shown when a guest hits a gated action. */
interface AuthPromptStore {
  open: boolean
  reason: AuthPromptReason
  /**
   * Where to send the visitor after login. Defaults to the current path, but a
   * pincode gate appends its own query (?pincode=…) so the check resumes on
   * return instead of making them type it again.
   */
  next: string | null
  show: (reason?: AuthPromptReason, next?: string) => void
  hide: () => void
}

export const useAuthPromptStore = create<AuthPromptStore>((set) => ({
  open: false,
  reason: 'cart',
  next: null,
  show: (reason = 'cart', next) => set({ open: true, reason, next: next ?? null }),
  hide: () => set({ open: false }),
}))
