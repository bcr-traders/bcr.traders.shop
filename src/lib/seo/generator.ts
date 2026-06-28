import { MASTER_KEYWORDS } from './keywords'

// Category slug → keyword group
const CAT_KEYWORDS: Record<string, string[]> = {
  'edible-oil':     MASTER_KEYWORDS.oil,
  'pulses-dal':     MASTER_KEYWORDS.pulses,
  'atta-flour':     MASTER_KEYWORDS.atta,
  'spices-masala':  MASTER_KEYWORDS.spices,
  'sugar-jaggery':  MASTER_KEYWORDS.sugar,
  'packaged-water': MASTER_KEYWORDS.water,
}

/** Keywords for a given category page — category-specific + brand + core wholesale terms. */
export function getCategoryKeywords(slug: string): string[] {
  return [
    ...(CAT_KEYWORDS[slug] ?? []),
    ...MASTER_KEYWORDS.brand,
    ...MASTER_KEYWORDS.wholesale.slice(0, 4),
  ]
}

/**
 * Keywords for a product page.
 * Uses the product's own tags first, then category-specific keywords, then brand.
 */
export function getProductKeywords(tags: string[] | null, categorySlug?: string): string[] {
  const catKw = categorySlug ? (CAT_KEYWORDS[categorySlug] ?? []).slice(0, 5) : []
  return [
    ...(tags ?? []),
    ...catKw,
    ...MASTER_KEYWORDS.brand,
    ...MASTER_KEYWORDS.wholesale.slice(0, 3),
  ]
}

/** Site-wide keywords for the homepage. */
export const HOMEPAGE_KEYWORDS: string[] = [
  ...MASTER_KEYWORDS.brand,
  ...MASTER_KEYWORDS.wholesale,
  ...MASTER_KEYWORDS.longTail,
]
