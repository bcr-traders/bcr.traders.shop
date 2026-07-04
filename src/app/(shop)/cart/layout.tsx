import type { Metadata } from 'next'

// The cart page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Your Cart — BCR Traders',
  description: 'Review the items in your BCR Traders wholesale cart, apply coupons and proceed to a fast Cash-on-Delivery checkout across Odisha.',
  robots: { index: false, follow: true },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
