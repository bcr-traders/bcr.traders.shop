import type { Product } from '@/types/database.types'

/**
 * The only product columns a product CARD needs (grids, home rows, search).
 *
 * Listing pages were selecting '*', which drags every heavy column along —
 * description/description_or (HTML), short_desc, meta_description,
 * auto_keywords, meta_keywords, tags, variants … — for every row. None of it is
 * rendered on a card, so it's pure transfer + parse cost on the busiest pages.
 *
 * Keep this in sync with what ProductCard/AddToCartButton actually read.
 */
export const PRODUCT_CARD_COLUMNS = [
  'id',
  'category_id',
  'name',
  'name_or',
  'slug',
  'price',
  'mrp',
  'unit',
  'unit_or',
  'images',
  'stock_qty',
  'brand',
  // Packaging (Box → Hanger/Pack/Tin → Pieces) shown on the card / quick-add.
  'pack_type',
  'unit_type',
  'units_per_pack',
  'pieces_per_secondary',
  'secondary_price',
  'secondary_mrp',
  'is_featured',
  'is_active',
  'display_order',
].join(', ')

/**
 * A full `Product` is structurally assignable to this, so components typed
 * against it accept both a narrow card row and a complete product.
 */
export type ProductCardData = Pick<
  Product,
  | 'id'
  | 'category_id'
  | 'name'
  | 'name_or'
  | 'slug'
  | 'price'
  | 'mrp'
  | 'unit'
  | 'unit_or'
  | 'images'
  | 'stock_qty'
  | 'brand'
  | 'pack_type'
  | 'unit_type'
  | 'units_per_pack'
  | 'pieces_per_secondary'
  | 'secondary_price'
  | 'secondary_mrp'
  | 'is_featured'
  | 'is_active'
  | 'display_order'
>
