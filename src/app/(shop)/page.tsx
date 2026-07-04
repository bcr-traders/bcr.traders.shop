import type { Metadata } from 'next'
import { HOMEPAGE_KEYWORDS } from '@/lib/seo/generator'
import { getHomepageData } from '@/lib/data/homepage'
import HeroBanner from '@/components/home/HeroBanner'
import PromoCardsRow from '@/components/home/PromoCardsRow'
import TrustBadges from '@/components/home/TrustBadges'
import CategoryGrid from '@/components/home/CategoryGrid'
import ProductSection from '@/components/home/ProductSection'
import OfferBanner from '@/components/home/OfferBanner'
import CouponCards from '@/components/home/CouponCards'
import CouponMarquee from '@/components/home/CouponMarquee'
import AnimatedStats from '@/components/home/AnimatedStats'
import WhatsAppFAB from '@/components/home/WhatsAppFAB'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bcrtraders.com'

export const revalidate = 60

export const metadata: Metadata = {
  // `absolute` bypasses the "%s | BCR TRADERS…" template so the tab/SERP title
  // leads with the brand exactly as requested.
  title: {
    absolute: 'BCR TRADERS | Wholesale Oil, Pulses, Atta, Spices, Sugar & Water Distributor in Odisha',
  },
  description:
    "BCR TRADERS — Odisha's #1 wholesale grocery distributor. Buy edible oil, pulses, atta, spices, sugar & packaged water in bulk at the best wholesale prices. Cash on Delivery & fast delivery across Cuttack, Bhubaneswar, Puri & all Odisha.",
  keywords: HOMEPAGE_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    title: "BCR TRADERS — Wholesale Grocery Distributor Odisha",
    description:
      "Odisha's #1 wholesale grocery platform. Edible Oil, Pulses, Atta, Spices, Sugar, Water — bulk orders at best prices. COD.",
    url: '/',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BCR TRADERS — Wholesale Grocery Distributor Odisha",
    description: 'Bulk oil, pulses, atta, spices, sugar & water at wholesale prices. COD delivery across Odisha.',
    images: ['/og-image.jpg'],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BCR TRADERS',
  url: APP_URL,
  logo: `${APP_URL}/logo.svg`,
  description:
    "Odisha's most trusted wholesale distributor of edible oil, pulses, atta, spices, sugar and packaged water bottles.",
  areaServed: { '@type': 'State', name: 'Odisha, India' },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+91-9040011053',
      email: 'bcr.traders19@gmail.com',
      availableLanguage: ['English', 'Odia'],
    },
  ],
  sameAs: [
    'https://www.facebook.com/bcrtrades',
    'https://www.instagram.com/bcrtrades',
  ],
}

const localBizJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'GroceryStore', 'Store'],
  name: 'BCR TRADERS',
  '@id': APP_URL,
  url: APP_URL,
  image: `${APP_URL}/og-image.jpg`,
  logo: `${APP_URL}/logo.svg`,
  priceRange: '₹₹',
  telephone: '+91-9040011053',
  email: 'bcr.traders19@gmail.com',
  currenciesAccepted: 'INR',
  paymentAccepted: 'Cash on Delivery, UPI, Card',
  slogan: "Odisha's Trusted Wholesale Partner",
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Malgodown',
    addressLocality: 'Cuttack',
    addressRegion: 'Odisha',
    postalCode: '753003',
    addressCountry: 'IN',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 20.4625,
    longitude: 85.8828,
  },
  areaServed: [
    { '@type': 'State', name: 'Odisha' },
    ...['Cuttack', 'Bhubaneswar', 'Puri', 'Rourkela', 'Sambalpur', 'Balasore', 'Berhampur'].map(
      (c) => ({ '@type': 'City', name: c }),
    ),
  ],
  knowsAbout: ['Edible Oil', 'Pulses', 'Atta & Flour', 'Spices', 'Sugar & Jaggery', 'Packaged Water', 'Wholesale Grocery'],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BCR TRADERS',
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default async function HomePage() {
  const { banners, promoCards, categories, featuredProducts, categoryProducts, coupons, offerBanner } =
    await getHomepageData()

  return (
    <>
      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizJsonLd) }}
      />
      {/* WebSite + SearchAction JSON-LD (sitelinks search box) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <div className="flex flex-col gap-6 py-4">
        {/* 1. Hero banner carousel */}
        <HeroBanner banners={banners} />

        {/* 2. Promo cards row */}
        <PromoCardsRow cards={promoCards} />

        {/* 3. Coupon marquee ticker */}
        {coupons.length > 0 && <CouponMarquee coupons={coupons} />}

        {/* 4. Category bento grid (staggered entry) — straight to shopping */}
        <CategoryGrid categories={categories} />

        {/* 5. Active coupon offers (premium coupon design) */}
        <CouponCards coupons={coupons} />

        {/* 6. Best Sellers */}
        <ProductSection
          title="Best Sellers"
          titleOr="ସବୁଠୁ ଅଧିକ ବିକ୍ରି"
          products={featuredProducts}
          viewAllHref="/search?featured=true"
        />

        {/* 7. Per-Category sections */}
        {categories.map((cat) => {
          const products = categoryProducts[cat.id] ?? []
          if (products.length === 0) return null
          return (
            <ProductSection
              key={cat.id}
              title={cat.name}
              titleOr={cat.name_or}
              products={products}
              viewAllHref={`/category/${cat.slug}`}
            />
          )
        })}

        {/* 8. Mid-page offer banner */}
        {offerBanner && <OfferBanner data={offerBanner} />}

        {/* 9. Trust badges (animated, scrollable) */}
        <TrustBadges />

        {/* 10. Business stats with counting animation */}
        <AnimatedStats />
      </div>

      {/* Floating WhatsApp order button */}
      <WhatsAppFAB />
    </>
  )
}
