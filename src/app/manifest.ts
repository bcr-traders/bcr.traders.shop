import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BCR TRADERS — Wholesale Grocery Distributor Odisha',
    short_name: 'BCR Traders',
    description:
      "Odisha's trusted wholesale distributor of edible oil, pulses, atta, spices, sugar and packaged water. Bulk orders at wholesale prices with Cash on Delivery.",
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf9f1',
    theme_color: '#1c130a',
    lang: 'en-IN',
    categories: ['shopping', 'food', 'business'],
    icons: [
      { src: '/images/logo.webp', sizes: '512x512', type: 'image/webp', purpose: 'any' },
      { src: '/images/logo-trimmed.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
    ],
  }
}
