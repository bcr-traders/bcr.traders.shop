// Store ordering hours. Orders are accepted only inside the open window; the
// cart and checkout disable their CTAs outside it, and the order route rejects
// a late order authoritatively.
//
// Everything is evaluated in IST (Asia/Kolkata) regardless of where the server
// runs (Vercel is UTC) or where the customer's device is set — these are the
// store's local business hours, not the viewer's.

/** Ordering opens at 04:00 IST. */
export const ORDER_OPEN_MINUTE = 4 * 60
/** Ordering closes at 20:30 IST (8:30 PM). */
export const ORDER_CLOSE_MINUTE = 20 * 60 + 30

/** Minutes elapsed since IST midnight for the given instant (0–1439). */
export function istMinutesOfDay(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return (h % 24) * 60 + m
}

/** True when ordering is currently allowed (04:00 ≤ IST < 20:30). */
export function isOrderingOpen(date: Date = new Date()): boolean {
  const mins = istMinutesOfDay(date)
  return mins >= ORDER_OPEN_MINUTE && mins < ORDER_CLOSE_MINUTE
}

/** "4:00 AM" / "8:30 PM" style label for a minutes-since-midnight value. */
export function formatMinute(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export const ORDER_OPEN_LABEL = formatMinute(ORDER_OPEN_MINUTE) // "4:00 AM"
export const ORDER_CLOSE_LABEL = formatMinute(ORDER_CLOSE_MINUTE) // "8:30 PM"
