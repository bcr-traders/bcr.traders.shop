export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Domain interfaces ──────────────────────────────────────────────────────

export type BannerPlacement = 'hero' | 'mid_page' | 'category' | 'product'

export interface Banner {
  id: string
  title: string | null
  title_or: string | null
  subtitle: string | null
  subtitle_or: string | null
  image_url: string | null
  mobile_image_url: string | null
  link_url: string | null
  cta_text: string | null
  cta_text_or: string | null
  background_color: string
  text_color: string
  placement: BannerPlacement
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  name_or: string | null
  slug: string
  image_url: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  parent_id: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  name_or: string | null
  slug: string
  description: string | null
  description_or: string | null
  price: number
  mrp: number | null
  unit: string
  unit_or: string | null
  images: string[]
  category_id: string | null
  is_featured: boolean
  is_active: boolean
  display_order: number
  stock_quantity: number
  sku: string | null
  tags: string[] | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  description_or: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_amount: number | null
  max_discount: number | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  usage_count: number
  created_at: string
}

export interface ProductFAQ {
  id: string
  product_id: string
  question: string
  question_or: string | null
  answer: string
  answer_or: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface ProductReview {
  id: string
  product_id: string
  reviewer_name: string
  rating: number
  body: string | null
  body_or: string | null
  is_approved: boolean
  created_at: string
}

export interface CmsContent {
  id: string
  key: string
  value: Json
  is_active: boolean
  updated_at: string
}

// ── Address ────────────────────────────────────────────────────────────────

export type AddressLabel = 'Home' | 'Office' | 'Storefront' | 'Other'

export interface Address {
  id: string
  user_id: string
  name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  label: AddressLabel | null
  is_default: boolean
  created_at: string
}

// ── Order ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  product_id: string
  name: string
  price: number
  mrp: number | null
  quantity: number
  unit: string
  image: string | null
}

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipping' | 'delivered' | 'cancelled' | 'returned'

export interface Order {
  id: string
  user_id: string
  items: OrderItem[]
  address: Address
  subtotal: number
  delivery_fee: number
  discount?: number
  coupon_code?: string | null
  total: number
  status: OrderStatus
  payment_method: 'cod'
  notes: string | null
  is_bulk: boolean
  estimated_delivery?: string | null
  custom_message?: string | null
  returned_at?: string | null
  created_at: string
  updated_at: string
}

// ── CMS value shapes ───────────────────────────────────────────────────────

export interface SiteAnnouncement {
  text: string
  background_color: string
  text_color: string
  link_url?: string
}

export interface OfferBannerConfig {
  image_url: string
  link_url: string
  alt_text: string
}

// ── Cart ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  name: string
  price: number
  mrp: number | null
  unit: string
  image: string | null
  quantity: number
  slug: string
}

// ── Supabase Database type ─────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          clerk_user_id: string
          phone: string | null
          email: string | null
          name: string | null
          role: 'customer' | 'super_admin' | 'admin' | 'delivery'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      admin_profiles: {
        Row: {
          id: string
          clerk_user_id: string
          name: string
          phone: string
          role: 'super_admin' | 'admin' | 'delivery'
          permissions: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_profiles']['Insert']>
      }
      banners: {
        Row: Banner
        Insert: Omit<Banner, 'id' | 'created_at'>
        Update: Partial<Omit<Banner, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      coupons: {
        Row: Coupon
        Insert: Omit<Coupon, 'id' | 'created_at' | 'usage_count'>
        Update: Partial<Omit<Coupon, 'id' | 'created_at'>>
      }
      cms_content: {
        Row: CmsContent
        Insert: Omit<CmsContent, 'id' | 'updated_at'>
        Update: Partial<Omit<CmsContent, 'id'>>
      }
    }
  }
}
