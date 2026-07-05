import { createClient } from '@/lib/supabase/server'
import type {
  Banner,
  Category,
  Product,
  Coupon,
  SiteAnnouncement,
  OfferBannerConfig,
} from '@/types/database.types'

export interface TrustBadgeItem {
  icon: string
  text: string
  text_or: string
}

export interface HomepageData {
  banners: Banner[]
  promoCards: Banner[]
  categories: Category[]
  featuredProducts: Product[]
  coupons: Coupon[]
  categoryProducts: Record<string, Product[]>
  announcement: SiteAnnouncement | null
  offerBanner: OfferBannerConfig | null
  trustBadges: TrustBadgeItem[]
}

function parseCmsValue<T>(
  value: unknown,
  validate: (v: Record<string, unknown>) => boolean
): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  return validate(v) ? (v as unknown as T) : null
}

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient()

  const [bannersRes, categoriesRes, featuredRes, couponsRes, cmsRes] =
    await Promise.all([
      supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('display_order')
        .limit(12),
      supabase.from('coupons').select('*').eq('is_active', true),
      supabase.from('cms_content').select('*'),
    ])

  const allBanners = bannersRes.data ?? []
  const banners = allBanners.filter((b) => b.placement === 'hero')
  const promoCards = allBanners.filter((b) => b.placement === 'mid_page').slice(0, 4)
  const categories = categoriesRes.data ?? []
  const featuredProducts = featuredRes.data ?? []
  const coupons = couponsRes.data ?? []

  const cmsMap: Record<string, unknown> = {}
  ;(cmsRes.data ?? []).forEach((row) => {
    cmsMap[row.key] = row.value
  })

  // Per-category products (parallel)
  const categoryProducts: Record<string, Product[]> = {}
  if (categories.length > 0) {
    const perCatResults = await Promise.all(
      categories.map((cat) =>
        supabase
          .from('products')
          .select('*')
          .eq('category_id', cat.id)
          .eq('is_active', true)
          .order('display_order')
          .limit(8)
      )
    )
    categories.forEach((cat, i) => {
      categoryProducts[cat.id] = perCatResults[i].data ?? []
    })
  }

  const announcement = parseCmsValue<SiteAnnouncement>(
    cmsMap['site_announcement'],
    (v) => typeof v['text'] === 'string' && v['is_active'] === true
  )

  const offerBanner = parseCmsValue<OfferBannerConfig>(
    cmsMap['offer_banner'],
    (v) => typeof v['image_url'] === 'string'
  )

  // Trust badges are authored in Banners & CMS → Homepage as an array of
  // { icon, text, text_or }. Keep only entries that actually have label text.
  const trustBadges: TrustBadgeItem[] = Array.isArray(cmsMap['trust_badges'])
    ? (cmsMap['trust_badges'] as unknown[])
        .filter(
          (b): b is TrustBadgeItem =>
            !!b && typeof b === 'object' && typeof (b as TrustBadgeItem).text === 'string'
        )
        .map((b) => ({
          icon: typeof b.icon === 'string' ? b.icon : 'star',
          text: b.text,
          text_or: typeof b.text_or === 'string' ? b.text_or : '',
        }))
        .filter((b) => b.text.trim().length > 0)
    : []

  return {
    banners,
    promoCards,
    categories,
    featuredProducts,
    coupons,
    categoryProducts,
    announcement,
    offerBanner,
    trustBadges,
  }
}
