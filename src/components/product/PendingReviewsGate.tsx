'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { PendingReviewProduct } from '@/app/api/reviews/pending/route'

/**
 * Consolidated review request.
 *
 * When a customer opens the site with delivered-but-unreviewed products, this
 * shows ONE prompt listing all of them together — each with its own star rating
 * and an optional note — and a single "Submit reviews". It is NOT mandatory and
 * NOT one-popup-per-product: the customer can rate any subset and submit, or
 * skip. A skip (or submit) is persisted server-side, so the prompt follows a
 * controlled reminder rule (see /api/reviews/pending) instead of re-appearing on
 * every visit.
 */
export default function PendingReviewsGate() {
  const [products, setProducts] = useState<PendingReviewProduct[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [hovered, setHovered] = useState<Record<string, number>>({})
  const [bodies, setBodies] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [closed, setClosed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // The endpoint is session-scoped and 401s for a signed-out visitor. Firing
    // it unconditionally logged a console error on every logged-out page load,
    // so wait until the session is resolved and only ask when signed in.
    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    void (async () => {
      // Don't interrupt the brand-new-order celebration — that page owns the
      // screen. The prompt will come up on their next visit.
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') return
      try {
        const res = await fetch('/api/reviews/pending')
        if (!res.ok) return
        const { products } = (await res.json()) as { products: PendingReviewProduct[] }
        if (!cancelled && products?.length) setProducts(products)
      } catch { /* storefront must work regardless */ }
    })()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const open = products.length > 0 && !closed && !done

  // Lock background scroll while the prompt is up.
  useEffect(() => {
    if (!open && !done) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, done])

  const setRating = useCallback((pid: string, v: number) => {
    setRatings((r) => ({ ...r, [pid]: v }))
    setError('')
  }, [])

  const ratedCount = products.filter((p) => (ratings[p.id] ?? 0) > 0).length

  // Skip / Remind me later — persist the dismissal so the reminder rule applies.
  const skip = useCallback(async () => {
    setClosed(true)
    try {
      await fetch('/api/reviews/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      })
    } catch { /* best-effort */ }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rated = products.filter((p) => (ratings[p.id] ?? 0) > 0)
    if (!rated.length) { setError('Please rate at least one product, or tap “Remind me later”.'); return }
    setError('')
    setSubmitting(true)
    try {
      // Submit each rated product through the existing per-product endpoint (which
      // enforces the verified-purchase check). A product the API rejects (403/409)
      // is skipped rather than aborting the whole batch.
      for (const p of rated) {
        try {
          await fetch(`/api/products/${p.id}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: ratings[p.id], body: (bodies[p.id] ?? '').trim() }),
          })
        } catch { /* one failure shouldn't sink the rest */ }
      }
      // Cool the prompt down so any products left unrated don't re-appear on the
      // very next visit (they'll return after the reminder window).
      try {
        await fetch('/api/reviews/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        })
      } catch { /* best-effort */ }
      setDone(true)
      setTimeout(() => { setDone(false); setProducts([]) }, 2200)
    } catch {
      setError('Could not submit your reviews. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || (!open && !done)) return null

  const gate = (
    <AnimatePresence>
      <motion.div
        key="review-gate"
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-gate-title"
      >
        <motion.div
          className="w-full sm:max-w-md bg-surface-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-table-border overflow-hidden max-h-[92dvh] flex flex-col"
          initial={{ y: 40, scale: 0.97, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        >
          <div className="h-1 w-full bg-primary" />

          {done ? (
            <div className="p-8 text-center flex flex-col items-center">
              <motion.div
                className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-4"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <Check size={32} className="text-on-primary" strokeWidth={2.5} />
              </motion.div>
              <p className="text-xl font-black text-primary">Thank you!</p>
              <p className="text-sm font-medium text-on-surface-variant mt-1">
                Your reviews will appear once approved.
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-table-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="review-gate-title" className="text-base font-black text-primary uppercase tracking-wider">
                      Rate your products
                    </h2>
                    <p className="text-[11px] font-medium text-on-surface-variant/70 mt-1">
                      You received {products.length === 1 ? 'this item' : `these ${products.length} items`}. Rate any you like — it&rsquo;s optional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={skip}
                    aria-label="Remind me later"
                    className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <form
                onSubmit={submit}
                className="flex flex-col overflow-hidden"
              >
                <div
                  className="px-5 sm:px-6 py-4 flex flex-col gap-4 overflow-y-auto overscroll-contain"
                >
                  {products.map((p) => {
                    const r = ratings[p.id] ?? 0
                    const h = hovered[p.id] ?? 0
                    return (
                      <div key={p.id} className="rounded-xl border border-table-border bg-surface p-3.5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image ?? ''}
                            alt=""
                            className="w-12 h-12 rounded-lg object-contain bg-surface-container border border-table-border shrink-0"
                          />
                          <p className="font-black text-sm text-primary leading-snug line-clamp-2 flex-1 min-w-0">{p.name}</p>
                        </div>

                        <div className="flex gap-1.5 mt-3" onMouseLeave={() => setHovered((s) => ({ ...s, [p.id]: 0 }))}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onMouseEnter={() => setHovered((st) => ({ ...st, [p.id]: s }))}
                              onClick={() => setRating(p.id, s)}
                              className="transition-transform hover:scale-110 active:scale-95"
                              aria-label={`${p.name}: ${s} star${s > 1 ? 's' : ''}`}
                              aria-pressed={r === s}
                            >
                              <Star
                                size={26}
                                className={cn(
                                  'transition-colors',
                                  s <= (h || r) ? 'fill-secondary stroke-secondary' : 'fill-none stroke-outline',
                                )}
                              />
                            </button>
                          ))}
                        </div>

                        {r > 0 && (
                          <textarea
                            value={bodies[p.id] ?? ''}
                            onChange={(e) => setBodies((b) => ({ ...b, [p.id]: e.target.value }))}
                            rows={2}
                            maxLength={500}
                            placeholder="Add a note (optional)"
                            className="mt-2.5 w-full px-3 py-2 rounded-lg border-2 border-table-border bg-surface-card text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors resize-none"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div
                  className="px-5 sm:px-6 pt-3 pb-5 border-t border-table-border flex flex-col gap-2.5"
                  style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
                >
                  {error && <p className="text-xs font-bold text-error">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || ratedCount === 0}
                    className="w-full h-12 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm"
                  >
                    {submitting && <Loader2 size={15} className="animate-spin" />}
                    {submitting ? 'Submitting…' : ratedCount > 1 ? `Submit ${ratedCount} reviews` : 'Submit review'}
                  </button>
                  <button
                    type="button"
                    onClick={skip}
                    disabled={submitting}
                    className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    Remind me later
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(gate, document.body)
}
