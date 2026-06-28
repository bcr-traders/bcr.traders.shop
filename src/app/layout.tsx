import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Work_Sans, Manrope, JetBrains_Mono } from 'next/font/google'
import { MASTER_KEYWORDS } from '@/lib/seo/keywords'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bcrtraders.in'
const OG_IMAGE = '/og-image.jpg'

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-work-sans',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-manrope',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'BCR TRADERS — Best Wholesale Oil, Pulses, Atta, Spices & Sugar Distributor in Odisha',
    template: "%s | BCR TRADERS — Odisha's Trusted Wholesaler",
  },
  description:
    "BCR TRADERS is Odisha's most trusted wholesale distributor of edible oil, pulses, atta, spices, sugar and packaged water. Buy in bulk at wholesale prices. Order online with Cash on Delivery.",
  keywords: [
    ...MASTER_KEYWORDS.brand,
    ...MASTER_KEYWORDS.wholesale,
    ...MASTER_KEYWORDS.longTail.slice(0, 5),
  ],
  authors: [{ name: 'BCR TRADERS', url: APP_URL }],
  creator: 'BCR TRADERS',
  publisher: 'BCR TRADERS',
  alternates: { canonical: APP_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Set GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION in .env after search console setup
  ...((process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION) && {
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
      ...(process.env.BING_SITE_VERIFICATION && { other: { 'msvalidate.01': [process.env.BING_SITE_VERIFICATION] } }),
    },
  }),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'BCR TRADERS',
    title: "BCR TRADERS — Odisha's Best Wholesale Commodity Distributor",
    description:
      'Wholesale prices on Edible Oil, Pulses, Atta, Spices, Sugar & Packaged Water. COD available. Serving Odisha.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'BCR TRADERS — Wholesale Grocery Odisha' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BCR TRADERS — Odisha's Best Wholesale Commodity Distributor",
    description: 'Wholesale prices on Edible Oil, Pulses, Atta, Spices, Sugar & Packaged Water. COD.',
    images: [OG_IMAGE],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${workSans.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
        <head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Odia:wght@400;500;700&display=swap"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
