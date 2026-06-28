import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  getProductBySlug,
  getProductFAQs,
  getProductReviews,
  getRelatedProducts,
} from '@/lib/data/product'
import { getProductKeywords } from '@/lib/seo/generator'
import ProductImageGallery from '@/components/product/ProductImageGallery'
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb'
import ProductFAQ from '@/components/product/ProductFAQ'
import ProductReviews from '@/components/product/ProductReviews'
import ProductGrid from '@/components/product/ProductGrid'
import ProductActions from './ProductActions'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getProductBySlug(slug)
  if (!data) return { title: 'Product Not Found' }

  const { product } = data
  const title = product.meta_title ?? `${product.name} — Wholesale Price | BCR Traders`
  const description =
    product.meta_description ??
    `Buy ${product.name} (${product.unit}) at ₹${product.price} — best wholesale price in Odisha. ${product.description ? product.description.slice(0, 100) : 'Cash on delivery, fast shipping.'}`
  const keywords = getProductKeywords(product.tags ?? null)
  const ogImage = product.images?.[0]

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title,
      description,
      url: `/product/${slug}`,
      type: 'website',
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: product.name }]
        : [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : ['/images/og-default.jpg'],
    },
  }
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true)
    return ((data ?? []) as Array<{ slug: string }>).map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const pageData = await getProductBySlug(slug)
  if (!pageData) notFound()

  const { product, category } = pageData

  const [faqs, { reviews, stats }, related] = await Promise.all([
    getProductFAQs(product.id),
    getProductReviews(product.id, 10),
    category ? getRelatedProducts(category.id, product.id, 4) : Promise.resolve([]),
  ])

  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bcrtraders.com'

  // ── JSON-LD ────────────────────────────────────────────────────────────────

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    brand: { '@type': 'Brand', name: 'BCR Traders' },
    offers: {
      '@type': 'Offer',
      url: `${appUrl}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price.toString(),
      priceValidUntil: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0],
      availability:
        product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'BCR Traders' },
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'INR' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        },
      },
    },
    ...(stats.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: stats.avg.toString(),
        reviewCount: stats.count.toString(),
        bestRating: '5',
        worstRating: '1',
      },
      review: reviews.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.reviewer_name },
        datePublished: r.created_at.split('T')[0],
        reviewRating: { '@type': 'Rating', ratingValue: r.rating.toString() },
        reviewBody: r.body ?? undefined,
      })),
    }),
  }

  const faqJsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
      ...(category
        ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${appUrl}/category/${category.slug}` }]
        : []),
      {
        '@type': 'ListItem',
        position: category ? 3 : 2,
        name: product.name,
        item: `${appUrl}/product/${product.slug}`,
      },
    ],
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="max-w-7xl mx-auto md:px-4 lg:px-0 mt-4 lg:mt-6 pb-32 lg:pb-16">
        {/* ── Breadcrumb ── */}
        <ProductBreadcrumb
          items={[
            { label: 'Home', href: '/' },
            ...(category
              ? [{ label: category.name, labelOr: category.name_or, href: `/category/${category.slug}` }]
              : []),
            { label: product.name, labelOr: product.name_or },
          ]}
        />

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Left: Image gallery */}
          <ProductImageGallery images={product.images ?? []} productName={product.name} />

          {/* Right: Details */}
          <div className="flex flex-col px-4 lg:px-0">
            {/* Brand / Category badge */}
            {category && (
              <Link
                href={`/category/${category.slug}`}
                className="inline-block self-start px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full font-label-sm text-label-sm mb-3 hover:bg-surface-container-highest transition-colors"
              >
                {category.name}
              </Link>
            )}

            {/* Product name */}
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-on-surface leading-tight mb-2">
              {product.name}
            </h1>

            {/* SKU */}
            {product.sku && (
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-3">
                SKU: {product.sku}
              </p>
            )}

            {/* Rating */}
            {stats.count > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-secondary text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="font-label-sm text-label-sm text-on-surface">{stats.avg}</span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  ({stats.count} {stats.count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Pricing box */}
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-body-md text-body-md text-on-surface-variant block mb-0.5">
                    Price per {product.unit}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-headline-md text-headline-md text-primary">
                      ₹{product.price}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="font-body-md text-body-md text-on-surface-variant line-through">
                        MRP ₹{product.mrp}
                      </span>
                    )}
                  </div>
                </div>
                {discount && (
                  <div className="bg-secondary text-on-secondary font-label-sm text-label-sm px-3 py-1 rounded-full flex-shrink-0">
                    Save {discount}%
                  </div>
                )}
              </div>

              {/* Stock status */}
              {product.stock_quantity === 0 ? (
                <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-2 pt-2 border-t border-outline-variant/50">
                  <span className="material-symbols-outlined text-[14px]">
                    do_not_disturb_on
                  </span>
                  Out of Stock
                </p>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 mt-2 pt-2 border-t border-outline-variant/50">
                  <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  In Stock
                  {product.stock_quantity <= 10 && (
                    <span className="text-error ml-1">— only {product.stock_quantity} left</span>
                  )}
                </p>
              )}
            </div>

            {/* Unit badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-surface-container border border-outline-variant rounded-full font-label-sm text-label-sm text-on-surface-variant">
                {product.unit}
                {product.unit_or && ` / ${product.unit_or}`}
              </span>
              {product.is_featured && (
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm">
                  Featured
                </span>
              )}
            </div>

            {/* Desktop actions (Add to Cart + Buy Now) */}
            <ProductActions product={product} />

            {/* Collapsible sections */}
            <div className="mt-6 border-t border-outline-variant hidden lg:block">
              {product.description && (
                <details className="group border-b border-outline-variant" open>
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-headline-md text-headline-md text-on-surface hover:text-primary transition-colors select-none">
                    Product Description
                    <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="pb-4 font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                    {product.description}
                  </div>
                </details>
              )}

              {product.tags && product.tags.length > 0 && (
                <details className="group border-b border-outline-variant">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-headline-md text-headline-md text-on-surface hover:text-primary transition-colors select-none">
                    Tags
                    <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="pb-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-surface-container border border-outline-variant rounded-full font-label-sm text-label-sm text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile description (below grid) ── */}
        {product.description && (
          <div className="px-4 mt-6 lg:hidden">
            <details className="group border border-outline-variant rounded-xl overflow-hidden" open>
              <summary className="flex items-center justify-between cursor-pointer p-4 font-headline-md text-headline-md text-on-surface bg-surface-container-low select-none">
                Product Description
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                  expand_more
                </span>
              </summary>
              <div className="p-4 font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {product.description}
              </div>
            </details>
          </div>
        )}

        {/* ── FAQs ── */}
        {faqs.length > 0 && (
          <div className="border-t border-outline-variant mt-8">
            <ProductFAQ faqs={faqs} />
          </div>
        )}

        {/* ── Reviews ── */}
        <ProductReviews
          productId={product.id}
          productName={product.name}
          reviews={reviews}
          stats={stats}
        />

        {/* ── You May Also Like ── */}
        {related.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 lg:px-0 py-8 border-t border-outline-variant">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
              You May Also Like
            </h2>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  )
}
