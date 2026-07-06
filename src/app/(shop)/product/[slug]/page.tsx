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
import ProductBuyPanel from './ProductBuyPanel'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getProductBySlug(slug)
  if (!data) return { title: 'Product Not Found' }

  const { product, category } = data
  const title = product.meta_title ?? `${product.name} — Wholesale Price in Odisha | BCR Traders`
  const description =
    product.meta_description ??
    `Buy ${product.name} (${product.unit}) at ₹${product.price} wholesale price in Odisha${product.brand ? ` — ${product.brand}` : ''}. Bulk order with Cash on Delivery & fast delivery across Cuttack, Bhubaneswar & all Odisha. ${product.description ? product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : ''}`.trim()
  const keywords = getProductKeywords(product.tags ?? null, category?.slug)
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bcrtraders.com'

  // ── JSON-LD ────────────────────────────────────────────────────────────────

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description ? product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : undefined,
    sku: product.sku ?? undefined,
    brand: { '@type': 'Brand', name: product.brand ?? 'BCR Traders' },
    offers: {
      '@type': 'Offer',
      url: `${appUrl}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price.toString(),
      priceValidUntil: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0],
      availability:
        product.stock_qty > 0
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

      {/* ── Top strip (breadcrumb + back) ── */}
      <div className="border-b border-table-border bg-surface-container-low/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ProductBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              ...(category
                ? [{ label: category.name, labelOr: category.name_or, href: `/category/${category.slug}` }]
                : []),
              { label: product.name, labelOr: product.name_or },
            ]}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-32 lg:pb-16">

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">

          {/* ── Left: Image gallery ── */}
          <ProductImageGallery images={product.images ?? []} productName={product.name} />

          {/* ── Right: Details ── */}
          <div className="flex flex-col px-0">

            {/* Category badge */}
            {category && (
              <Link
                href={`/category/${category.slug}`}
                className="inline-block self-start px-3 py-1.5 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-[0.15em] mb-4 hover:bg-primary/85 transition-colors active:scale-95"
              >
                {category.name}
              </Link>
            )}

            {/* Brand */}
            {product.brand && (
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/60 mb-1">
                {product.brand}
              </p>
            )}

            {/* Product name */}
            <h1 className="text-2xl lg:text-3xl font-black text-primary leading-tight tracking-tight mb-2">
              {product.name}
            </h1>
            {product.name_or && (
              <p className="font-odia text-base text-on-surface-variant/70 mb-2">{product.name_or}</p>
            )}

            {/* SKU */}
            {product.sku && (
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-3">
                SKU: {product.sku}
              </p>
            )}

            {/* Rating */}
            {stats.count > 0 && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-table-border">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < Math.round(stats.avg) ? 'text-secondary' : 'text-on-surface-variant/20'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm font-black text-primary">{stats.avg}</span>
                <span className="text-xs font-medium text-on-surface-variant/60">
                  ({stats.count} {stats.count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* ── Pricing + variants + actions ── */}
            <ProductBuyPanel product={product} />

            {/* Collapsible description + tags — desktop */}
            <div className="mt-6 border-t border-table-border hidden lg:block">
              {product.description && (
                <details className="group border-b border-table-border" open>
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-black text-sm uppercase tracking-widest text-primary hover:text-primary/70 transition-colors select-none">
                    Product Description
                    <span className="material-symbols-outlined text-on-surface-variant/50 transition-transform group-open:rotate-180 text-[20px]">
                      expand_more
                    </span>
                  </summary>
                  <div
                    className="pb-5 prose prose-sm max-w-none text-sm font-medium text-on-surface-variant/80 leading-relaxed break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_strong]:text-primary"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </details>
              )}

              {product.tags && product.tags.length > 0 && (
                <details className="group border-b border-table-border">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-black text-sm uppercase tracking-widest text-primary hover:text-primary/70 transition-colors select-none">
                    Tags
                    <span className="material-symbols-outlined text-on-surface-variant/50 transition-transform group-open:rotate-180 text-[20px]">
                      expand_more
                    </span>
                  </summary>
                  <div className="pb-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 border border-table-border rounded-xl font-black text-[11px] uppercase tracking-wider text-on-surface-variant hover:border-primary hover:text-primary transition-colors duration-200 cursor-default"
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

        {/* ── Mobile description ── */}
        {product.description && (
          <div className="mt-6 lg:hidden">
            <details className="group border border-table-border rounded-2xl overflow-hidden" open>
              <summary className="flex items-center justify-between cursor-pointer p-4 font-black text-sm uppercase tracking-widest text-primary bg-surface-container-low select-none">
                Product Description
                <span className="material-symbols-outlined text-on-surface-variant/50 transition-transform group-open:rotate-180 text-[20px]">
                  expand_more
                </span>
              </summary>
              <div
                className="p-4 prose prose-sm max-w-none text-sm font-medium text-on-surface-variant/80 leading-relaxed border-t border-table-border break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_strong]:text-primary"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </details>
          </div>
        )}

        {/* ── FAQs ── */}
        {faqs.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">FAQs</span>
              <div className="h-px flex-1 bg-table-border" />
            </div>
            <ProductFAQ faqs={faqs} />
          </div>
        )}

        {/* ── Reviews ── */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-table-border" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Reviews</span>
            <div className="h-px flex-1 bg-table-border" />
          </div>
          <ProductReviews
            productId={product.id}
            productName={product.name}
            reviews={reviews}
            stats={stats}
          />
        </div>

        {/* ── You May Also Like ── */}
        {related.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                You May Also Like
              </span>
              <div className="h-px flex-1 bg-table-border" />
            </div>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  )
}
