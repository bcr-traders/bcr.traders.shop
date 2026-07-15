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
    // These sizes must match the files byte-for-byte: Chrome measures each icon
    // and silently discards any whose real dimensions differ from what's
    // declared, leaving the app with no icon at all. The previous entries
    // claimed 512x512 and 192x192 for images that are actually 1024x1024 and
    // 703x844, so both were being thrown away.
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops icons to a circle/squircle; the logo is inset to the 80%
      // safe zone here so the crop can't clip it.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
