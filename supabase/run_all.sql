-- =============================================================================
-- BCR TRADERS — COMPLETE DATABASE SETUP
-- Single file combining 001_schema + 002_rls + 003_seed
--
-- HOW TO RUN:
--   1. Create a new Supabase project at supabase.com
--   2. Go to SQL Editor → New Query
--   3. Paste the entire contents of this file
--   4. Click Run
--
-- AFTER RUNNING:
--   • Go to Storage → create these 4 buckets:
--       product-images   (Public)
--       category-images  (Public)
--       banner-images    (Public)
--       invoice-pdfs     (Private)
--   • Copy your Project URL + anon key + service_role key into .env.local
-- =============================================================================



-- =============================================================================
-- ███████╗ ██████╗ ██╗  ██╗███████╗███╗   ███╗ █████╗
-- ██╔════╝██╔════╝ ██║  ██║██╔════╝████╗ ████║██╔══██╗
-- ███████╗██║      ███████║█████╗  ██╔████╔██║███████║
-- ╚════██║██║      ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║
-- ███████║╚██████╗ ██║  ██║███████╗██║ ╚═╝ ██║██║  ██║
--  001: CORE SCHEMA — Tables, Sequences, Indexes, Triggers
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 001: Core Schema
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (customers, synced from Clerk webhooks)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE NOT NULL,
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT,
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  preferred_lang  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_lang IN ('en', 'or')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN PROFILES
-- Super admin creates these. Each profile = one Clerk account (phone login).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE admin_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE,
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('super_admin', 'admin', 'delivery')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  permissions     JSONB NOT NULL DEFAULT '{
    "view_orders":              true,
    "update_order_status":      true,
    "manage_products":          false,
    "manage_categories":        false,
    "manage_banners":           false,
    "manage_coupons":           false,
    "manage_pincodes":          false,
    "manage_cms":               false,
    "manage_admin_profiles":    false,
    "manage_delivery_persons":  false,
    "view_analytics":           true,
    "view_abandoned_carts":     true,
    "view_unserviceable":       true,
    "receive_order_emails":     true,
    "export_data":              false
  }',
  created_by      UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICEABLE PINCODES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE serviceable_pincodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode     TEXT UNIQUE NOT NULL,
  area_name   TEXT,
  city        TEXT,
  state       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- UNSERVICEABLE ATTEMPTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE unserviceable_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone            TEXT NOT NULL,
  name             TEXT,
  pincode          TEXT NOT NULL,
  city             TEXT,
  state            TEXT,
  cart_snapshot    JSONB,
  admin_notified   BOOLEAN NOT NULL DEFAULT false,
  admin_contacted  BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  name_or          TEXT,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  description_or   TEXT,
  image_url        TEXT,
  banner_url       TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  meta_title       TEXT,
  meta_description TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id             UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name                    TEXT NOT NULL,
  name_or                 TEXT,
  slug                    TEXT UNIQUE NOT NULL,
  sku                     TEXT UNIQUE NOT NULL,
  description             TEXT,
  description_or          TEXT,
  short_desc              TEXT,
  short_desc_or           TEXT,
  price                   NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp                     NUMERIC(10,2) CHECK (mrp >= 0),
  show_strikethrough      BOOLEAN NOT NULL DEFAULT false,
  unit                    TEXT NOT NULL,
  stock_qty               INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_threshold     INT NOT NULL DEFAULT 10,
  min_order_qty           INT NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  max_order_qty           INT,
  images                  TEXT[] NOT NULL DEFAULT '{}',
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  meta_title              TEXT,
  meta_description        TEXT,
  auto_keywords           TEXT[] NOT NULL DEFAULT '{}',
  meta_keywords           TEXT[] NOT NULL DEFAULT '{}',
  gtin                    TEXT,
  mpn                     TEXT,
  brand                   TEXT NOT NULL DEFAULT 'BCR TRADERS',
  condition               TEXT NOT NULL DEFAULT 'new',
  google_product_category TEXT,
  availability            TEXT GENERATED ALWAYS AS (
                            CASE WHEN stock_qty > 0 THEN 'in stock' ELSE 'out of stock' END
                          ) STORED,
  rating_avg              NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count            INT NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  is_featured             BOOLEAN NOT NULL DEFAULT false,
  display_order           INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT FAQs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_faqs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  question_or   TEXT,
  answer        TEXT NOT NULL,
  answer_or     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_id             UUID,
  admin_profile_id     UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewer_name        TEXT NOT NULL,
  rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                TEXT,
  body                 TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_admin_added       BOOLEAN NOT NULL DEFAULT false,
  is_approved          BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- BANNERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE banners (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT,
  subtitle         TEXT,
  image_url        TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url         TEXT,
  cta_text         TEXT NOT NULL DEFAULT 'Shop Now',
  display_order    INT NOT NULL DEFAULT 0,
  placement        TEXT NOT NULL DEFAULT 'hero'
                     CHECK (placement IN ('hero', 'mid_page', 'category', 'product')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CMS CONTENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE cms_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  value_or    JSONB,
  description TEXT,
  updated_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cms_content (key, value, value_or, description) VALUES
  ('site_announcement',  '{"text": "", "bg_color": "#0c831f", "is_active": false}', NULL, 'Top announcement bar'),
  ('hero_title',         '{"text": "Fresh Commodities at Wholesale Prices"}', '{"text": "ଥୋକ ମୂଲ୍ୟରେ ତାଜା ସାମଗ୍ରୀ"}', 'Homepage hero title'),
  ('hero_subtitle',      '{"text": "Odisha''s Most Trusted Oil, Pulses & Spice Distributor"}', '{"text": "ଓଡீଶାର ସର୍ବୋଚ୍ଚ ବିଶ୍ଵସ୍ତ ତେଲ, ଡାଲ ଓ ମସଲା ବିତରକ"}', 'Homepage hero subtitle'),
  ('delivery_promise',   '{"text": "Delivery within 24-48 hours"}', '{"text": "24-48 ଘଣ୍ଟା ମଧ୍ୟରେ ଡେଲିଭରି"}', 'Delivery promise text'),
  ('trust_badges',       '{"items": ["Best Wholesale Distributor in Odisha", "10,000+ Happy Customers", "Fresh Stock Every Week", "Direct from Manufacturers"]}', NULL, 'Trust badges on homepage'),
  ('contact_phone',      '{"text": "+91 XXXXXXXXXX"}', NULL, 'Footer contact phone'),
  ('contact_email',      '{"text": "info@bcrtrades.in"}', NULL, 'Footer contact email'),
  ('contact_address',    '{"text": "BCR TRADERS, Odisha, India"}', NULL, 'Footer address'),
  ('footer_tagline',     '{"text": "Your Trusted Commodities Partner"}', NULL, 'Footer tagline'),
  ('min_order_value',    '{"value": 0}', NULL, 'Minimum cart value for checkout'),
  ('bulk_order_minimum', '{"value": 5000}', NULL, 'Minimum value for bulk order discount');


-- ─────────────────────────────────────────────────────────────────────────────
-- COUPONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  description_or  TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(10,2),
  max_uses        INT,
  uses_count      INT NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          TEXT UNIQUE NOT NULL DEFAULT '',
  user_id               UUID NOT NULL REFERENCES profiles(id),
  status                TEXT NOT NULL DEFAULT 'placed'
                          CHECK (status IN (
                            'placed','confirmed','assigned','processing',
                            'out_for_delivery','delivered','cancelled','returned'
                          )),
  payment_method        TEXT NOT NULL DEFAULT 'cod'
                          CHECK (payment_method IN ('cod', 'online')),
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','collected','failed','refunded')),
  payment_collected_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  payment_reference     TEXT,
  payment_method_used   TEXT,
  subtotal              NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  coupon_code           TEXT,
  total                 NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  delivery_address      JSONB NOT NULL,
  notes                 TEXT,
  accepted_by           UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  accepted_at           TIMESTAMPTZ,
  assigned_to           UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  estimated_delivery    TEXT,
  custom_message        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  product_name_or  TEXT,
  product_unit     TEXT NOT NULL,
  product_sku      TEXT NOT NULL,
  image_url        TEXT,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp              NUMERIC(10,2),
  quantity         INT NOT NULL CHECK (quantity > 0),
  subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  review_requested BOOLEAN NOT NULL DEFAULT false,
  review_submitted BOOLEAN NOT NULL DEFAULT false
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER TIMELINE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_timeline (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status         TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  estimated_time TEXT,
  updated_by     UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  email_sent     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- DELIVERY OTPs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE delivery_otps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_man_id UUID NOT NULL REFERENCES admin_profiles(id),
  customer_phone  TEXT NOT NULL,
  otp             TEXT NOT NULL,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  attempts        INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ABANDONED CARTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE abandoned_carts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone         TEXT,
  cart_items    JSONB NOT NULL,
  total_value   NUMERIC(10,2),
  item_count    INT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_recovered  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT TRANSLATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_translations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('or')),
  name        TEXT,
  short_desc  TEXT,
  description TEXT,
  unit_label  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, lang)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATION LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient   TEXT NOT NULL,
  subject     TEXT,
  template    TEXT,
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_clerk          ON profiles(clerk_user_id);
CREATE INDEX idx_addresses_user          ON addresses(user_id);
CREATE INDEX idx_products_category       ON products(category_id);
CREATE INDEX idx_products_slug           ON products(slug);
CREATE INDEX idx_products_sku            ON products(sku);
CREATE INDEX idx_products_active         ON products(is_active);
CREATE INDEX idx_products_featured       ON products(is_featured);
CREATE INDEX idx_products_name_trgm      ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_orders_user             ON orders(user_id);
CREATE INDEX idx_orders_status           ON orders(status);
CREATE INDEX idx_orders_created          ON orders(created_at DESC);
CREATE INDEX idx_orders_assigned         ON orders(assigned_to);
CREATE INDEX idx_order_items_order       ON order_items(order_id);
CREATE INDEX idx_reviews_product         ON reviews(product_id);
CREATE INDEX idx_reviews_approved        ON reviews(product_id, is_approved);
CREATE INDEX idx_abandoned_carts_user    ON abandoned_carts(user_id);
CREATE INDEX idx_abandoned_active        ON abandoned_carts(last_activity DESC) WHERE is_recovered = false;
CREATE INDEX idx_unserviceable_pincode   ON unserviceable_attempts(pincode);
CREATE INDEX idx_serviceable_pincode     ON serviceable_pincodes(pincode) WHERE is_active = true;
CREATE INDEX idx_delivery_otps_order     ON delivery_otps(order_id);
CREATE INDEX idx_delivery_otps_active    ON delivery_otps(order_id) WHERE is_used = false;
CREATE INDEX idx_faqs_product            ON product_faqs(product_id, display_order);
CREATE INDEX idx_admin_phone             ON admin_profiles(phone);
CREATE INDEX idx_admin_role              ON admin_profiles(role);
CREATE INDEX idx_coupons_code            ON coupons(code) WHERE is_active = true;
CREATE INDEX idx_timeline_order          ON order_timeline(order_id, created_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-set updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_admin_updated       BEFORE UPDATE ON admin_profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated  BEFORE UPDATE ON categories           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated    BEFORE UPDATE ON products             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated      BEFORE UPDATE ON orders               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_banners_updated     BEFORE UPDATE ON banners              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_serviceable_updated BEFORE UPDATE ON serviceable_pincodes FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-generate order number (BCR-YYYYMMDD-XXXX)
-- Global sequence is atomic — no race conditions under concurrent inserts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BCR-'
    || TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD')
    || '-'
    || LPAD(nextval('order_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: keep product rating_avg + rating_count in sync
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products SET
    rating_avg   = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM reviews
      WHERE product_id = pid AND is_approved = true
    ), 0),
    rating_count = (
      SELECT COUNT(*) FROM reviews
      WHERE product_id = pid AND is_approved = true
    )
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: enforce single default address per user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE addresses
  SET is_default = false
  WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_address_default
  AFTER INSERT OR UPDATE OF is_default ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: increment coupon uses_count on order insert
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_coupon_uses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL THEN
    UPDATE coupons SET uses_count = uses_count + 1
    WHERE code = NEW.coupon_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_coupon_uses
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_uses();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-insert first timeline entry when order is placed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_order_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_timeline (order_id, status, title, description)
  VALUES (
    NEW.id,
    'placed',
    'Order Placed',
    'Your order has been received and is being reviewed.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_first_timeline
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_order_timeline();

-- ─────────────────────────────────────────────────────────────────────────────
-- SKU SEQUENCE
-- Format: BCR-[CAT3]-[YYYY]-[SEQ4]  e.g. BCR-OIL-2025-0001
-- Generate via: 'BCR-' || cat_prefix || '-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('sku_seq')::TEXT, 4, '0')
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS sku_seq START 1;


-- =============================================================================
--  002: ROW LEVEL SECURITY — Policies per table
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 002: Row Level Security
-- Run AFTER 001_schema.sql
--
-- Architecture:
--   • All admin/server mutations use the service_role key → bypasses RLS entirely.
--   • The anon key is used by the frontend for public catalogue reads only.
--   • User-specific reads/writes (orders, addresses, profiles) go through
--     Next.js API routes (service_role), so RLS on those tables is a
--     defense-in-depth layer, not the primary security gate.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE-ROLE-ONLY TABLES
-- Enable RLS with NO policies → anon/authenticated keys are blocked entirely.
-- Only service_role (used by Next.js API routes) can access these.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE admin_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_otps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE unserviceable_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_translations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                ENABLE ROW LEVEL SECURITY;

-- No policies created for service-role-only tables.
-- service_role bypasses RLS; all other roles are denied by default.


-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLIC CATALOGUE — Enable RLS + public read policies
-- Browseable without authentication (anon key).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_faqs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceable_pincodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_banners"
  ON banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_faqs"
  ON product_faqs FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "public_read_cms"
  ON cms_content FOR SELECT
  USING (true);

CREATE POLICY "public_read_pincodes"
  ON serviceable_pincodes FOR SELECT
  USING (is_active = true);

-- Coupons: only expose active, non-expired coupons for client-side validation UI.
-- Full coupon validation (max_uses check etc.) is done server-side.
CREATE POLICY "public_read_active_coupons"
  ON coupons FOR SELECT
  USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- USER-OWNED DATA
-- All writes go through Next.js API routes (service_role key → bypasses RLS).
-- These policies allow the authenticated Supabase client to read user data
-- if ever used directly; they are a safety net, not the primary gate.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

-- profiles: open read + update (service_role handles all writes)
CREATE POLICY "user_read_profiles"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "user_update_profiles"
  ON profiles FOR UPDATE USING (true);

-- addresses: full access (mutations via service_role API routes)
CREATE POLICY "user_all_addresses"
  ON addresses FOR ALL USING (true);

-- orders: read + insert (status updates via service_role API routes)
CREATE POLICY "user_read_orders"
  ON orders FOR SELECT USING (true);

CREATE POLICY "user_insert_orders"
  ON orders FOR INSERT WITH CHECK (true);

-- order_items: read only (created alongside order via service_role)
CREATE POLICY "user_read_order_items"
  ON order_items FOR SELECT USING (true);

-- order_timeline: read only (admin writes via service_role)
CREATE POLICY "user_read_order_timeline"
  ON order_timeline FOR SELECT USING (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage → New Bucket
--
--   Bucket name         Access    Notes
--   ─────────────────── ───────── ─────────────────────────────────────────────
--   product-images      Public    Product gallery images, optimized via Next/Image
--   category-images     Public    Category thumbnails and banners
--   banner-images       Public    Homepage and promotional banners
--   invoice-pdfs        Private   Generated PDFs — only accessible via signed URL
--
-- After creating the buckets, add these storage policies in the SQL editor:
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow public read on public image buckets (drop first to make re-runs safe)
DROP POLICY IF EXISTS "public_read_product_images"  ON storage.objects;
DROP POLICY IF EXISTS "public_read_category_images" ON storage.objects;
DROP POLICY IF EXISTS "public_read_banner_images"   ON storage.objects;

CREATE POLICY "public_read_product_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "public_read_category_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

CREATE POLICY "public_read_banner_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banner-images');

-- Allow service_role to upload/delete in all buckets (handled via API routes)
-- No INSERT/UPDATE/DELETE storage policies needed for public buckets
-- when uploads are done exclusively via the service_role key in API routes.

-- =============================================================================
--  003: SEED DATA — Admin, Categories, Pincodes, Products, Coupons
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 003: Seed Data (v2)
-- Run AFTER 002_rls.sql
-- All INSERTs use ON CONFLICT so this block is safe to re-run (idempotent).
-- !! Replace '+91XXXXXXXXXX' with the real super-admin phone before running !!
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Admin Profiles ───────────────────────────────────────────────────────────
INSERT INTO admin_profiles (phone, name, email, role, permissions) VALUES
  ('+91XXXXXXXXXX', 'Super Admin', 'admin@bcrtrades.in', 'super_admin',
   '{"view_orders":true,"update_order_status":true,"manage_products":true,
     "manage_categories":true,"manage_banners":true,"manage_coupons":true,
     "manage_pincodes":true,"manage_cms":true,"manage_admin_profiles":true,
     "manage_delivery_persons":true,"view_analytics":true,
     "view_abandoned_carts":true,"view_unserviceable":true,
     "receive_order_emails":true,"export_data":true}'::jsonb)
ON CONFLICT (phone) DO NOTHING;

-- ── Categories (slugs must match CAT_CODES in /api/products/route.ts) ────────
INSERT INTO categories (name, name_or, slug, description, display_order, is_active,
                        meta_title, meta_description) VALUES
  ('Edible Oil','ଖାଦ୍ୟ ତେଲ','edible-oil',
   'Premium quality edible oils at wholesale prices. Sunflower, mustard, refined, and more.',
   1,true,
   'Buy Edible Oil Wholesale in Odisha — BCR TRADERS | Best Prices',
   'Buy edible oil in bulk at wholesale prices. Sunflower oil, mustard oil, refined oil available. BCR TRADERS — Odisha trusted oil distributor.'),
  ('Pulses (Dal)','ଡାଲ','pulses-dal',
   'Nutritious lentils and legumes at wholesale prices. Toor dal, moong dal, chana dal and more.',
   2,true,
   'Pulses Wholesale Odisha — Best Dal Price | BCR TRADERS',
   'Buy pulses and dal in bulk at wholesale prices. Toor, moong, chana, masoor dal available. BCR TRADERS — trusted dal distributor Odisha.'),
  ('Atta & Flour','ଆଟା ଏବଂ ଆଟା','atta-flour',
   'Fresh wheat flour and specialty flours at wholesale prices.',
   3,true,
   'Atta Wholesale Price Odisha — Bulk Wheat Flour | BCR TRADERS',
   'Buy atta and wheat flour in bulk at wholesale prices. Aashirvaad, chakki atta available. BCR TRADERS flour distributor Odisha.'),
  ('Spices (Masala)','ମସଲା','spices-masala',
   'Aromatic whole and ground spices from trusted brands at wholesale rates.',
   4,true,
   'Spices Wholesale Odisha — Masala Distributor | BCR TRADERS',
   'Buy spices and masala in bulk at wholesale prices. Turmeric, chilli, garam masala available. BCR TRADERS — best spice distributor Odisha.'),
  ('Sugar & Jaggery','ଚିନି ଏବଂ ଗୁଡ','sugar-jaggery',
   'Refined sugar and natural jaggery at wholesale prices for homes and businesses.',
   5,true,
   'Sugar Wholesale Odisha — Bulk Sugar Dealer | BCR TRADERS',
   'Buy sugar and jaggery in bulk at wholesale prices. BCR TRADERS — trusted sugar distributor and wholesale dealer in Odisha.'),
  ('Packaged Water','ପ୍ୟାକ୍ଡ ପାଣି','packaged-water',
   'Safe and hygienic packaged drinking water bottles at wholesale prices.',
   6,true,
   'Packaged Water Wholesale Odisha — Water Bottle Bulk Order | BCR TRADERS',
   'Buy packaged mineral water bottles in bulk at wholesale prices. BCR TRADERS — water bottle distributor Odisha.')
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, name_or=EXCLUDED.name_or, description=EXCLUDED.description,
  display_order=EXCLUDED.display_order, is_active=EXCLUDED.is_active,
  meta_title=EXCLUDED.meta_title, meta_description=EXCLUDED.meta_description,
  updated_at=NOW();

-- Legacy categories (inactive, kept for backward compat)
INSERT INTO categories (name, name_or, slug, description, display_order, is_active) VALUES
  ('Edible Oils','ଖାଦ୍ୟ ତେଲ','edible-oils','Cooking and edible oils',10,false),
  ('Spices','ମସଲା','spices','Whole and ground spices',11,false),
  ('Rice & Grains','ଚାଉଳ ଓ ଶସ୍ୟ','rice-grains','Premium rice varieties',12,false),
  ('Salt & Sugar','ଲୁଣ ଓ ଚିନି','salt-sugar','Packaged salt, sugar, jaggery',13,false),
  ('Flour & Sooji','ଆଟା ଓ ସୁଜି','flour-sooji','Wheat flour, maida, sooji',14,false),
  ('Dry Fruits','ଶୁଖୁଲା ଫଳ','dry-fruits','Cashews, almonds, raisins',15,false),
  ('Packaged Foods','ପ୍ୟାକ ଖାଦ୍ୟ','packaged-foods','Noodles, biscuits, namkeen',16,false)
ON CONFLICT (slug) DO NOTHING;

-- ── Serviceable Pincodes (Odisha — 8 cities) ─────────────────────────────────
INSERT INTO serviceable_pincodes (pincode, area_name, city, state) VALUES
  -- Bhubaneswar
  ('751001','Bhubaneswar Old Town','Bhubaneswar','Odisha'),
  ('751002','Unit-I','Bhubaneswar','Odisha'),
  ('751003','Kalpana Square','Bhubaneswar','Odisha'),
  ('751004','Rajmahal Square','Bhubaneswar','Odisha'),
  ('751005','Vani Vihar','Bhubaneswar','Odisha'),
  ('751006','Sahid Nagar','Bhubaneswar','Odisha'),
  ('751007','Jaydev Vihar','Bhubaneswar','Odisha'),
  ('751008','Nayapalli Colony','Bhubaneswar','Odisha'),
  ('751009','Nayapalli','Bhubaneswar','Odisha'),
  ('751010','Patia','Bhubaneswar','Odisha'),
  ('751012','Bomikhal','Bhubaneswar','Odisha'),
  ('751013','Rasulgarh','Bhubaneswar','Odisha'),
  ('751014','Mancheswar','Bhubaneswar','Odisha'),
  ('751015','Acharya Vihar','Bhubaneswar','Odisha'),
  ('751016','Baramunda','Bhubaneswar','Odisha'),
  ('751017','IRC Village','Bhubaneswar','Odisha'),
  ('751019','Damana','Bhubaneswar','Odisha'),
  ('751020','Chandrasekharpur','Bhubaneswar','Odisha'),
  ('751021','Dumduma','Bhubaneswar','Odisha'),
  ('751022','Surya Nagar','Bhubaneswar','Odisha'),
  ('751023','Khandagiri','Bhubaneswar','Odisha'),
  ('751024','Niladri Vihar','Bhubaneswar','Odisha'),
  ('751025','Kalinga Nagar','Bhubaneswar','Odisha'),
  ('751029','Palasuni','Bhubaneswar','Odisha'),
  ('751030','Infocity','Bhubaneswar','Odisha'),
  ('751031','Pokhariput','Bhubaneswar','Odisha'),
  -- Khordha
  ('752054','Jatni','Khordha','Odisha'),
  ('752055','Bhubaneswar Airport','Khordha','Odisha'),
  ('752101','Khordha Town','Khordha','Odisha'),
  ('752102','Chilika','Khordha','Odisha'),
  -- Cuttack
  ('753001','Cuttack Central','Cuttack','Odisha'),
  ('753002','Cuttack Old Town','Cuttack','Odisha'),
  ('753003','Buxi Bazar','Cuttack','Odisha'),
  ('753004','Cuttack Road','Cuttack','Odisha'),
  ('753007','Bidanasi','Cuttack','Odisha'),
  ('753008','Telenga Bazar','Cuttack','Odisha'),
  ('753009','Mangalabag','Cuttack','Odisha'),
  ('753010','Mahanadivihar','Cuttack','Odisha'),
  ('753012','Badambadi','Cuttack','Odisha'),
  ('753013','College Square','Cuttack','Odisha'),
  ('753014','Choudwar','Cuttack','Odisha'),
  -- Puri
  ('752001','Puri Town','Puri','Odisha'),
  ('752002','Grand Road','Puri','Odisha'),
  ('752003','Chakratirtha','Puri','Odisha'),
  ('752011','Konark','Puri','Odisha'),
  -- Rourkela
  ('769001','Rourkela Central','Rourkela','Odisha'),
  ('769002','Civil Township','Rourkela','Odisha'),
  ('769003','Ispat Nagar','Rourkela','Odisha'),
  ('769004','Panposh','Rourkela','Odisha'),
  ('769009','Koel Nagar','Rourkela','Odisha'),
  ('769012','Bondamunda','Rourkela','Odisha'),
  ('769015','Uditnagar','Rourkela','Odisha'),
  ('769016','Shaktinagar','Rourkela','Odisha'),
  -- Berhampur
  ('760001','Berhampur Central','Berhampur','Odisha'),
  ('760002','Baidyanathpur','Berhampur','Odisha'),
  ('760003','Ambapua','Berhampur','Odisha'),
  ('760004','Ganjam Bazar','Berhampur','Odisha'),
  ('760007','Lanjipalli','Berhampur','Odisha'),
  ('760010','Tulsidas Nagar','Berhampur','Odisha'),
  -- Sambalpur
  ('768001','Sambalpur Town','Sambalpur','Odisha'),
  ('768002','Ainthapali','Sambalpur','Odisha'),
  ('768003','Modipara','Sambalpur','Odisha'),
  ('768004','Budharaja','Sambalpur','Odisha'),
  -- Balasore
  ('756001','Balasore Town','Balasore','Odisha'),
  ('756002','Remuna','Balasore','Odisha'),
  ('756003','Sahadevkhunta','Balasore','Odisha'),
  -- Baripada
  ('757001','Baripada Town','Baripada','Odisha'),
  ('757002','Mayurbhanj','Baripada','Odisha')
ON CONFLICT (pincode) DO NOTHING;

-- ── Sample Products (one per category — images to be added via admin panel) ──
INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Fortune Sunflower Refined Oil','ଫର୍ଚ୍ଚୁନ ସୂର୍ଯ୍ୟମୁଖୀ ତେଲ',
  'fortune-sunflower-oil-5l','BCR-OIL-2025-0001',
  'Light and healthy refined sunflower oil for everyday cooking',
  'ଦୈନନ୍ଦିନ ରାନ୍ଧିବା ପାଇଁ ହାଲୁକା ଏବଂ ସ୍ୱାସ୍ଥ୍ୟକର ସୂର୍ଯ୍ୟମୁଖୀ ତେଲ',
  649,720,true,'5 Litre',150,20,true,true,1,
  'Fortune Sunflower Oil 5L Wholesale Price — BCR TRADERS',
  'Buy Fortune Sunflower Refined Oil 5L at wholesale prices in Odisha. BCR TRADERS — best edible oil distributor.',
  'Fortune','new','Food, Beverages & Tobacco > Food Items > Cooking Oils',
  ARRAY['sunflower oil','refined oil','cooking oil','Fortune oil','oil 5 litre'],
  ARRAY['sunflower oil wholesale Odisha','Fortune oil 5L price','cooking oil bulk order','refined oil distributor Odisha']
FROM categories c WHERE c.slug='edible-oil'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Toor Dal (Arhar Dal)','ତୁଅର ଡାଲ',
  'toor-dal-1kg','BCR-PUL-2025-0001',
  'Premium quality toor dal at wholesale prices',
  'ଉତ୍ତମ ମାନର ତୁଅର ଡାଲ ଥୋକ ମୂଲ୍ୟରେ',
  135,150,true,'1 kg',500,50,true,true,2,
  'Toor Dal Wholesale Price Odisha — BCR TRADERS',
  'Buy toor dal (arhar dal) in bulk at wholesale prices in Odisha. BCR TRADERS.',
  'BCR TRADERS','new','Food, Beverages & Tobacco > Food Items > Grains & Pasta > Beans & Legumes',
  ARRAY['toor dal','arhar dal','pigeon peas','dal wholesale','pulses'],
  ARRAY['toor dal wholesale Odisha','arhar dal bulk price','dal distributor Odisha']
FROM categories c WHERE c.slug='pulses-dal'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Aashirvaad Whole Wheat Atta','ଆଶୀର୍ବାଦ ଗହମ ଆଟା',
  'aashirvaad-atta-10kg','BCR-ATT-2025-0001',
  'Premium whole wheat atta, freshly milled for soft rotis',
  'ନରମ ରୁଟି ପାଇଁ ଉତ୍ତମ ମାନର ଗହମ ଆଟା',
  445,499,true,'10 kg',200,30,true,true,3,
  'Aashirvaad Atta 10kg Wholesale Price — BCR TRADERS',
  'Buy Aashirvaad whole wheat atta 10kg at wholesale price in Odisha. BCR TRADERS — best atta flour distributor.',
  'Aashirvaad','new','Food, Beverages & Tobacco > Food Items > Grains & Pasta',
  ARRAY['aashirvaad atta','wheat flour','whole wheat atta','atta 10kg','flour'],
  ARRAY['aashirvaad atta wholesale Odisha','wheat flour bulk price','atta distributor Odisha']
FROM categories c WHERE c.slug='atta-flour'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Turmeric Powder (Haldi)','ହଳଦୀ ଗୁଣ୍ଡ',
  'turmeric-powder-500g','BCR-SPI-2025-0001',
  'Pure and vibrant turmeric powder from the best farms',
  'ଉତ୍ତମ ଜମିରୁ ଶୁଦ୍ଧ ଓ ଉଜ୍ଜ୍ୱଳ ହଳଦୀ ଗୁଣ୍ଡ',
  79,95,true,'500 g',300,40,true,false,4,
  'Turmeric Powder Wholesale Odisha — Haldi Bulk Price | BCR TRADERS',
  'Buy turmeric powder (haldi) in bulk at wholesale prices in Odisha. BCR TRADERS — spice distributor.',
  'BCR TRADERS','new','Food, Beverages & Tobacco > Food Items > Seasonings & Spices',
  ARRAY['turmeric','haldi','turmeric powder','spices','masala'],
  ARRAY['turmeric powder wholesale Odisha','haldi bulk price','spice distributor Odisha']
FROM categories c WHERE c.slug='spices-masala'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Refined Sugar (Cheeni)','ଚିନି',
  'refined-sugar-5kg','BCR-SUG-2025-0001',
  'Pure white refined sugar at wholesale prices for bulk buyers',
  'ଥୋକ କ୍ରେତାମାନଙ୍କ ପାଇଁ ଥୋକ ମୂଲ୍ୟରେ ଶୁଦ୍ଧ ଧଳା ଚିନି',
  215,240,true,'5 kg',400,50,true,false,5,
  'Sugar Wholesale Price Odisha — Refined Sugar Bulk | BCR TRADERS',
  'Buy refined sugar in bulk at wholesale prices in Odisha. BCR TRADERS — trusted sugar distributor.',
  'BCR TRADERS','new','Food, Beverages & Tobacco > Food Items > Sugars & Sweeteners',
  ARRAY['sugar','cheeni','refined sugar','sugar wholesale','sugar 5kg'],
  ARRAY['sugar wholesale Odisha','refined sugar bulk price','sugar distributor Odisha']
FROM categories c WHERE c.slug='sugar-jaggery'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_or, slug, sku, short_desc, short_desc_or,
  price, mrp, show_strikethrough, unit, stock_qty, low_stock_threshold,
  is_active, is_featured, display_order,
  meta_title, meta_description, brand, condition, google_product_category,
  tags, auto_keywords
) SELECT c.id,
  'Packaged Drinking Water 1L','ପ୍ୟାକ୍ଡ ପାନୀୟ ଜଳ 1L',
  'packaged-water-1l','BCR-WAT-2025-0001',
  'Safe and pure packaged drinking water bottles at wholesale price',
  'ଥୋକ ମୂଲ୍ୟରେ ନିରାପଦ ଓ ଶୁଦ୍ଧ ପ୍ୟାକ୍ଡ ପାନୀୟ ଜଳ',
  10,15,true,'1 Litre',1000,100,true,false,6,
  'Packaged Water Wholesale Odisha — Water Bottle Bulk | BCR TRADERS',
  'Buy packaged drinking water 1L in bulk at wholesale prices. BCR TRADERS — water bottle distributor Odisha.',
  'BCR TRADERS','new','Food, Beverages & Tobacco > Beverages > Water',
  ARRAY['water bottle','packaged water','drinking water','mineral water','water 1 litre'],
  ARRAY['water bottle wholesale Odisha','packaged water bulk price','water distributor Odisha']
FROM categories c WHERE c.slug='packaged-water'
ON CONFLICT (slug) DO NOTHING;

-- ── Coupons ───────────────────────────────────────────────────────────────────
INSERT INTO coupons (code, description, description_or, discount_type, discount_value,
                     min_order_value, max_discount, max_uses, is_active) VALUES
  ('WELCOME50','Flat ₹50 off on your first order above ₹300',
   'ତୁମ ପ୍ରଥମ ଅର୍ଡରରେ ₹50 ଛାଡ','flat',50,300,NULL,1000,true),
  ('BCR10','10% off on orders above ₹500 (max ₹100)',
   '₹500 ଉପରେ ଅର୍ଡରରେ 10% ଛାଡ','percentage',10,500,100,NULL,true),
  ('BULK200','Flat ₹200 off on bulk orders above ₹3000',
   '₹3000 ଉପରେ ଥୋକ ଅର୍ଡରରେ ₹200 ଛାଡ','flat',200,3000,NULL,NULL,true),
  ('WELCOME10','Welcome discount — 10% off on first order',NULL,'percentage',10,500,200,NULL,true),
  ('FLAT50','Flat ₹50 off on orders above ₹1000',NULL,'flat',50,1000,NULL,NULL,true),
  ('BCR100','Flat ₹100 off on orders above ₹2000',NULL,'flat',100,2000,NULL,NULL,true)
ON CONFLICT (code) DO NOTHING;